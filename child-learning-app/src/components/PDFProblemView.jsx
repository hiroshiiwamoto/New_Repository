import { useState, useEffect, useRef } from 'react'
import './PDFProblemView.css'
import {
  uploadPDF,
  getAllPDFs,
  deletePDF,
  saveProblemRecord,
  getProblemRecords,
  getPDFStatistics,
  getStorageUsage,
  checkDriveAccess
} from '../utils/pdfStorage'
import { refreshGoogleAccessToken } from './Auth'
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
  const [driveConnected, setDriveConnected] = useState(false)
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
    checkDriveConnection()
  }, [user])

  const checkDriveConnection = async () => {
    const connected = await checkDriveAccess()
    setDriveConnected(connected)
  }

  const handleConnectDrive = async () => {
    const token = await refreshGoogleAccessToken()
    if (token) {
      setDriveConnected(true)
      toast.success('Google Drive に接続しました')
      loadStorageUsage()
    } else {
      toast.error('Google Drive の接続に失敗しました')
    }
  }

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

    if (file.size > 20 * 1024 * 1024) {
      toast.error('ファイルサイズは20MB以下にしてください')
      return
    }

    // Google Drive 接続チェック
    if (!driveConnected) {
      const token = await refreshGoogleAccessToken()
      if (!token) {
        toast.error('Google Drive に接続してからアップロードしてください')
        return
      }
      setDriveConnected(true)
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
        toast.success('PDFをGoogle Driveにアップロードしました')
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
    if (!window.confirm(`「${pdf.fileName}」を削除しますか？\nGoogle Driveからも削除されます。関連する問題記録もすべて削除されます。`)) {
      return
    }

    const result = await deletePDF(user.uid, pdf.firestoreId, pdf.driveFileId)
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

  const getViewUrl = (pdf) => {
    // Google Drive のプレビューURL
    if (pdf.driveFileId) {
      return `https://drive.google.com/file/d/${pdf.driveFileId}/view`
    }
    // 旧 Firebase Storage URL（後方互換）
    return pdf.downloadURL || pdf.viewUrl
  }

  const renderProblemTracker = () => {
    if (!selectedPDF) return null

    const estimatedPages = 20

    return (
      <div className="problem-tracker">
        <div className="tracker-header">
          <h3>問題管理: {selectedPDF.fileName}</h3>
          <button className="close-btn" onClick={() => setSelectedPDF(null)}>
            閉じる
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
      {/* Google Drive 接続状態 */}
      <div className="drive-status">
        {driveConnected ? (
          <span className="drive-connected">Google Drive 接続済み</span>
        ) : (
          <button className="drive-connect-btn" onClick={handleConnectDrive}>
            Google Drive に接続
          </button>
        )}
      </div>

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
        <h2>PDF問題集</h2>
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
            <h3>PDFをアップロード（Google Drive）</h3>

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
              <small>最大20MB / PDF（Google Driveに保存されます）</small>
            </div>

            {storageUsage && (
              <div className="storage-usage-info">
                <div className="usage-bar-container">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${Math.min(100, (storageUsage.fileCount / storageUsage.maxFileCount) * 100)}%` }}
                  ></div>
                </div>
                <small>
                  アプリ内PDF: {storageUsage.fileCount} / {storageUsage.maxFileCount}個
                  （合計 {(storageUsage.totalSize / (1024 * 1024)).toFixed(1)}MB）
                </small>
                {storageUsage.driveLimit > 0 && (
                  <small className="drive-usage">
                    Google Drive: {(storageUsage.driveUsage / (1024 * 1024 * 1024)).toFixed(1)}GB / {(storageUsage.driveLimit / (1024 * 1024 * 1024)).toFixed(0)}GB
                  </small>
                )}
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
            PDFファイルをアップロードして問題を管理しましょう
            <br />
            <small>過去問や問題集をPDFで保存し、問題ごとに解答状況を記録できます</small>
            <br />
            <small className="drive-note">PDFはあなたのGoogle Driveに安全に保存されます</small>
          </div>
        ) : (
          pdfs.map(pdf => (
            <div key={pdf.firestoreId} className="pdf-card">
              <div className="pdf-card-header">
                <div className="pdf-icon">
                  {pdf.storageType === 'google_drive' ? (
                    <svg width="24" height="24" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  ) : '📕'}
                </div>
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
                  href={getViewUrl(pdf)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn view"
                >
                  表示
                </a>
                <button
                  className="action-btn manage"
                  onClick={() => handleSelectPDF(pdf)}
                >
                  問題管理
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDeletePDF(pdf)}
                >
                  削除
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
