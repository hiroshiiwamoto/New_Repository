// SAPIXテキスト管理（Firestore）

import { createFirestoreService } from './firestoreCrud'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const service = createFirestoreService('sapixTexts', {
  orderByField: 'createdAt',
  orderDirection: 'desc',
})

// テキスト一覧を取得
export const getSapixTexts = (userId) =>
  service.getAll(userId)

// テキストを追加（カスタムID使用）
export const addSapixText = async (userId, textData) => {
  try {
    const id = Date.now().toString()
    const ref = doc(collection(db, 'users', userId, 'sapixTexts'), id)
    const data = {
      ...textData,
      id,
      createdAt: new Date().toISOString(),
    }
    await setDoc(ref, data)
    return { success: true, data: { ...data, id } }
  } catch (error) {
    console.error('Error adding sapix text:', error)
    return { success: false, error: error.message }
  }
}

// テキストを更新
export const updateSapixText = (userId, id, updates) =>
  service.update(userId, id, updates)

// テキストを削除
export const deleteSapixText = (userId, id) =>
  service.remove(userId, id)
