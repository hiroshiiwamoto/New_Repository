// Google Drive API を使用した PDF 管理ユーティリティ

import { getGoogleAccessToken, refreshGoogleAccessToken } from '../components/Auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const APP_FOLDER_NAME = 'SAPIX学習管理_PDF'

/**
 * 有効なアクセストークンを取得（期限切れの場合は再認証）
 */
async function getValidToken() {
  let token = getGoogleAccessToken()
  if (!token) {
    token = await refreshGoogleAccessToken()
  }
  return token
}

/**
 * Google Drive API を呼び出す（401なら再認証してリトライ）
 */
async function driveApiFetch(url, options = {}) {
  let token = await getValidToken()
  if (!token) {
    throw new Error('Google Drive へのアクセス権限がありません。再ログインしてください。')
  }

  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  })

  // トークン期限切れの場合、再認証してリトライ
  if (response.status === 401) {
    token = await refreshGoogleAccessToken()
    if (!token) {
      throw new Error('Google Drive へのアクセス権限がありません。再ログインしてください。')
    }
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  return response
}

/**
 * アプリ専用フォルダのIDを取得（なければ作成）
 */
async function getOrCreateAppFolder() {
  // 既存フォルダを検索
  const searchUrl = `${DRIVE_API}/files?q=${encodeURIComponent(
    `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )}&fields=files(id,name)`

  const searchResponse = await driveApiFetch(searchUrl)
  const searchData = await searchResponse.json()

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id
  }

  // フォルダを作成
  const createResponse = await driveApiFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })

  const folderData = await createResponse.json()
  return folderData.id
}

/**
 * PDF を Google Drive にアップロード
 */
export async function uploadPDFToDrive(file, onProgress) {
  const folderId = await getOrCreateAppFolder()

  // メタデータ
  const metadata = {
    name: file.name,
    parents: [folderId],
  }

  // multipart upload
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  // ファイルを ArrayBuffer として読み取り
  const fileContent = await file.arrayBuffer()

  // multipart body を構築
  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata)

  const encoder = new TextEncoder()
  const metadataBytes = encoder.encode(metadataPart)
  const filePreambleBytes = encoder.encode(
    delimiter + 'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n'
  )
  const closeBytes = encoder.encode(closeDelimiter)

  // Base64 エンコード
  const base64Content = arrayBufferToBase64(fileContent)
  const base64Bytes = encoder.encode(base64Content)

  // 全体を結合
  const body = new Uint8Array(
    metadataBytes.length + filePreambleBytes.length + base64Bytes.length + closeBytes.length
  )
  body.set(metadataBytes, 0)
  body.set(filePreambleBytes, metadataBytes.length)
  body.set(base64Bytes, metadataBytes.length + filePreambleBytes.length)
  body.set(closeBytes, metadataBytes.length + filePreambleBytes.length + base64Bytes.length)

  if (onProgress) onProgress(30) // メタデータ準備完了

  const uploadUrl = `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,size,webViewLink,webContentLink`

  const response = await driveApiFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary="${boundary}"`,
    },
    body: body,
  })

  if (onProgress) onProgress(90)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `アップロード失敗 (${response.status})`)
  }

  const data = await response.json()

  if (onProgress) onProgress(100)

  return {
    driveFileId: data.id,
    fileName: data.name,
    fileSize: parseInt(data.size) || file.size,
    viewUrl: data.webViewLink,
    downloadUrl: data.webContentLink,
  }
}

/**
 * Google Drive からファイルを削除
 */
export async function deleteFileFromDrive(driveFileId) {
  const response = await driveApiFetch(`${DRIVE_API}/files/${driveFileId}`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`削除失敗 (${response.status})`)
  }
}

/**
 * Google Drive のストレージ使用量を取得
 */
export async function getDriveStorageInfo() {
  const response = await driveApiFetch(
    `${DRIVE_API}/about?fields=storageQuota`
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const quota = data.storageQuota

  return {
    totalSize: parseInt(quota.usage) || 0,
    limit: parseInt(quota.limit) || 15 * 1024 * 1024 * 1024, // 15GB default
    usageInDrive: parseInt(quota.usageInDrive) || 0,
  }
}

/**
 * アプリフォルダ内のファイル一覧を取得
 */
export async function listDriveFiles() {
  const folderId = await getOrCreateAppFolder()

  const url = `${DRIVE_API}/files?q=${encodeURIComponent(
    `'${folderId}' in parents and trashed=false`
  )}&fields=files(id,name,size,webViewLink,createdTime)&orderBy=createdTime desc`

  const response = await driveApiFetch(url)

  if (!response.ok) {
    throw new Error(`ファイル一覧取得失敗 (${response.status})`)
  }

  const data = await response.json()
  return data.files || []
}

/**
 * アプリフォルダ内のPDFファイルを検索
 */
export async function searchDriveFiles(query = '') {
  const folderId = await getOrCreateAppFolder()

  let q = `'${folderId}' in parents and trashed=false`
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`
  }

  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType,createdTime,modifiedTime)&orderBy=modifiedTime desc&pageSize=50`

  const response = await driveApiFetch(url)

  if (!response.ok) {
    throw new Error(`ファイル検索失敗 (${response.status})`)
  }

  const data = await response.json()
  return data.files || []
}

/**
 * Google Drive トークンが有効かチェック
 */
export async function checkDriveAccess() {
  try {
    const token = getGoogleAccessToken()
    if (!token) return false

    const response = await fetch(`${DRIVE_API}/about?fields=user`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return response.ok
  } catch {
    return false
  }
}

// ユーティリティ: ArrayBuffer を Base64 に変換
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}
