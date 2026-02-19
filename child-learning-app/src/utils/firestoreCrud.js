/**
 * firestoreCrud - 汎用 Firestore CRUD ファクトリ
 *
 * 共通パターンを DRY にまとめ、レスポンス構造を統一する。
 * 全てのレスポンスは { success, data?, error? } 形式。
 * ドキュメント ID は一律 `id` プロパティで返す。
 */

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import { nowISO } from './dateUtils'

/**
 * @param {string} collectionName - サブコレクション名 (例: 'testScores')
 * @param {object} options
 * @param {string} [options.orderByField='createdAt'] - デフォルトのソートフィールド
 * @param {string} [options.orderDirection='desc']     - 'asc' | 'desc'
 * @param {function} [options.beforeAdd]               - (data) => transformedData  追加前変換
 * @param {function} [options.beforeUpdate]             - (updates) => transformedUpdates  更新前変換
 */
export function createFirestoreService(collectionName, options = {}) {
  const {
    orderByField = 'createdAt',
    orderDirection = 'desc',
    beforeAdd,
    beforeUpdate,
  } = options

  const getCollectionRef = (userId) =>
    collection(db, 'users', userId, collectionName)

  const getDocRef = (userId, docId) =>
    doc(db, 'users', userId, collectionName, docId)

  return {
    /**
     * ドキュメントを追加
     * @param {string} userId
     * @param {object} data
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async add(userId, data) {
      try {
        const docData = {
          ...(beforeAdd ? beforeAdd(data) : data),
          createdAt: nowISO(),
        }
        const docRef = await addDoc(getCollectionRef(userId), docData)
        return { success: true, data: { id: docRef.id, ...docData } }
      } catch (error) {
        console.error(`Error adding ${collectionName}:`, error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 全ドキュメントを取得
     * @param {string} userId
     * @returns {Promise<{success: boolean, data: Array, error?: string}>}
     */
    async getAll(userId) {
      try {
        const q = query(
          getCollectionRef(userId),
          orderBy(orderByField, orderDirection)
        )
        const snapshot = await getDocs(q)
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        return { success: true, data: items }
      } catch (error) {
        console.error(`Error getting ${collectionName}:`, error)
        return { success: false, error: error.message, data: [] }
      }
    },

    /**
     * ドキュメントを更新
     * @param {string} userId
     * @param {string} docId
     * @param {object} updates
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async update(userId, docId, updates) {
      try {
        const docRef = getDocRef(userId, docId)
        const data = {
          ...(beforeUpdate ? beforeUpdate(updates) : updates),
          updatedAt: nowISO(),
        }
        await updateDoc(docRef, data)
        return { success: true }
      } catch (error) {
        console.error(`Error updating ${collectionName}:`, error)
        return { success: false, error: error.message }
      }
    },

    /**
     * ドキュメントを削除
     * @param {string} userId
     * @param {string} docId
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async remove(userId, docId) {
      try {
        await deleteDoc(getDocRef(userId, docId))
        return { success: true }
      } catch (error) {
        console.error(`Error deleting ${collectionName}:`, error)
        return { success: false, error: error.message }
      }
    },

    /** コレクション参照を取得（カスタムクエリ用） */
    getCollectionRef,
    /** ドキュメント参照を取得（カスタム操作用） */
    getDocRef,
  }
}
