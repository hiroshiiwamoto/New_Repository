// PDF管理（Google Drive + Firestore メタデータ）

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { db } from '../firebase'
import { nowISO } from './dateUtils'
import { MAX_FILE_SIZE, MAX_PDF_COUNT } from './constants'
import {
  uploadPDFToDrive,
  deleteFileFromDrive,
  getDriveStorageInfo,
  checkDriveAccess
} from './googleDriveStorage'

/**
 * ユーザーのストレージ使用状況を取得
 */
export async function getStorageUsage(userId) {
  try {
    // Firestore からファイル数・合計サイズを計算
    const pdfRef = collection(db, 'users', userId, 'pdfDocuments')
    const snapshot = await getDocs(pdfRef)

    let totalSize = 0
    let fileCount = 0
    snapshot.forEach((doc) => {
      const data = doc.data()
      totalSize += data.fileSize || 0
      fileCount++
    })

    // Google Drive のストレージ情報も取得
    let driveInfo = null
    try {
      driveInfo = await getDriveStorageInfo()
    } catch {
      // Drive情報取得失敗は無視
    }

    return {
      totalSize,
      fileCount,
      maxFileCount: MAX_PDF_COUNT,
      maxFileSize: MAX_FILE_SIZE,
      driveUsage: driveInfo?.totalSize || 0,
      driveLimit: driveInfo?.limit || 15 * 1024 * 1024 * 1024,
    }
  } catch (error) {
    console.error('Error getting storage usage:', error)
    return null
  }
}

/**
 * PDFファイルをアップロード（Google Drive + Firestore メタデータ）
 */
export async function uploadPDF(userId, file, metadata, onProgress) {
  try {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `ファイルサイズが上限（${MAX_FILE_SIZE / (1024 * 1024)}MB）を超えています`
      }
    }

    // ファイル数チェック
    const usage = await getStorageUsage(userId)
    if (usage && usage.fileCount >= MAX_PDF_COUNT) {
      return {
        success: false,
        error: `PDF数が上限（${MAX_PDF_COUNT}個）に達しています。不要なPDFを削除してください`
      }
    }

    // Google Drive にアップロード
    const driveResult = await uploadPDFToDrive(file, onProgress)

    // Firestoreにメタデータを保存
    const pdfRef = collection(db, 'users', userId, 'pdfDocuments')
    const docRef = await addDoc(pdfRef, {
      fileName: file.name,
      driveFileId: driveResult.driveFileId,
      viewUrl: driveResult.viewUrl,
      fileSize: driveResult.fileSize,
      uploadedAt: nowISO(),
      storageType: 'google_drive',
      ...metadata
    })

    return {
      success: true,
      data: {
        id: docRef.id,
        driveFileId: driveResult.driveFileId,
        viewUrl: driveResult.viewUrl,
        fileName: file.name
      }
    }
  } catch (error) {
    console.error('Error uploading PDF:', error)
    // トークン切れの場合のメッセージ
    if (error.message.includes('再ログイン')) {
      return { success: false, error: 'Google Drive へのアクセス権限が切れました。再ログインしてください。' }
    }
    return { success: false, error: error.message }
  }
}

/**
 * 全てのPDFドキュメントを取得
 */
