import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { getGoogleAccessToken, refreshGoogleAccessToken } from './Auth'
import { getAllPDFs } from '../utils/pdfStorage'
import './PdfCropper.css'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

// ─────────────────────────────────────────
// Props:
//   userId        : string
//   attachedPdf   : { firestoreId, driveFileId, fileName } | null
//   onCropComplete: (imageUrl: string) => void
//   onClose       : () => void
// ─────────────────────────────────────────

export default function PdfCropper({ userId, attachedPdf, onCropComplete, onClose, headerSlot }) {
  // アクティブタブ: 'attached' | 'list' | 'url'
  const defaultTab = attachedPdf ? 'attached' : 'list'
  const [activeTab, setActiveTab] = useState(defaultTab)

  // PDF読み込み
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedPdfName, setLoadedPdfName] = useState('')
  const [error, setError] = useState('')

  // タブ2: 登録済みリスト
  const [pdfList, setPdfList] = useState([])
  const [pdfListLoading, setPdfListLoading] = useState(false)
  const [listSearchQuery, setListSearchQuery] = useState('')

  // タブ3: URL入力
  const [urlInput, setUrlInput] = useState('')

  // 選択・切り出し
  const [selectMode, setSelectMode] = useState(false) // false=パン/スクロール, true=切り出し選択
  const [selection, setSelection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [croppedPreview, setCroppedPreview] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const renderTaskRef = useRef(null)
  // タッチハンドラから最新値を参照するためのrefs
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef(null)

  // ─── タブ2のリスト読み込み ───
  useEffect(() => {
    if (activeTab !== 'list' || pdfList.length > 0) return
    setPdfListLoading(true)
    getAllPDFs(userId).then(result => {
      if (result.success) setPdfList(result.data)
      setPdfListLoading(false)
    })
  }, [activeTab, userId])

  // ─── タブ1: attachedPdf が指定されたら自動読み込み ───
  useEffect(() => {
    if (activeTab === 'attached' && attachedPdf?.driveFileId && !pdfDoc) {
      loadPdfFromDriveId(attachedPdf.driveFileId, attachedPdf.fileName)
    }
  }, [activeTab])

  // ─────────────────────────────────────────
  // PDF読み込みコア
  // ─────────────────────────────────────────

  const loadPdfFromDriveId = async (driveFileId, fileName = '') => {
    setIsLoading(true)
    setError('')
    setPdfDoc(null)
    setSelection(null)
    setCroppedPreview(null)
    setCroppedBlob(null)

    try {
      let token = getGoogleAccessToken()
      if (!token) token = await refreshGoogleAccessToken()
      if (!token) throw new Error('Googleアカウントに再ログインしてください')

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) throw new Error(`PDFの読み込みに失敗しました (${response.status})`)

      const arrayBuffer = await response.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
      setLoadedPdfName(fileName)
    } catch (e) {
      setError(e.message || 'PDFの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPdfFromUrl = async () => {
    const fileId = extractDriveFileId(urlInput)
    if (!fileId) {
      setError('Google DriveのURLを入力してください（例: https://drive.google.com/file/d/.../view）')
      return
    }
    await loadPdfFromDriveId(fileId, urlInput)
  }

  // ─────────────────────────────────────────
  // Canvas レンダリング
  // ─────────────────────────────────────────

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current
    if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height)
  }, [])

  const renderPage = useCallback(async (doc, pageNum, sc) => {
    if (!doc || !canvasRef.current) return
    if (renderTaskRef.current) renderTaskRef.current.cancel()

    const page = await doc.getPage(pageNum)
    const viewport = page.getViewport({ scale: sc })

    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height

    const overlay = overlayRef.current
    if (overlay) { overlay.width = viewport.width; overlay.height = viewport.height }

    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch (e) {
      if (e.name !== 'RenderingCancelledException') console.error(e)
    }
    setSelection(null)
    setCroppedPreview(null)
    setCroppedBlob(null)
    clearOverlay()
  }, [clearOverlay])

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, currentPage, scale)
  }, [pdfDoc, currentPage, scale, renderPage])

  // ─────────────────────────────────────────
  // ドラッグ選択
  // ─────────────────────────────────────────

  function drawSelectionRect(sel) {
    const overlay = overlayRef.current
    if (!overlay || !sel) return
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, overlay.width, overlay.height)
    ctx.clearRect(sel.x, sel.y, sel.w, sel.h)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)
  }

  function getCanvasPos(e) {
    const overlay = overlayRef.current
    const rect = overlay.getBoundingClientRect()
    // タッチイベントとマウスイベント両対応
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (overlay.width / rect.width),
      y: (clientY - rect.top) * (overlay.height / rect.height),
    }
  }

  function normRect(a, b) {
    return {
      x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y),
    }
  }

  const startDrag = (pos) => {
    isDraggingRef.current = true
    dragStartRef.current = pos
    setIsDragging(true)
    setDragStart(pos)
    setSelection(null)
    setCroppedPreview(null)
    setCroppedBlob(null)
    clearOverlay()
  }

  const endDrag = (pos) => {
    if (!isDraggingRef.current || !dragStartRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    const sel = normRect(dragStartRef.current, pos)
    dragStartRef.current = null
    setDragStart(null)
    if (sel.w < 10 || sel.h < 10) { clearOverlay(); return }
    setSelection(sel)
    drawSelectionRect(sel)
    cropToPreview(sel)
  }

  const handleMouseDown = (e) => {
    startDrag(getCanvasPos(e))
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !dragStartRef.current) return
    drawSelectionRect(normRect(dragStartRef.current, getCanvasPos(e)))
  }

  const handleMouseUp = (e) => {
    endDrag(getCanvasPos(e))
  }

  // ── タッチイベント用ネイティブリスナー（passive:false でスクロール防止） ──
  // React合成イベントはpassiveがデフォルトでpreventDefaultが効かないため
  // selectModeのときのみリスナーを登録し、パンモード時はpointer-events:noneで透過させる
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay || !selectMode) return

    const onTouchStart = (e) => {
      // 選択モード中は即座にドラッグ開始、スクロール防止
      e.preventDefault()
      startDrag(getCanvasPos(e))
    }

    const onTouchMove = (e) => {
      // ドラッグ中のみスクロール防止（選択範囲を描画）
      if (isDraggingRef.current) {
        e.preventDefault()
        if (dragStartRef.current) {
          drawSelectionRect(normRect(dragStartRef.current, getCanvasPos(e)))
        }
      }
    }

    const onTouchEnd = (e) => {
      const rect = overlay.getBoundingClientRect()
      const touch = e.changedTouches[0]
      const pos = {
        x: (touch.clientX - rect.left) * (overlay.width / rect.width),
        y: (touch.clientY - rect.top) * (overlay.height / rect.height),
      }
      endDrag(pos)
    }

    overlay.addEventListener('touchstart', onTouchStart, { passive: false })
    overlay.addEventListener('touchmove', onTouchMove, { passive: false })
    overlay.addEventListener('touchend', onTouchEnd)

    return () => {
      overlay.removeEventListener('touchstart', onTouchStart)
      overlay.removeEventListener('touchmove', onTouchMove)
      overlay.removeEventListener('touchend', onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale, selectMode])

  function cropToPreview(sel) {
    const src = canvasRef.current
    if (!src) return
    const tmp = document.createElement('canvas')
    tmp.width = sel.w; tmp.height = sel.h
    tmp.getContext('2d').drawImage(src, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h)
    setCroppedPreview(tmp.toDataURL('image/png'))
    tmp.toBlob(blob => setCroppedBlob(blob), 'image/png')
  }

  // ─────────────────────────────────────────
  // 確定・保存
  // ─────────────────────────────────────────

  const handleConfirmCrop = async () => {
    if (!croppedBlob) return
    setIsUploading(true)
    try {
      const storageRef = ref(storage, `problemImages/${userId}/${Date.now()}.png`)
      await uploadBytes(storageRef, croppedBlob)
      const url = await getDownloadURL(storageRef)
      onCropComplete(url)
    } catch (e) {
      setError('画像の保存に失敗しました: ' + e.message)
    } finally {
      setIsUploading(false)
    }
  }

  // ─────────────────────────────────────────
  // フィルタ
  // ─────────────────────────────────────────

  const filteredPdfList = pdfList.filter(p =>
    !listSearchQuery ||
    p.fileName?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    p.subject?.includes(listSearchQuery) ||
    String(p.year)?.includes(listSearchQuery)
  )

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return (
    <div className="pdfcropper-overlay" onClick={onClose}>
      <div className="pdfcropper-modal" onClick={e => e.stopPropagation()}>

        {/* 呼び出し元から注入されるヘッダースロット（科目タブなど） */}
        {headerSlot}

        {/* ヘッダー */}
        <div className="pdfcropper-header">
          <h3 className="pdfcropper-title">PDFから問題を切り出す</h3>
          <button className="pdfcropper-close" onClick={onClose}>✕</button>
        </div>

        {/* タブ */}
        <div className="pdfcropper-tabs">
          {attachedPdf && (
            <button
              className={`pdfcropper-tab ${activeTab === 'attached' ? 'active' : ''}`}
              onClick={() => setActiveTab('attached')}
            >
              📎 紐付けPDF
            </button>
          )}
          <button
            className={`pdfcropper-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📂 登録済みから選択
          </button>
          <button
            className={`pdfcropper-tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            🔗 URLを入力
          </button>
        </div>

        {/* ─── タブ1: 紐付けPDF ─── */}
        {activeTab === 'attached' && attachedPdf && !pdfDoc && !isLoading && (
          <div className="pdfcropper-attached-info">
            <span className="pdfcropper-attached-name">{attachedPdf.fileName}</span>
            <button className="pdfcropper-load-btn" onClick={() => loadPdfFromDriveId(attachedPdf.driveFileId, attachedPdf.fileName)}>
              読込
            </button>
          </div>
        )}

        {/* ─── タブ2: 登録済みリスト ─── */}
        {activeTab === 'list' && !pdfDoc && (
          <div className="pdfcropper-list-area">
            <input
              className="pdfcropper-list-search"
              type="text"
              placeholder="ファイル名・科目・年度で絞り込み"
              value={listSearchQuery}
              onChange={e => setListSearchQuery(e.target.value)}
            />
            {pdfListLoading ? (
              <div className="pdfcropper-loading">読み込み中...</div>
            ) : filteredPdfList.length === 0 ? (
              <div className="pdfcropper-empty">
                {pdfList.length === 0
                  ? '登録済みのPDFがありません。「PDF問題集」タブからアップロードしてください。'
                  : '該当するPDFが見つかりません'}
              </div>
            ) : (
              <ul className="pdfcropper-pdf-list">
                {filteredPdfList.map(pdf => (
                  <li key={pdf.firestoreId} className="pdfcropper-pdf-item">
                    <div className="pdfcropper-pdf-info">
                      <span className="pdfcropper-pdf-name">{pdf.fileName}</span>
                      <div className="pdfcropper-pdf-meta">
                        {pdf.type && <span className="pdfcropper-pdf-tag">{PDF_TYPE_LABELS[pdf.type] || pdf.type}</span>}
                        {pdf.subject && <span className="pdfcropper-pdf-tag">{pdf.subject}</span>}
                        {pdf.year && <span className="pdfcropper-pdf-tag">{pdf.year}年</span>}
                      </div>
                    </div>
                    <button
                      className="pdfcropper-load-btn"
                      onClick={() => loadPdfFromDriveId(pdf.driveFileId, pdf.fileName)}
                    >
                      選択
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ─── タブ3: URL入力 ─── */}
        {activeTab === 'url' && !pdfDoc && (
          <div className="pdfcropper-url-row">
            <input
              className="pdfcropper-url-input"
              type="text"
              placeholder="Google Drive URL を貼り付け（例: https://drive.google.com/file/d/.../view）"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPdfFromUrl()}
            />
            <button
              className="pdfcropper-load-btn"
              onClick={loadPdfFromUrl}
              disabled={isLoading}
            >
              {isLoading ? '読込中...' : '読込'}
            </button>
          </div>
        )}

        {error && <div className="pdfcropper-error">{error}</div>}

        {/* ─── PDF読み込み済み: ページビュー ─── */}
        {pdfDoc && (
          <>
            <div className="pdfcropper-loaded-bar">
              <span className="pdfcropper-loaded-name">{loadedPdfName}</span>
              <button
                className="pdfcropper-unload-btn"
                onClick={() => { setPdfDoc(null); setLoadedPdfName(''); setError('') }}
              >
                ← 選び直す
              </button>
            </div>

            <div className="pdfcropper-controls">
              <div className="pdfcropper-page-nav">
                <button
                  className="pdfcropper-page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >←</button>
                <span className="pdfcropper-page-info">{currentPage} / {totalPages}</span>
                <button
                  className="pdfcropper-page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >→</button>
              </div>
              <div className="pdfcropper-zoom">
                <button onClick={() => setScale(s => Math.max(0.5, Math.round((s - 0.25) * 100) / 100))}>−</button>
                <span>{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(3, Math.round((s + 0.25) * 100) / 100))}>＋</button>
              </div>
              {/* モード切り替えトグル */}
              <button
                className={`pdfcropper-mode-btn ${selectMode ? 'select' : 'pan'}`}
                onClick={() => {
                  setSelectMode(m => !m)
                  if (selectMode) { clearOverlay(); setSelection(null); setCroppedPreview(null); setCroppedBlob(null) }
                }}
                title={selectMode ? 'スクロール/パンモードに切り替え' : '切り出し範囲を選択するモードに切り替え'}
              >
                {selectMode ? '✋ スクロール' : '✂️ 切り出し'}
              </button>
              <span className="pdfcropper-hint">
                {selectMode ? 'ドラッグで範囲を選択' : 'スクロール・ズームが可能'}
              </span>
            </div>

            {/* 切り出しモード時のガイドバナー */}
            {selectMode && (
              <div className="pdfcropper-select-banner">
                ✂️ 切り出しモード — 問題の範囲をドラッグして選択してください
              </div>
            )}

            <div className="pdfcropper-canvas-wrapper">
              <canvas ref={canvasRef} className="pdfcropper-canvas" />
              <canvas
                ref={overlayRef}
                className={`pdfcropper-overlay-canvas ${selectMode ? 'select-active' : 'pan-mode'}`}
                onMouseDown={selectMode ? handleMouseDown : undefined}
                onMouseMove={selectMode ? handleMouseMove : undefined}
                onMouseUp={selectMode ? handleMouseUp : undefined}
                onMouseLeave={selectMode ? handleMouseUp : undefined}
              />
            </div>

            {croppedPreview && (
              <div className="pdfcropper-preview-area">
                <div className="pdfcropper-preview-label">選択範囲のプレビュー</div>
                <div className="pdfcropper-preview-scroll">
                  <img src={croppedPreview} alt="crop preview" className="pdfcropper-preview-img" />
                </div>
                <div className="pdfcropper-preview-actions">
                  <button
                    className="pdfcropper-reselect-btn"
                    onClick={() => { setCroppedPreview(null); setCroppedBlob(null); clearOverlay(); setSelection(null) }}
                  >
                    選び直す
                  </button>
                  <button
                    className="pdfcropper-confirm-btn"
                    onClick={handleConfirmCrop}
                    disabled={isUploading}
                  >
                    {isUploading ? '保存中...' : 'この範囲で確定'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!pdfDoc && !isLoading && !error && activeTab !== 'list' && (
          <div className="pdfcropper-empty">
            PDFを選択または読み込むと、ここに表示されます
          </div>
        )}

        {isLoading && (
          <div className="pdfcropper-loading">PDFを読み込んでいます...</div>
        )}
      </div>
    </div>
  )
}

function extractDriveFileId(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/?\s]+)/)
  return match ? match[1] : null
}

const PDF_TYPE_LABELS = {
  testPaper: 'テスト用紙',
  textbook: '教材',
  pastPaper: '過去問',
  workbook: '問題集',
}
