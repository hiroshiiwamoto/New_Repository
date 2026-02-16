import { useState, useEffect, useCallback } from 'react'
import { getGoogleAccessToken, refreshGoogleAccessToken } from './Auth'
import './DriveFilePicker.css'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'

/**
 * トークンを使って直接APIを呼ぶ（ポップアップを自動で開かない）
 */
async function driveFetchDirect(url, token) {
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
}

function DriveFilePicker({ onSelect, onClose }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null) // 'no_token' | 'forbidden' | 'api_disabled' | 'general'
  const [searchQuery, setSearchQuery] = useState('')
  const [connecting, setConnecting] = useState(false)

  const loadFiles = useCallback(async (token, query = '') => {
    setLoading(true)
    setError(null)
    setErrorType(null)
    try {
      // Drive全体からPDFファイルを検索（アプリフォルダに限定しない）
      let q = 'trashed=false and (mimeType="application/pdf" or mimeType="application/vnd.google-apps.folder")'
      if (query) {
        q = `trashed=false and name contains '${query.replace(/'/g, "\\'")}'`
      }

      const filesUrl = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType,createdTime,modifiedTime,parents)&orderBy=modifiedTime desc&pageSize=50`

      const res = await driveFetchDirect(filesUrl, token)

      if (res.status === 401) {
        setError('アクセストークンの期限が切れました。再接続してください。')
        setErrorType('no_token')
        setLoading(false)
        return
      }

      if (res.status === 403) {
        const errBody = await res.json().catch(() => ({}))
        const reason = errBody.error?.errors?.[0]?.reason || ''
        const apiMsg = errBody.error?.message || ''

        if (reason === 'accessNotConfigured' || apiMsg.includes('has not been used') || apiMsg.includes('disabled')) {
          setError('Google Drive API がプロジェクトで有効になっていません。')
          setErrorType('api_disabled')
        } else {
          setError('Google Drive へのアクセス権限がありません。一度ログアウトしてから再ログインしてください。')
          setErrorType('forbidden')
        }
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(`Drive API エラー (${res.status})`)
        setErrorType('general')
        setLoading(false)
        return
      }

      const data = await res.json()
      // PDFファイルのみ表示（フォルダは除外）
      const pdfFiles = (data.files || []).filter(f => f.mimeType === 'application/pdf')
      setFiles(pdfFiles)
    } catch (err) {
      setError('通信エラー: ' + err.message)
      setErrorType('general')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初回: トークンがあればファイル読み込み、なければ接続ボタン表示
  useEffect(() => {
    const token = getGoogleAccessToken()
    if (token) {
      loadFiles(token)
    } else {
      setErrorType('no_token')
      setError('Google Drive に接続してファイルを表示します。')
    }
  }, [loadFiles])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    setErrorType(null)
    try {
      const token = await refreshGoogleAccessToken()
      if (token) {
        await loadFiles(token)
      } else {
        setError('Google Drive への接続がキャンセルされました。')
        setErrorType('no_token')
      }
    } catch (err) {
      setError('接続エラー: ' + err.message)
      setErrorType('general')
    } finally {
      setConnecting(false)
    }
  }

  const handleSearch = () => {
    const token = getGoogleAccessToken()
    if (token) {
      loadFiles(token, searchQuery)
    } else {
      setErrorType('no_token')
      setError('Google Drive に接続してください。')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelect = (file) => {
    const viewUrl = `https://drive.google.com/file/d/${file.id}/view`
    onSelect(viewUrl)
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

  const showSearchBar = !errorType || errorType === 'general'

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

        {showSearchBar && (
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
        )}

        <div className="drive-picker-body">
          {loading ? (
            <div className="drive-picker-loading">
              <div className="drive-picker-spinner"></div>
              <p>ファイルを読み込み中...</p>
            </div>
          ) : errorType === 'no_token' ? (
            <div className="drive-picker-connect">
              <p>{error}</p>
              <button
                className="drive-connect-action-btn"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? '接続中...' : 'Google Drive に接続'}
              </button>
              <small>ボタンを押すとGoogleアカウントの認証画面が開きます</small>
            </div>
          ) : errorType === 'api_disabled' ? (
            <div className="drive-picker-setup">
              <p className="drive-setup-title">Google Drive API の有効化が必要です</p>
              <div className="drive-setup-steps">
                <p>以下の手順で有効化してください:</p>
                <ol>
                  <li>下のリンクから Google Cloud Console を開く</li>
                  <li>「有効にする」ボタンをクリック</li>
                  <li>このページに戻って「再読み込み」を押す</li>
                </ol>
              </div>
              <a
                href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=studyapp-28e08"
                target="_blank"
                rel="noopener noreferrer"
                className="drive-setup-link"
              >
                Google Cloud Console を開く
              </a>
              <button
                className="drive-connect-action-btn"
                onClick={handleConnect}
                disabled={connecting}
                style={{ marginTop: '8px' }}
              >
                {connecting ? '接続中...' : '再読み込み'}
              </button>
            </div>
          ) : errorType === 'forbidden' ? (
            <div className="drive-picker-error">
              <p>{error}</p>
              <small>
                ログアウト → 再ログイン で権限を更新してください。
              </small>
              <button
                className="drive-connect-action-btn"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? '接続中...' : '再接続を試す'}
              </button>
            </div>
          ) : error ? (
            <div className="drive-picker-error">
              <p>{error}</p>
              <button onClick={() => {
                const token = getGoogleAccessToken()
                if (token) loadFiles(token)
              }}>再読み込み</button>
            </div>
          ) : files.length === 0 ? (
            <div className="drive-picker-empty">
              <p>📂 PDFファイルが見つかりません</p>
              <small>
                Google Drive にPDFファイルがある場合は、検索してみてください。
                <br />
                新しいPDFは「新規アップロード」から追加できます。
              </small>
            </div>
          ) : (
            <div className="drive-picker-list">
              {files.map(file => (
                <button
                  key={file.id}
                  className="drive-picker-item"
                  onClick={() => handleSelect(file)}
                >
                  <span className="drive-file-icon">📄</span>
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
          <small>Google Drive 内のPDFファイルが表示されます</small>
        </div>
      </div>
    </div>
  )
}

export default DriveFilePicker