export async function getAllPDFs(userId, filters = {}) {
  try {
    const pdfRef = collection(db, 'users', userId, 'pdfDocuments')
    let q = query(pdfRef, orderBy('uploadedAt', 'desc'))

    if (filters.subject) {
      q = query(pdfRef, where('subject', '==', filters.subject), orderBy('uploadedAt', 'desc'))
    }
    if (filters.schoolName) {
      q = query(pdfRef, where('schoolName', '==', filters.schoolName), orderBy('uploadedAt', 'desc'))
    }

    const querySnapshot = await getDocs(q)
    const pdfs = []
    querySnapshot.forEach((doc) => {
      pdfs.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return { success: true, data: pdfs }
  } catch (error) {
    console.error('Error getting PDFs:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * PDFドキュメントを削除（Google Drive + Firestore）
 */
export async function deletePDF(userId, id, driveFileId) {
  try {
    // Google Drive から削除
    if (driveFileId) {
      try {
        await deleteFileFromDrive(driveFileId)
      } catch (error) {
        console.warn('Drive file deletion failed (may already be deleted):', error)
      }
    }

    // Firestoreから削除
    const pdfDocRef = doc(db, 'users', userId, 'pdfDocuments', id)
    await deleteDoc(pdfDocRef)

    // 関連する問題記録も削除
    const problemsRef = collection(db, 'users', userId, 'pdfProblems')
    const q = query(problemsRef, where('pdfDocumentId', '==', id))
    const snapshot = await getDocs(q)

    const deletePromises = []
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref))
    })
    await Promise.all(deletePromises)

    return { success: true }
  } catch (error) {
    console.error('Error deleting PDF:', error)
    return { success: false, error: error.message }
  }
}

/**
 * PDFドキュメント情報を更新
 */
export async function updatePDF(userId, id, updates) {
  try {
    const pdfDocRef = doc(db, 'users', userId, 'pdfDocuments', id)
    await updateDoc(pdfDocRef, {
      ...updates,
      updatedAt: nowISO()
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating PDF:', error)
    return { success: false, error: error.message }
  }
}

/**
 * PDF問題記録を追加/更新
 */
export async function saveProblemRecord(userId, problemData) {
  try {
    const problemsRef = collection(db, 'users', userId, 'pdfProblems')

    const q = query(
      problemsRef,
      where('pdfDocumentId', '==', problemData.pdfDocumentId),
      where('pageNumber', '==', problemData.pageNumber),
      where('problemNumber', '==', problemData.problemNumber)
    )
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref
      await updateDoc(docRef, {
        ...problemData,
        updatedAt: nowISO()
      })
      return { success: true, data: { id: docRef.id } }
    } else {
      const docRef = await addDoc(problemsRef, {
        ...problemData,
        createdAt: nowISO()
      })
      return { success: true, data: { id: docRef.id } }
    }
  } catch (error) {
    console.error('Error saving problem record:', error)
    return { success: false, error: error.message }
  }
}

/**
 * PDF問題記録を取得
 */
export async function getProblemRecords(userId, pdfDocumentId) {
  try {
    const problemsRef = collection(db, 'users', userId, 'pdfProblems')
    const q = query(
      problemsRef,
      where('pdfDocumentId', '==', pdfDocumentId),
      orderBy('pageNumber', 'asc'),
      orderBy('problemNumber', 'asc')
    )
    const snapshot = await getDocs(q)

    const problems = []
    snapshot.forEach((doc) => {
      problems.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return { success: true, data: problems }
  } catch (error) {
    console.error('Error getting problem records:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * 統計情報を取得
 */
export async function getPDFStatistics(userId) {
  try {
    const problemsRef = collection(db, 'users', userId, 'pdfProblems')
    const snapshot = await getDocs(problemsRef)

    const stats = {
      total: 0,
      correct: 0,
      incorrect: 0,
      pending: 0,
      bySubject: {}
    }

    snapshot.forEach((doc) => {
      const data = doc.data()
      stats.total++

      if (data.status === 'correct') stats.correct++
      else if (data.status === 'incorrect') stats.incorrect++
      else stats.pending++

      if (data.subject) {
        if (!stats.bySubject[data.subject]) {
          stats.bySubject[data.subject] = { total: 0, correct: 0, incorrect: 0, pending: 0 }
        }
        stats.bySubject[data.subject].total++
        if (data.status === 'correct') stats.bySubject[data.subject].correct++
        else if (data.status === 'incorrect') stats.bySubject[data.subject].incorrect++
        else stats.bySubject[data.subject].pending++
      }
    })

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error getting statistics:', error)
    return { success: false, error: error.message, data: {} }
  }
}

/**
 * Google Drive アクセス状態をチェック
 */
export { checkDriveAccess }
