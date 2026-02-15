// PDF管理（Firestore + Firebase Storage）

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
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'
import { db, storage } from '../firebase'

/**
 * PDFファイルをアップロード
 */
export async function uploadPDF(userId, file, metadata, onProgress) {
  try {
    // ファイル名を安全にする
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const storageRef = ref(storage, `users/${userId}/pdfs/${fileName}`)

    // アップロード
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: 'application/pdf'
    })

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress) onProgress(progress)
        },
        (error) => {
          console.error('Upload error:', error)
          reject(error)
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

            // Firestoreにメタデータを保存
            const pdfRef = collection(db, 'users', userId, 'pdfDocuments')
            const docRef = await addDoc(pdfRef, {
              fileName: file.name,
              storagePath: storageRef.fullPath,
              downloadURL,
              fileSize: file.size,
              uploadedAt: new Date().toISOString(),
              ...metadata
            })

            resolve({
              success: true,
              data: {
                firestoreId: docRef.id,
                downloadURL,
                fileName: file.name
              }
            })
          } catch (error) {
            reject(error)
          }
        }
      )
    })
  } catch (error) {
    console.error('Error uploading PDF:', error)
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

    // フィルタリング
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
        firestoreId: doc.id,
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
 * PDFドキュメントを削除
 */
export async function deletePDF(userId, firestoreId, storagePath) {
  try {
    // Firestoreから削除
    const pdfDocRef = doc(db, 'users', userId, 'pdfDocuments', firestoreId)
    await deleteDoc(pdfDocRef)

    // Storageから削除
    if (storagePath) {
      const storageRef = ref(storage, storagePath)
      await deleteObject(storageRef)
    }

    // 関連する問題記録も削除
    const problemsRef = collection(db, 'users', userId, 'pdfProblems')
    const q = query(problemsRef, where('pdfDocumentId', '==', firestoreId))
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
export async function updatePDF(userId, firestoreId, updates) {
  try {
    const pdfDocRef = doc(db, 'users', userId, 'pdfDocuments', firestoreId)
    await updateDoc(pdfDocRef, {
      ...updates,
      updatedAt: new Date().toISOString()
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

    // 既存の記録があるか確認
    const q = query(
      problemsRef,
      where('pdfDocumentId', '==', problemData.pdfDocumentId),
      where('pageNumber', '==', problemData.pageNumber),
      where('problemNumber', '==', problemData.problemNumber)
    )
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      // 更新
      const docRef = snapshot.docs[0].ref
      await updateDoc(docRef, {
        ...problemData,
        updatedAt: new Date().toISOString()
      })
      return { success: true, data: { firestoreId: docRef.id } }
    } else {
      // 新規追加
      const docRef = await addDoc(problemsRef, {
        ...problemData,
        createdAt: new Date().toISOString()
      })
      return { success: true, data: { firestoreId: docRef.id } }
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
        firestoreId: doc.id,
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
