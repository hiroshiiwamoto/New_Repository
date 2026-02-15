import { useState, useEffect, useRef } from 'react'
import './PDFProblemView.css'
import {
  uploadPDF,
  getAllPDFs,
  deletePDF,
  updatePDF,
  saveProblemRecord,
  getProblemRecords,
  getPDFStatistics,
  getStorageUsage
} from '../utils/pdfStorage'
import { toast } from '../utils/toast'

function PDFProblemView({ user }) {
  const [pdfs, setPdfs] = useState([])
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [problems, setProblems] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [filter, setFilter] = useState({ subject: '', schoolName: '' })
  const [storageUsage, setStorageUsage] = useState(null)
  const [uploadMetadata, setUploadMetadata] = useState({
    subject: '算数',
    schoolName: '',
    year: new Date().getFullYear(),
    description: ''
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadPDFs()
    loadStatistics()
    loadStorageUsage()
  }, [user])

  const loadPDFs = async () => {
    const result = await getAllPDFs(user.uid, filter)
    if (result.success) {
      setPdfs(result.data)
    }
  }

  const loadStatistics = async () => {
    const result = await getPDFStatistics(user.uid)
    if (result.success) {
      setStatistics(result.data)
    }
  }

  const loadStorageUsage = async () => {
    const usage = await getStorageUsage(user.uid)
    if (usage) {
      setStorageUsage(usage)
    }
  }

  const loadProblems = async (pdfId) => {
    const result = await getProblemRecords(user.uid, pdfId)
    if (result.success) {
      setProblems(result.data)
    }
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('PDFファイルのみアップロード可能です')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズは10MB以下にしてください')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadPDF(
        user.uid,
        file,
        uploadMetadata,
        (progress) => setUploadProgress(progress)
      )

      if (result.success) {
        toast.success('PDFをアップロードしました')
        await loadPDFs()
        await loadStorageUsage()
        setShowUploadForm(false)
        setUploadMetadata({
          subject: '算数',
          schoolName: '',
          year: new Date().getFullYear(),
          description: ''
        })
      } else {
        toast.error('アップロードに失敗しました: ' + result.error)
      }
    } catch (error) {
      toast.error('アップロードエラー: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeletePDF = async (pdf) => {
    if (!window.confirm(`「${pdf.fileName}」を削除しますか？\n関連する問題記録もすべて削除されます。`)) {
      return
    }

    const result = await deletePDF(user.uid, pdf.firestoreId, pdf.storagePath)
    if (result.success) {
      toast.success('削除しました')
      await loadPDFs()
      await loadStatistics()
      await loadStorageUsage()
      if (selectedPDF?.firestoreId === pdf.firestoreId) {
        setSelectedPDF(null)
        setProblems([])
      }
    } else {
      toast.error('削除に失敗しました: ' + result.error)
    }
  }

  const handleSelectPDF = async (pdf) => {
    setSelectedPDF(pdf)
    await loadProblems(pdf.firestoreId)
  }

  const handleProblemStatusChange = async (pageNumber, problemNumber, status) => {
    const problemData = {
      pdfDocumentId: selectedPDF.firestoreId,
      pageNumber,
      problemNumber,
      status,
      subject: selectedPDF.subject,
      schoolName: selectedPDF.schoolName
    }

    const result = await saveProblemRecord(user.uid, problemData)
    if (result.success) {
      await loadProblems(selectedPDF.firestoreId)
      await loadStatistics()
    } else {
      toast.error('記録に失敗しました')
    }
  }

  const renderProblemTracker = () => {
    if (!selectedPDF) return null

    // ページ数を推定（実際のPDFから取得する場合はpdf.jsを使用）
    const estimatedPages = 20

    return (
      <div className="problem-tracker">
        <div className="tracker-header">
          <h3>📝 問題管理: {selectedPDF.fileName}</h3>
          <button className="close-btn" onClick={() => setSelectedPDF(null)}>
            ✕ 閉じる
          </button>
        </div>

        <div className="tracker-info">
          <span>科目: {selectedPDF.subject}</span>
          {selectedPDF.schoolName && <span>学校: {selectedPDF.schoolName}</span>}
          {selectedPDF.year && <span>年度: {selectedPDF.year}</span>}
        </div>

        <div className="problem-grid">
          {Array.from({ length: estimatedPages }, (_, pageIndex) => {
            const pageNumber = pageIndex + 1
            const pageProblems = problems.filter(p => p.pageNumber === pageNumber)

            return (
              <div key={pageNumber} className="page-section">
                <h4>ページ {pageNumber}</h4>
                <div className="problems-row">
                  {Array.from({ length: 10 }, (_, probIndex) => {
                    const problemNumber = probIndex + 1
                    const existing = pageProblems.find(p => p.problemNumber === problemNumber)
                    const status = existing?.status || 'pending'

                    return (
                      <div
                        key={problemNumber}
                        className={`problem-cell ${status}`}
                        onClick={() => {
                          const nextStatus =
                            status === 'pending' ? 'correct' :
                            status === 'correct' ? 'incorrect' :
                            'pending'
                          handleProblemStatusChange(pageNumber, problemNumber, nextStatus)
                        }}
                        title={`問${problemNumber}: ${
                          status === 'correct' ? '正解' :
                          status === 'incorrect' ? '不正解' :
                          '未着手'
                        }`}
                      >
                        {problemNumber}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="tracker-legend">
          <div className="legend-item">
            <span className="legend-box pending"></span>
            <span>未着手</span>
          </div>
          <div className="legend-item">
            <span className="legend-box correct"></span>
            <span>正解</span>
          </div>
          <div className="legend-item">
            <span className="legend-box incorrect"></span>
            <span>不正解</span>
          </div>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="pdf-problem-view">
      {/* 統計サマリー */}
      {statistics && (
        <div className="statistics-header">
          <div className="stat-card">
            <div className="stat-number">{statistics.total}</div>
            <div className="stat-label">総問題数</div>
          </div>
          <div className="stat-card correct">
            <div className="stat-number">{statistics.correct}</div>
            <div className="stat-label">正解</div>
          </div>
          <div className="stat-card incorrect">
            <div className="stat-number">{statistics.incorrect}</div>
            <div className="stat-label">不正解</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{statistics.pending}</div>
            <div className="stat-label">未着手</div>
          </div>
          {statistics.total > 0 && (
            <div className="stat-card">
              <div className="stat-number">
                {Math.round((statistics.correct / statistics.total) * 100)}%
              </div>
              <div className="stat-label">正答率</div>
            </div>
          )}
        </div>
      )}

      {/* ヘッダー */}
      <div className="pdf-header">
        <h2>📄 PDF問題集</h2>
        <button
          className="upload-btn"
          onClick={() => setShowUploadForm(true)}
          disabled={uploading}
        >
          + PDFをアップロード
        </button>
      </div>

      {/* アップロードフォーム */}
      {showUploadForm && (
        <div className="upload-form-overlay" onClick={() => !uploading && setShowUploadForm(false)}>
          <div className="upload-form-container" onClick={(e) => e.stopPropagation()}>
            <h3>📤 PDFをアップロード</h3>

            <div className="form-field">
              <label>科目 *</label>
              <select
                value={uploadMetadata.subject}
                onChange={(e) => setUploadMetadata({ ...uploadMetadata, subject: e.target.value })}
                disabled={uploading}
              >
                <option value="国語">国語</option>
                <option value="算数">算数</option>
                <option value="理科">理科</option>
                <option value="社会">社会</option>
              </select>
            </div>

            <div className="form-field">
              <label>学校名</label>
              <input
                type="text"
                placeholder="例: 開成中学校"
                value={uploadMetadata.schoolName}
                onChange={(e) => setUploadMetadata({ ...uploadMetadata, schoolName: e.target.value })}
                disabled={uploading}
              />
            </div>

            <div className="form-field">
              <label>年度</label>
              <input
                type="number"
                value={uploadMetadata.year}
                onChange={(e) => setUploadMetadata({ ...uploadMetadata, year: parseInt(e.target.value) })}
                disabled={uploading}
              />
            </div>

            <div className="form-field">
              <label>説明</label>
              <textarea
                rows="2"
                placeholder="問題集の説明（任意）"
                value={uploadMetadata.description}
                onChange={(e) => setUploadMetadata({ ...uploadMetadata, description: e.target.value })}
                disabled={uploading}
              />
            </div>

            <div className="form-field">
              <label>PDFファイル *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <small>最大10MB / PDF</small>
            </div>

            {storageUsage && (
              <div className="storage-usage-info">
                <div className="usage-bar-container">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, (storageUsage.totalSize / storageUsage.maxTotalSize) * 100)}%` }}
                  ></div>
                </div>
                <small>
                  ストレージ: {(storageUsage.totalSize / (1024 * 1024)).toFixed(1)}MB / {storageUsage.maxTotalSize / (1024 * 1024)}MB
                  ({storageUsage.fileCount} / {storageUsage.maxFileCount}個)
                </small>
              </div>
            )}

            {uploading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
                <div className="progress-text">{Math.round(uploadProgress)}%</div>
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDFリスト */}
      <div className="pdf-list">
        {pdfs.length === 0 ? (
          <div className="no-data">
            📄 PDFファイルをアップロードして問題を管理しましょう
            <br />
            <small>過去問や問題集をPDFで保存し、問題ごとに解答状況を記録できます</small>
          </div>
        ) : (
          pdfs.map(pdf => (
            <div key={pdf.firestoreId} className="pdf-card">
              <div className="pdf-card-header">
                <div className="pdf-icon">📕</div>
                <div className="pdf-info">
                  <h3 className="pdf-filename">{pdf.fileName}</h3>
                  <div className="pdf-meta">
                    <span className="subject-badge">{pdf.subject}</span>
                    {pdf.schoolName && <span>{pdf.schoolName}</span>}
                    {pdf.year && <span>{pdf.year}年</span>}
                    <span>{formatFileSize(pdf.fileSize)}</span>
                    <span>{formatDate(pdf.uploadedAt)}</span>
                  </div>
                  {pdf.description && (
                    <p className="pdf-description">{pdf.description}</p>
                  )}
                </div>
              </div>

              <div className="pdf-actions">
                <a
                  href={pdf.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn view"
                >
                  👁️ 表示
                </a>
                <button
                  className="action-btn manage"
                  onClick={() => handleSelectPDF(pdf)}
                >
                  ✏️ 問題管理
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDeletePDF(pdf)}
                >
                  🗑️ 削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 問題トラッカー */}
      {renderProblemTracker()}
    </div>
  )
}

export default PDFProblemView
