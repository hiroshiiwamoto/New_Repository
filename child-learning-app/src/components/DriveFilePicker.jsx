import { useState, useEffect, useCallback } from 'react'
import { getGoogleAccessToken, refreshGoogleAccessToken } from './Auth'
import './DriveFilePicker.css'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const ROOT_FOLDER = { id: 'root', name: 'マイドライブ' }

/**
 * トークンを使って直接APIを呼ぶ（ポップアップを自動で開かない）
 */
async function driveFetchDirect(url, token) {
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
}

function DriveFilePicker({ onSelect, onClose }) {
  const [items, setItems] = useState([]) // フォルダ + ファイル
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState(null) // 'no_token' | 'forbidden' | 'api_disabled' | 'general'
  const [searchQuery, setSearchQuery] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [folderPath, setFolderPath] = useState([ROOT_FOLDER]) // パンくずリスト
  const [isSearchMode, setIsSearchMode] = useState(false)

  const currentFolderId = folderPath[folderPath.length - 1].id

  /**
   * 指定フォルダ内のフォルダ＋PDFファイルを取得
   */
  const loadFolder = useCallback(async (token, folderId = 'root') => {
    setLoading(true)
    setError(null)
    setErrorType(null)
    setIsSearchMode(false)
    try {
      const q = `'${folderId}' in parents and trashed=false and (mimeType='${FOLDER_MIME}' or mimeType='application/pdf')`
      const filesUrl = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType,createdTime,modifiedTime)&orderBy=folder,name&pageSize=100`

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
      const allItems = data.files || []
      // フォルダを先に、次にPDFファイルを表示
      const folders = allItems.filter(f => f.mimeType === FOLDER_MIME)
      const pdfs = allItems.filter(f => f.mimeType !== FOLDER_MIME)
      setItems([...folders, ...pdfs])
    } catch (err) {
      setError('通信エラー: ' + err.message)
      setErrorType('general')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Drive全体からPDFファイルを検索
   */
  const searchFiles = useCallback(async (token, query) => {
    setLoading(true)
    setError(null)
    setErrorType(null)
    setIsSearchMode(true)
    try {
      const q = `trashed=false and name contains '${query.replace(/'/g, "\\'")}' and mimeType='application/pdf'`
      const filesUrl = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType,createdTime,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`

      const res = await driveFetchDirect(filesUrl, token)

      if (res.status === 401) {
        setError('アクセストークンの期限が切れました。再接続してください。')
        setErrorType('no_token')
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
      setItems(data.files || [])
    } catch (err) {
      setError('通信エラー: ' + err.message)
      setErrorType('general')
    } finally {
      setLoading(false)
    }
  }, [])

  // 初回: トークンがあればルートフォルダを読み込み
  useEffect(() => {
    const token = getGoogleAccessToken()
    if (token) {
      loadFolder(token, 'root')
    } else {
      setErrorType('no_token')
      setError('Google Drive に接続してファイルを表示します。')
    }
  }, [loadFolder])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    setErrorType(null)
    try {
      const token = await refreshGoogleAccessToken()
      if (token) {
        setFolderPath([ROOT_FOLDER])
        await loadFolder(token, 'root')
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
    if (!token) {
      setErrorType('no_token')
      setError('Google Drive に接続してください。')
      return
    }
    if (searchQuery.trim()) {
      searchFiles(token, searchQuery.trim())
    } else {
      // 検索欄が空なら現在のフォルダに戻る
      setIsSearchMode(false)
      loadFolder(token, currentFolderId)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  /** フォルダをクリックして中に入る */
  const handleOpenFolder = (folder) => {
    const token = getGoogleAccessToken()
    if (!token) return
    setSearchQuery('')
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
    loadFolder(token, folder.id)
  }

  /** パンくずリストのクリックで移動 */
  const handleBreadcrumbClick = (index) => {
    const token = getGoogleAccessToken()
    if (!token) return
    const targetFolder = folderPath[index]
    setSearchQuery('')
    setFolderPath(prev => prev.slice(0, index + 1))
    loadFolder(token, targetFolder.id)
  }

  /** 検索結果をクリアしてフォルダ表示に戻る */
  const handleClearSearch = () => {
    const token = getGoogleAccessToken()
    if (!token) return
    setSearchQuery('')
    setIsSearchMode(false)
    loadFolder(token, currentFolderId)
  }

  const handleSelect = (file) => {
    const viewUrl = `https://drive.google.com/file/d/${file.id}/view`
    onSelect({ url: viewUrl, name: file.name })
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
  const folders = items.filter(f => f.mimeType === FOLDER_MIME)
  const pdfFiles = items.filter(f => f.mimeType !== FOLDER_MIME)

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

        {/* パンくずリスト */}
        {showSearchBar && !isSearchMode && (
          <div className="drive-breadcrumb">
            {folderPath.map((folder, index) => (
              <span key={folder.id + '-' + index} className="drive-breadcrumb-item">
                {index > 0 && <span className="drive-breadcrumb-sep">/</span>}
                <button
                  className={`drive-breadcrumb-btn ${index === folderPath.length - 1 ? 'active' : ''}`}
                  onClick={() => handleBreadcrumbClick(index)}
                  disabled={index === folderPath.length - 1}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 検索モードバナー */}
        {isSearchMode && (
          <div className="drive-search-banner">
            <span>検索結果: &quot;{searchQuery}&quot;</span>
            <button onClick={handleClearSearch}>フォルダ表示に戻る</button>
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
                if (token) loadFolder(token, currentFolderId)
              }}>再読み込み</button>
            </div>
          ) : items.length === 0 ? (
            <div className="drive-picker-empty">
              {isSearchMode ? (
                <>
                  <p>検索結果が見つかりません</p>
                  <small>別のキーワードで検索するか、フォルダ表示に戻ってください。</small>
                </>
              ) : (
                <>
                  <p>このフォルダは空です</p>
                  <small>
                    PDFファイルやサブフォルダがありません。
                    {folderPath.length > 1 && (
                      <><br />上のパンくずリストから別のフォルダに移動できます。</>
                    )}
                  </small>
                </>
              )}
            </div>
          ) : (
            <div className="drive-picker-list">
              {/* フォルダ一覧 */}
              {folders.map(folder => (
                <button
                  key={folder.id}
                  className="drive-picker-item drive-picker-folder"
                  onClick={() => handleOpenFolder(folder)}
                >
                  <span className="drive-file-icon drive-folder-icon">📁</span>
                  <div className="drive-file-info">
                    <span className="drive-file-name">{folder.name}</span>
                    <span className="drive-file-meta">フォルダ</span>
                  </div>
                  <span className="drive-folder-arrow">›</span>
                </button>
              ))}
              {/* PDFファイル一覧 */}
              {pdfFiles.map(file => (
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
          <small>
            {isSearchMode
              ? 'Google Drive 全体のPDFファイルを検索中'
              : `${folderPath[folderPath.length - 1].name} 内のフォルダとPDFを表示中`
            }
          </small>
        </div>
      </div>
    </div>
  )
}

export default DriveFilePicker
