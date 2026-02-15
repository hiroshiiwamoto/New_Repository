import { useState, useEffect, useCallback } from 'react'
import { searchDriveFiles, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import './DriveFilePicker.css'

function DriveFilePicker({ onSelect, onClose }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadFiles = useCallback(async (query = '') => {
    setLoading(true)
    setError(null)
    try {
      // Drive接続確認
      const hasAccess = await checkDriveAccess()
      if (!hasAccess) {
        const token = await refreshGoogleAccessToken()
        if (!token) {
          setError('Google Drive に接続してください。再ログインが必要です。')
          setLoading(false)
          return
        }
      }

      const result = await searchDriveFiles(query)
      setFiles(result)
    } catch (err) {
      setError('ファイル一覧の取得に失敗しました: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleSearch = () => {
    loadFiles(searchQuery)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelect = (file) => {
    const viewUrl = `https://drive.google.com/file/d/${file.id}/view`
    onSelect(viewUrl, file.name)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const size = parseInt(bytes)
    if (size < 1024) return size + ' B'
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
    return (size / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getFileIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType?.startsWith('image/')) return '🖼️'
    return '📁'
  }

  return (
    <div className="drive-picker-overlay" onClick={onClose}>
      <div className="drive-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drive-picker-header">
          <div className="drive-picker-title">
            <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <h3>Google Drive からファイルを選択</h3>
          </div>
          <button className="drive-picker-close" onClick={onClose}>&times;</button>
        </div>

        <div className="drive-picker-search">
          <input
            type="text"
            placeholder="ファイル名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>検索</button>
        </div>

        <div className="drive-picker-body">
          {loading ? (
            <div className="drive-picker-loading">
              <div className="drive-picker-spinner"></div>
              <p>ファイルを読み込み中...</p>
            </div>
          ) : error ? (
            <div className="drive-picker-error">
              <p>{error}</p>
              <button onClick={() => loadFiles()}>再読み込み</button>
            </div>
          ) : files.length === 0 ? (
            <div className="drive-picker-empty">
              <p>📂 アプリフォルダにファイルがありません</p>
              <small>PDFをアップロードすると、ここに表示されます</small>
            </div>
          ) : (
            <div className="drive-picker-list">
              {files.map(file => (
                <button
                  key={file.id}
                  className="drive-picker-item"
                  onClick={() => handleSelect(file)}
                >
                  <span className="drive-file-icon">{getFileIcon(file.mimeType)}</span>
                  <div className="drive-file-info">
                    <span className="drive-file-name">{file.name}</span>
                    <span className="drive-file-meta">
                      {formatFileSize(file.size)}
                      {file.modifiedTime && ` · ${formatDate(file.modifiedTime)}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="drive-picker-footer">
          <small>アプリが保存したファイルが表示されます</small>
        </div>
      </div>
    </div>
  )
}

export default DriveFilePicker
