// 過去問学習セッション管理（Firestore）

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

/**
 * 過去問の学習セッションを追加
 * @param {string} userId - ユーザーID
 * @param {string} taskId - タスクID（過去問タスク）
 * @param {object} sessionData - セッションデータ
 * @returns {Promise<object>} 結果
 */
export async function addPastPaperSession(userId, taskId, sessionData) {
  try {
    const sessionsRef = collection(db, 'users', userId, 'pastPaperSessions')

    const newSession = {
      taskId,
      studiedAt: sessionData.studiedAt || new Date().toISOString(),
      attemptNumber: sessionData.attemptNumber || 1,
      score: sessionData.score || null,
      totalScore: sessionData.totalScore || null,
      timeSpent: sessionData.timeSpent || null, // 分
      notes: sessionData.notes || '',
      createdAt: new Date().toISOString(),
    }

    const docRef = await addDoc(sessionsRef, newSession)

    return {
      success: true,
      data: { firestoreId: docRef.id, ...newSession }
    }
  } catch (error) {
    console.error('Error adding past paper session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 特定タスクの学習セッション一覧を取得
 * @param {string} userId - ユーザーID
 * @param {string} taskId - タスクID
 * @returns {Promise<object>} 結果
 */
export async function getSessionsByTaskId(userId, taskId) {
  try {
    const sessionsRef = collection(db, 'users', userId, 'pastPaperSessions')
    const q = query(
      sessionsRef,
      where('taskId', '==', taskId),
      orderBy('studiedAt', 'asc')
    )
    const querySnapshot = await getDocs(q)

    const sessions = []
    querySnapshot.forEach((doc) => {
      sessions.push({
        firestoreId: doc.id,
        ...doc.data()
      })
    })

    return {
      success: true,
      data: sessions
    }
  } catch (error) {
    console.error('Error getting sessions:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

/**
 * 全ての学習セッションを取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>} 結果
 */
export async function getAllSessions(userId) {
  try {
    const sessionsRef = collection(db, 'users', userId, 'pastPaperSessions')
    const q = query(sessionsRef, orderBy('studiedAt', 'desc'))
    const querySnapshot = await getDocs(q)

    const sessions = []
    querySnapshot.forEach((doc) => {
      sessions.push({
        firestoreId: doc.id,
        ...doc.data()
      })
    })

    return {
      success: true,
      data: sessions
    }
  } catch (error) {
    console.error('Error getting all sessions:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

/**
 * 学習セッションを更新
 * @param {string} userId - ユーザーID
 * @param {string} firestoreId - FirestoreドキュメントID
 * @param {object} updates - 更新内容
 * @returns {Promise<object>} 結果
 */
export async function updateSession(userId, firestoreId, updates) {
  try {
    const sessionRef = doc(db, 'users', userId, 'pastPaperSessions', firestoreId)
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 学習セッションを削除
 * @param {string} userId - ユーザーID
 * @param {string} firestoreId - FirestoreドキュメントID
 * @returns {Promise<object>} 結果
 */
export async function deleteSession(userId, firestoreId) {
  try {
    const sessionRef = doc(db, 'users', userId, 'pastPaperSessions', firestoreId)
    await deleteDoc(sessionRef)

    return { success: true }
  } catch (error) {
    console.error('Error deleting session:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * タスクの最新の試行回数を取得
 * @param {string} userId - ユーザーID
 * @param {string} taskId - タスクID
 * @returns {Promise<number>} 次の試行回数
 */
export async function getNextAttemptNumber(userId, taskId) {
  try {
    const result = await getSessionsByTaskId(userId, taskId)
    if (result.success && result.data.length > 0) {
      const maxAttempt = Math.max(...result.data.map(s => s.attemptNumber || 1))
      return maxAttempt + 1
    }
    return 1
  } catch (error) {
    console.error('Error getting next attempt number:', error)
    return 1
  }
}
