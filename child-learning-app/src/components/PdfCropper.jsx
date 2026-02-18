import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { getGoogleAccessToken, refreshGoogleAccessToken } from './Auth'
import './PdfCropper.css'

// Use unpkg CDN for the worker to avoid bundler complexity
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

function extractDriveFileId(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/?\s]+)/)
  return match ? match[1] : null
}

export default function PdfCropper({ userId, onCropComplete, onClose }) {
  const [urlInput, setUrlInput] = useState('')
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [croppedPreview, setCroppedPreview] = useState(null)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const renderTaskRef = useRef(null)

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height)
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
    if (overlay) {
      overlay.width = viewport.width
      overlay.height = viewport.height
    }

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

  function drawSelectionRect(sel) {
    const overlay = overlayRef.current
    if (!overlay || !sel) return
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    // dim outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, overlay.width, overlay.height)
    ctx.clearRect(sel.x, sel.y, sel.w, sel.h)
    // border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h)
  }

  function getCanvasPos(e) {
    const overlay = overlayRef.current
    const rect = overlay.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (overlay.width / rect.width),
      y: (e.clientY - rect.top) * (overlay.height / rect.height),
    }
  }

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e)
    setIsDragging(true)
    setDragStart(pos)
    setSelection(null)
    setCroppedPreview(null)
    setCroppedBlob(null)
    clearOverlay()
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return
    const pos = getCanvasPos(e)
    const sel = normRect(dragStart, pos)
    drawSelectionRect(sel)
  }

  const handleMouseUp = (e) => {
    if (!isDragging) return
    setIsDragging(false)
    const pos = getCanvasPos(e)
    const sel = normRect(dragStart, pos)
    if (sel.w < 10 || sel.h < 10) { clearOverlay(); return }
    setSelection(sel)
    drawSelectionRect(sel)
    cropToPreview(sel)
  }

  function normRect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y),
    }
  }

  function cropToPreview(sel) {
    const src = canvasRef.current
    if (!src) return
    const tmp = document.createElement('canvas')
    tmp.width = sel.w
    tmp.height = sel.h
    tmp.getContext('2d').drawImage(src, sel.x, sel.y, sel.w, sel.h, 0, 0, sel.w, sel.h)
    setCroppedPreview(tmp.toDataURL('image/png'))
    tmp.toBlob(blob => setCroppedBlob(blob), 'image/png')
  }

  const handleLoadPdf = async () => {
    const fileId = extractDriveFileId(urlInput)
    if (!fileId) {
      setError('Google DriveのURLを入力してください（例: https://drive.google.com/file/d/.../view）')
      return
    }
    setIsLoading(true)
    setError('')
    setPdfDoc(null)

    try {
      let token = getGoogleAccessToken()
      if (!token) token = await refreshGoogleAccessToken()
      if (!token) throw new Error('Googleアカウントに再ログインしてください')

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) throw new Error(`PDFの読み込みに失敗しました (${response.status})`)

      const arrayBuffer = await response.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
    } catch (e) {
      setError(e.message || 'PDFの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <div className="pdfcropper-overlay" onClick={onClose}>
      <div className="pdfcropper-modal" onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="pdfcropper-header">
          <h3 className="pdfcropper-title">PDFから問題を切り出す</h3>
          <button className="pdfcropper-close" onClick={onClose}>✕</button>
        </div>

        {/* URL入力 */}
        <div className="pdfcropper-url-row">
          <input
            className="pdfcropper-url-input"
            type="text"
            placeholder="Google Drive URL を貼り付け（例: https://drive.google.com/file/d/.../view）"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadPdf()}
          />
          <button
            className="pdfcropper-load-btn"
            onClick={handleLoadPdf}
            disabled={isLoading}
          >
            {isLoading ? '読込中...' : '読込'}
          </button>
        </div>

        {error && <div className="pdfcropper-error">{error}</div>}

        {/* PDFビュー */}
        {pdfDoc && (
          <>
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
              <span className="pdfcropper-hint">ドラッグで問題範囲を選択</span>
            </div>

            <div className="pdfcropper-canvas-wrapper">
              <canvas ref={canvasRef} className="pdfcropper-canvas" />
              <canvas
                ref={overlayRef}
                className="pdfcropper-overlay-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
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

        {!pdfDoc && !isLoading && (
          <div className="pdfcropper-empty">
            Google Drive の PDF URL を貼り付けて「読込」を押してください
          </div>
        )}

        {isLoading && (
          <div className="pdfcropper-loading">PDFを読み込んでいます...</div>
        )}
      </div>
    </div>
  )
}
