// Firebase Storage 使用量の確認・孤児画像の検出と削除

import { ref, listAll, getMetadata, deleteObject } from 'firebase/storage'
import { collection, getDocs } from 'firebase/firestore'
import { db, storage } from '../firebase'

/**
 * Firebase Storage URL からストレージパスを抽出
 * (problems.js の deleteStorageFile と同じロジック)
 */
function extractStoragePath(url) {
  const match = url.match(/\/o\/(.+?)\?/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Storage 使用量と孤児画像を取得
 * @param {string} userId
 * @returns {{ success: boolean, data?: { totalFiles, totalBytes, orphanFiles, orphanBytes }, error?: string }}
 */
export async function getStorageUsage(userId) {
  try {
    // 1. Storage 内の全ファイルをリスト
    const storageRef = ref(storage, `problemImages/${userId}`)
    const listResult = await listAll(storageRef)

    // ファイルが0件の場合
    if (listResult.items.length === 0) {
      return {
        success: true,
        data: { totalFiles: 0, totalBytes: 0, orphanFiles: [], orphanBytes: 0 },
      }
    }

    // 2. 各ファイルのメタデータ取得
    const metadataList = await Promise.all(
      listResult.items.map(async (item) => {
        const meta = await getMetadata(item)
        return { ref: item, fullPath: item.fullPath, size: meta.size }
      })
    )

    const totalFiles = metadataList.length
    const totalBytes = metadataList.reduce((sum, m) => sum + m.size, 0)

    // 3. Firestore から全問題の imageUrls を収集
    const problemsRef = collection(db, 'users', userId, 'problems')
    const snapshot = await getDocs(problemsRef)
    const referencedPaths = new Set()
    snapshot.forEach((doc) => {
      const urls = doc.data().imageUrls || []
      urls.forEach((url) => {
        const path = extractStoragePath(url)
        if (path) referencedPaths.add(path)
      })
    })

    // 4. 孤児ファイルを特定（参照されていないファイル）
    const orphanFiles = metadataList.filter((m) => !referencedPaths.has(m.fullPath))
    const orphanBytes = orphanFiles.reduce((sum, m) => sum + m.size, 0)

    return {
      success: true,
      data: { totalFiles, totalBytes, orphanFiles, orphanBytes },
    }
  } catch (error) {
    console.error('Error getting storage usage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 孤児ファイルを一括削除
 * @param {Array<{ref: StorageReference}>} orphanFiles
 * @returns {{ success: boolean, deletedCount?: number, error?: string }}
 */
export async function deleteOrphanFiles(orphanFiles) {
  try {
    let deletedCount = 0
    await Promise.all(
      orphanFiles.map(async (file) => {
        try {
          await deleteObject(file.ref)
          deletedCount++
        } catch (error) {
          if (error.code !== 'storage/object-not-found') {
            console.warn('Failed to delete orphan file:', file.fullPath, error)
          } else {
            deletedCount++ // 既に削除済みもカウント
          }
        }
      })
    )
    return { success: true, deletedCount }
  } catch (error) {
    console.error('Error deleting orphan files:', error)
    return { success: false, error: error.message }
  }
}
