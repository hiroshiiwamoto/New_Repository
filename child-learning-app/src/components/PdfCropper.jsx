import { useReducer, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { getGoogleAccessToken, refreshGoogleAccessToken } from './Auth'
import { getAllPDFs } from '../utils/pdfStorage'
import Loading from './Loading'
import './PdfCropper.css'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

// ─────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────

const initialState = {
  activeTab: null,
  pdfDoc: null, currentPage: 1, totalPages: 0, scale: 1.5,
  isLoading: false, loadedPdfName: '', error: '',
  pdfList: [], pdfListLoading: false, listSearchQuery: '',
  urlInput: '',
  selection: null, isDragging: false, dragStart: null,
  croppedPreview: null, croppedBlob: null,
  isUploading: false,
  isPanning: false, panStart: null, lastTapTime: 0,
  addedCount: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value }
    case 'SET_FIELDS': return { ...state, ...action.fields }
    case 'RESET_CROP': return { ...state, selection: null, croppedPreview: null, croppedBlob: null }
    default: return state
  }
}

// ─────────────────────────────────────────
// Props:
//   userId        : string
//   attachedPdf   : { id, driveFileId, fileName } | null
//   onCropComplete: (imageUrl: string) => void
//   onClose       : () => void
// ─────────────────────────────────────────

