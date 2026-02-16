import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

// SAPIXテキストコレクションへの参照
const getUserSapixTextsCollection = (userId) => {
  return collection(db, 'users', userId, 'sapixTexts')
}

// テキスト一覧を取得
export const getSapixTexts = async (userId) => {
  try {
    const q = query(
      getUserSapixTextsCollection(userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    const texts = []
    snapshot.forEach((doc) => {
      texts.push({ ...doc.data(), firestoreId: doc.id })
    })
    return { success: true, data: texts }
  } catch (error) {
    console.error('Error getting sapix texts:', error)
    return { success: false, error: error.message, data: [] }
  }
}

// テキストを追加
export const addSapixText = async (userId, textData) => {
  try {
    const id = Date.now().toString()
    const docRef = doc(getUserSapixTextsCollection(userId), id)
    const data = {
      ...textData,
      id,
      createdAt: new Date().toISOString(),
    }
    await setDoc(docRef, data)
    return { success: true, data: { ...data, firestoreId: id } }
  } catch (error) {
    console.error('Error adding sapix text:', error)
    return { success: false, error: error.message }
  }
}

// テキストを更新
export const updateSapixText = async (userId, firestoreId, updates) => {
  try {
    const docRef = doc(getUserSapixTextsCollection(userId), firestoreId)
    await updateDoc(docRef, updates)
    return { success: true }
  } catch (error) {
    console.error('Error updating sapix text:', error)
    return { success: false, error: error.message }
  }
}

// テキストを削除
export const deleteSapixText = async (userId, firestoreId) => {
  try {
    const docRef = doc(getUserSapixTextsCollection(userId), firestoreId)
    await deleteDoc(docRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting sapix text:', error)
    return { success: false, error: error.message }
  }
}