export default function PdfCropper({ userId, attachedPdf, onCropComplete, onClose, headerSlot }) {
  // アクティブタブ: 'attached' | 'list' | 'url'
  const defaultTab = attachedPdf ? 'attached' : 'list'
  const [state, dispatch] = useReducer(reducer, { ...initialState, activeTab: defaultTab })

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const renderTaskRef = useRef(null)
  const canvasWrapperRef = useRef(null)
  const modalRef = useRef(null)
  // タッチハンドラから最新値を参照するためのrefs
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef(null)
  const initialPinchDistance = useRef(null)
  // リサイズ用refs
  const isResizingRef = useRef(false)
  const resizeStartRef = useRef(null)

  // ─── タブ2のリスト読み込み ───
  useEffect(() => {
    if (state.activeTab !== 'list' || state.pdfList.length > 0) return
    dispatch({ type: 'SET_FIELD', field: 'pdfListLoading', value: true })
    getAllPDFs(userId).then(result => {
      if (result.success) dispatch({ type: 'SET_FIELD', field: 'pdfList', value: result.data })
      dispatch({ type: 'SET_FIELD', field: 'pdfListLoading', value: false })
    })
  }, [state.activeTab, userId])

  // ─── タブ1: attachedPdf が指定されたら自動読み込み ───
  useEffect(() => {
    if (state.activeTab === 'attached' && attachedPdf?.driveFileId && !state.pdfDoc) {
      loadPdfFromDriveId(attachedPdf.driveFileId, attachedPdf.fileName)
    }
  }, [state.activeTab])

  // ─────────────────────────────────────────
  // PDF読み込みコア
  // ─────────────────────────────────────────

  const loadPdfFromDriveId = async (driveFileId, fileName = '') => {
    dispatch({ type: 'SET_FIELDS', fields: {
      isLoading: true, error: '', pdfDoc: null,
      selection: null, croppedPreview: null, croppedBlob: null,
    }})

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
      dispatch({ type: 'SET_FIELDS', fields: {
        pdfDoc: doc, totalPages: doc.numPages, currentPage: 1, loadedPdfName: fileName,
      }})
    } catch (e) {
      dispatch({ type: 'SET_FIELD', field: 'error', value: e.message || 'PDFの読み込みに失敗しました' })
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isLoading', value: false })
    }
  }

  const loadPdfFromUrl = async () => {
    const fileId = extractDriveFileId(state.urlInput)
    if (!fileId) {
      dispatch({ type: 'SET_FIELD', field: 'error', value: 'Google DriveのURLを入力してください（例: https://drive.google.com/file/d/.../view）' })
      return
    }
    await loadPdfFromDriveId(fileId, state.urlInput)
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
    dispatch({ type: 'RESET_CROP' })
    clearOverlay()
  }, [clearOverlay])

  useEffect(() => {
    if (state.pdfDoc) renderPage(state.pdfDoc, state.currentPage, state.scale)
  }, [state.pdfDoc, state.currentPage, state.scale, renderPage])

  // ─────────────────────────────────────────
  // モーダルリサイズ
  // ─────────────────────────────────────────

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const modal = modalRef.current
    if (!modal) return
    isResizingRef.current = true
    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      w: modal.offsetWidth,
      h: modal.offsetHeight,
    }

    const onMove = (ev) => {
      if (!isResizingRef.current || !resizeStartRef.current) return
      ev.preventDefault()
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      const newW = Math.max(360, resizeStartRef.current.w + (cx - resizeStartRef.current.x))
      const newH = Math.max(300, resizeStartRef.current.h + (cy - resizeStartRef.current.y))
      modal.style.width = newW + 'px'
      modal.style.height = newH + 'px'
    }

    const onEnd = () => {
      isResizingRef.current = false
      resizeStartRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }, [])

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
    dispatch({ type: 'SET_FIELDS', fields: { isDragging: true, dragStart: pos } })
    dispatch({ type: 'RESET_CROP' })
    clearOverlay()
  }

  const endDrag = (pos) => {
    if (!isDraggingRef.current || !dragStartRef.current) return
    isDraggingRef.current = false
    dispatch({ type: 'SET_FIELD', field: 'isDragging', value: false })
    const sel = normRect(dragStartRef.current, pos)
    dragStartRef.current = null
    dispatch({ type: 'SET_FIELD', field: 'dragStart', value: null })
    if (sel.w < 10 || sel.h < 10) { clearOverlay(); return }
    dispatch({ type: 'SET_FIELD', field: 'selection', value: sel })
    drawSelectionRect(sel)
    cropToPreview(sel)
  }

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e)
    // 左クリック(0) → 切り出し、中ボタン(1) → パン
    if (e.button === 0) {
      startDrag(pos)
    } else if (e.button === 1) {
      e.preventDefault() // 中ボタンのデフォルト動作を抑制
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: canvasWrapperRef.current?.scrollLeft || 0,
        scrollTop: canvasWrapperRef.current?.scrollTop || 0,
      }
      dispatch({ type: 'SET_FIELD', field: 'isPanning', value: true })
    }
  }

  const handleMouseMove = (e) => {
    if (isDraggingRef.current && dragStartRef.current) {
      drawSelectionRect(normRect(dragStartRef.current, getCanvasPos(e)))
    } else if (isPanningRef.current && panStartRef.current && canvasWrapperRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      // マウスを右に動かすとdxが正 → scrollLeftを減らして左へスクロール
      canvasWrapperRef.current.scrollLeft = panStartRef.current.scrollLeft - dx
      canvasWrapperRef.current.scrollTop = panStartRef.current.scrollTop - dy
    }
  }

  const handleMouseUp = (e) => {
    if (e.button === 0 && isDraggingRef.current) {
      endDrag(getCanvasPos(e))
    } else if (e.button === 1 && isPanningRef.current) {
      isPanningRef.current = false
      panStartRef.current = null
      dispatch({ type: 'SET_FIELD', field: 'isPanning', value: false })
    }
  }

  const handleWheel = (e) => {
    // ホイール → ズーム
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    dispatch({ type: 'SET_FIELD', field: 'scale', value: Math.max(0.5, Math.min(3, Math.round((state.scale + delta) * 100) / 100)) })
  }

  // ── タッチイベント用ネイティブリスナー ──
  // 1本指=切り出し、2本指ドラッグ=パン、2本指ピンチ=ズーム
  useEffect(() => {
    const overlay = overlayRef.current
    const wrapper = canvasWrapperRef.current
    if (!overlay || !wrapper) return

    const onTouchStart = (e) => {
      const touches = e.touches

      // 2本指 → パン or ピンチズーム開始
      if (touches.length === 2) {
        e.preventDefault()
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy)

        // パン用の初期位置も記録
        const centerX = (touches[0].clientX + touches[1].clientX) / 2
        const centerY = (touches[0].clientY + touches[1].clientY) / 2
        panStartRef.current = {
          x: centerX,
          y: centerY,
          scrollLeft: wrapper.scrollLeft,
          scrollTop: wrapper.scrollTop,
        }
        isPanningRef.current = true
        return
      }

      // 1本指 → 切り出し開始
      if (touches.length === 1) {
        e.preventDefault()
        startDrag(getCanvasPos(e))
      }
    }

    const onTouchMove = (e) => {
      const touches = e.touches

      // 2本指移動中
      if (touches.length === 2) {
        e.preventDefault()
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)

        // ピンチ判定: 距離が変化している → ズーム
        if (initialPinchDistance.current && Math.abs(distance - initialPinchDistance.current) > 5) {
          const scaleChange = distance / initialPinchDistance.current
          dispatch({ type: 'SET_FIELD', field: 'scale', value: Math.max(0.5, Math.min(3, Math.round(state.scale * scaleChange * 100) / 100)) })
          initialPinchDistance.current = distance
        }

        // パン: 2本指の中心が移動している → スクロール
        if (panStartRef.current) {
          const centerX = (touches[0].clientX + touches[1].clientX) / 2
          const centerY = (touches[0].clientY + touches[1].clientY) / 2
          const deltaX = centerX - panStartRef.current.x
          const deltaY = centerY - panStartRef.current.y
          wrapper.scrollLeft = panStartRef.current.scrollLeft - deltaX
          wrapper.scrollTop = panStartRef.current.scrollTop - deltaY
        }
        return
      }

      // 1本指ドラッグ → 切り出し範囲選択
      if (isDraggingRef.current && dragStartRef.current && touches.length === 1) {
        e.preventDefault()
        drawSelectionRect(normRect(dragStartRef.current, getCanvasPos(e)))
      }
    }

    const onTouchEnd = (e) => {
      // 2本指が離れたらピンチ・パンモード終了
      if (e.touches.length < 2) {
        initialPinchDistance.current = null
        isPanningRef.current = false
        panStartRef.current = null
      }

      // 全ての指が離れた
      if (e.touches.length === 0) {
        // 切り出しドラッグ終了
        if (isDraggingRef.current) {
          const rect = overlay.getBoundingClientRect()
          const touch = e.changedTouches[0]
          const pos = {
            x: (touch.clientX - rect.left) * (overlay.width / rect.width),
            y: (touch.clientY - rect.top) * (overlay.height / rect.height),
          }
          endDrag(pos)
        }
      }
    }

    overlay.addEventListener('touchstart', onTouchStart, { passive: false })
    overlay.addEventListener('touchmove', onTouchMove, { passive: false })
    overlay.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      overlay.removeEventListener('touchstart', onTouchStart)
      overlay.removeEventListener('touchmove', onTouchMove)
      overlay.removeEventListener('touchend', onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pdfDoc, state.currentPage, state.scale])

  function cropToPreview(sel) {
    const src = canvasRef.current
    if (!src) return
    const tmp = document.createElement('canvas')
    tmp.width = sel.w; tmp.height = sel.h
    tmp.getContext('2d').drawImage(src, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h)
    dispatch({ type: 'SET_FIELD', field: 'croppedPreview', value: tmp.toDataURL('image/png') })
    tmp.toBlob(blob => dispatch({ type: 'SET_FIELD', field: 'croppedBlob', value: blob }), 'image/png')
  }

  // ─────────────────────────────────────────
  // 確定・保存
  // ─────────────────────────────────────────

  const handleConfirmCrop = async () => {
    if (!state.croppedBlob) return
    dispatch({ type: 'SET_FIELD', field: 'isUploading', value: true })
    try {
      const storageRef = ref(storage, `problemImages/${userId}/${Date.now()}.png`)
      await uploadBytes(storageRef, state.croppedBlob)
      const url = await getDownloadURL(storageRef)
      onCropComplete(url)
      // 閉じずに選択をリセットし、次の切り出しへ
      dispatch({ type: 'SET_FIELDS', fields: {
        selection: null, croppedPreview: null, croppedBlob: null,
        addedCount: state.addedCount + 1,
      }})
      clearOverlay()
    } catch (e) {
      dispatch({ type: 'SET_FIELD', field: 'error', value: '画像の保存に失敗しました: ' + e.message })
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'isUploading', value: false })
    }
  }

  // ─────────────────────────────────────────
  // フィルタ
  // ─────────────────────────────────────────

  const filteredPdfList = state.pdfList.filter(p =>
    !state.listSearchQuery ||
    p.fileName?.toLowerCase().includes(state.listSearchQuery.toLowerCase()) ||
    p.subject?.includes(state.listSearchQuery) ||
    String(p.year)?.includes(state.listSearchQuery)
  )

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return createPortal(
    <div className="pdfcropper-overlay">
      <div ref={modalRef} className="pdfcropper-modal">
        {/* リサイズハンドル */}
        <div
          className="pdfcropper-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        />

        {/* 呼び出し元から注入されるヘッダースロット（科目タブなど） */}
        {headerSlot}

        {/* ヘッダー */}
        <div className="pdfcropper-header">
          <h3 className="pdfcropper-title">
            PDFから問題を切り出す
            {state.addedCount > 0 && (
              <span className="pdfcropper-added-badge">{state.addedCount}枚追加済み</span>
            )}
          </h3>
          <button className="pdfcropper-done-btn" onClick={onClose}>
            {state.addedCount > 0 ? '完了' : '閉じる'}
          </button>
        </div>

        {/* タブ */}
        <div className="pdfcropper-tabs">
          {attachedPdf && (
            <button
              className={`pdfcropper-tab ${state.activeTab === 'attached' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeTab', value: 'attached' })}
            >
              📎 紐付けPDF
            </button>
          )}
          <button
            className={`pdfcropper-tab ${state.activeTab === 'list' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeTab', value: 'list' })}
          >
            📂 登録済みから選択
          </button>
          <button
            className={`pdfcropper-tab ${state.activeTab === 'url' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'activeTab', value: 'url' })}
          >
            🔗 URLを入力
          </button>
        </div>

        {/* ─── タブ1: 紐付けPDF ─── */}
        {state.activeTab === 'attached' && attachedPdf && !state.pdfDoc && !state.isLoading && (
          <div className="pdfcropper-attached-info">
            <span className="pdfcropper-attached-name">{attachedPdf.fileName}</span>
            <button className="pdfcropper-load-btn" onClick={() => loadPdfFromDriveId(attachedPdf.driveFileId, attachedPdf.fileName)}>
              読込
            </button>
          </div>
        )}

        {/* ─── タブ2: 登録済みリスト ─── */}
        {state.activeTab === 'list' && !state.pdfDoc && (
          <div className="pdfcropper-list-area">
            <input
              className="pdfcropper-list-search"
              type="text"
              placeholder="ファイル名・科目・年度で絞り込み"
              value={state.listSearchQuery}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'listSearchQuery', value: e.target.value })}
            />
            {state.pdfListLoading ? (
              <Loading message="読み込み中..." />
            ) : filteredPdfList.length === 0 ? (
              <div className="pdfcropper-empty">
                {state.pdfList.length === 0
                  ? '登録済みのPDFがありません。「PDF問題集」タブからアップロードしてください。'
                  : '該当するPDFが見つかりません'}
              </div>
            ) : (
              <ul className="pdfcropper-pdf-list">
                {filteredPdfList.map(pdf => (
                  <li key={pdf.id} className="pdfcropper-pdf-item">
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
        {state.activeTab === 'url' && !state.pdfDoc && (
          <div className="pdfcropper-url-row">
            <input
              className="pdfcropper-url-input"
              type="text"
              placeholder="Google Drive URL を貼り付け（例: https://drive.google.com/file/d/.../view）"
              value={state.urlInput}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'urlInput', value: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && loadPdfFromUrl()}
            />
            <button
              className="pdfcropper-load-btn"
              onClick={loadPdfFromUrl}
              disabled={state.isLoading}
            >
              {state.isLoading ? '読込中...' : '読込'}
            </button>
          </div>
        )}

        {state.error && <div className="pdfcropper-error">{state.error}</div>}

        {/* ─── PDF読み込み済み: ページビュー ─── */}
        {state.pdfDoc && (
          <>
            <div className="pdfcropper-loaded-bar">
              <span className="pdfcropper-loaded-name">{state.loadedPdfName}</span>
              <button
                className="pdfcropper-unload-btn"
                onClick={() => dispatch({ type: 'SET_FIELDS', fields: { pdfDoc: null, loadedPdfName: '', error: '' } })}
              >
                ← 選び直す
              </button>
            </div>

            <div className="pdfcropper-controls">
              <div className="pdfcropper-page-nav">
                <button
                  className="pdfcropper-page-btn"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.max(1, state.currentPage - 1) })}
                  disabled={state.currentPage <= 1}
                >←</button>
                <span className="pdfcropper-page-info">{state.currentPage} / {state.totalPages}</span>
                <button
                  className="pdfcropper-page-btn"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: Math.min(state.totalPages, state.currentPage + 1) })}
                  disabled={state.currentPage >= state.totalPages}
                >→</button>
              </div>
              <div className="pdfcropper-zoom">
                <button
                  className="pdfcropper-zoom-fit"
                  onClick={() => {
                    // キャンバスをwrapper幅に合わせる
                    if (canvasRef.current && canvasWrapperRef.current) {
                      const wrapperWidth = canvasWrapperRef.current.clientWidth - 20 // padding分を引く
                      const canvasWidth = canvasRef.current.width
                      const fitScale = wrapperWidth / canvasWidth
                      dispatch({ type: 'SET_FIELD', field: 'scale', value: Math.max(0.5, Math.min(3, Math.round(fitScale * 100) / 100)) })
                    }
                  }}
                  title="ページ幅に合わせる"
                >
                  幅に合わせる
                </button>
                <button
                  className="pdfcropper-zoom-reset"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'scale', value: 1.0 })}
                  title="100%に戻す"
                >
                  100%
                </button>
                <button
                  className="pdfcropper-zoom-btn"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'scale', value: Math.max(0.5, Math.round((state.scale - 0.1) * 10) / 10) })}
                  title="縮小"
                >
                  −
                </button>
                <span className="pdfcropper-zoom-display">{Math.round(state.scale * 100)}%</span>
                <button
                  className="pdfcropper-zoom-btn"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'scale', value: Math.min(3, Math.round((state.scale + 0.1) * 10) / 10) })}
                  title="拡大"
                >
                  ＋
                </button>
              </div>
              <span className="pdfcropper-hint">
                📱 1本指=切出 / 2本指=パン・ピンチ　🖱️ 左=切出 / 中=パン / ホイール=ズーム
              </span>
            </div>

            <div className="pdfcropper-viewer-area">
              {/* ページ送りボタン（電子コミック風） */}
              {state.currentPage > 1 && (
                <button
                  className="pdfcropper-page-arrow pdfcropper-page-arrow-left"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: state.currentPage - 1 })}
                >
                  <svg viewBox="0 0 24 40" width="24" height="40"><path d="M20 2 L4 20 L20 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              {state.currentPage < state.totalPages && (
                <button
                  className="pdfcropper-page-arrow pdfcropper-page-arrow-right"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'currentPage', value: state.currentPage + 1 })}
                >
                  <svg viewBox="0 0 24 40" width="24" height="40"><path d="M4 2 L20 20 L4 38" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              <div
                ref={canvasWrapperRef}
                className="pdfcropper-canvas-wrapper"
                onWheel={handleWheel}
              >
                <div className="pdfcropper-canvas-container">
                  <canvas ref={canvasRef} className="pdfcropper-canvas" />
                  <canvas
                    ref={overlayRef}
                    className="pdfcropper-overlay-canvas"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              </div>
            </div>

            {state.croppedPreview && (
              <div className="pdfcropper-preview-area">
                <div className="pdfcropper-preview-label">選択範囲のプレビュー</div>
                <div className="pdfcropper-preview-scroll">
                  <img src={state.croppedPreview} alt="crop preview" className="pdfcropper-preview-img" />
                </div>
                <div className="pdfcropper-preview-actions">
                  <button
                    className="pdfcropper-reselect-btn"
                    onClick={() => { dispatch({ type: 'RESET_CROP' }); clearOverlay() }}
                  >
                    選び直す
                  </button>
                  <button
                    className="pdfcropper-confirm-btn"
                    onClick={handleConfirmCrop}
                    disabled={state.isUploading}
                  >
                    {state.isUploading ? '保存中...' : 'この範囲で確定'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!state.pdfDoc && !state.isLoading && !state.error && state.activeTab !== 'list' && (
          <div className="pdfcropper-empty">
            PDFを選択または読み込むと、ここに表示されます
          </div>
        )}

        {state.isLoading && (
          <Loading message="PDFを読み込んでいます..." />
        )}
      </div>
    </div>,
    document.body
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
