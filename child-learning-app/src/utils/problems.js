// 問題ライブラリ管理（Firestore: users/{userId}/problems）
//
// sourceType ごとの用途:
//   'pastPaper' - 過去問タスクから切り抜いた問題（sourceId = taskId）
//   'test'      - テスト用紙から切り抜いた問題（sourceId = testScoreId）
//   'textbook'  - 教材から切り抜いた問題（sourceId = lessonLogId）

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * 問題を追加
 * @param {string} userId
 * @param {object} problemData
 * @param {string} problemData.sourceType - 'pastPaper' | 'test' | 'textbook'
 * @param {string} problemData.sourceId   - taskId / testScoreId / lessonLogId
 * @param {string} problemData.subject
 * @param {string} problemData.problemNumber
 * @param {string[]} problemData.unitIds
 * @param {boolean} problemData.isCorrect
 * @param {string|null} problemData.missType - 'understanding'|'careless'|'not_studied'|null
 * @param {number|null} problemData.difficulty - 1〜5（過去問のみ）
 * @param {string[]}    problemData.imageUrls - 問題画像URL配列
 * @param {string|null} problemData.schoolName - 過去問のみ
 * @param {string|null} problemData.year       - 過去問のみ
 * @param {number|null} problemData.correctRate - テストのみ（全体正答率 %）
 * @param {number|null} problemData.points      - テストのみ
 */
export async function addProblem(userId, problemData) {
  try {
    const ref = collection(db, 'users', userId, 'problems')
    const doc_ = {
      sourceType: problemData.sourceType,
      sourceId: problemData.sourceId,
      subject: problemData.subject || '',
      problemNumber: problemData.problemNumber || '',
      unitIds: problemData.unitIds || [],
      isCorrect: problemData.isCorrect ?? false,
      missType: problemData.isCorrect ? null : (problemData.missType || 'understanding'),
      reviewStatus: 'pending',
      difficulty: problemData.difficulty || null,
      imageUrls: problemData.imageUrls?.length ? problemData.imageUrls : [],
      // 過去問メタデータ
      schoolName: problemData.schoolName || null,
      year: problemData.year || null,
      // テストメタデータ
      correctRate: problemData.correctRate ?? null,
      points: problemData.points ?? null,
      createdAt: serverTimestamp(),
    }
    const docRef = await addDoc(ref, doc_)
    return { success: true, data: { id: docRef.id, ...doc_ } }
  } catch (error) {
    console.error('Error adding problem:', error)
    return { success: false, error: error.message }
  }
}

/**
 * sourceType + sourceId に紐づく問題一覧を取得
 * @param {string} userId
 * @param {string} sourceType - 'pastPaper' | 'test' | 'textbook'
 * @param {string} sourceId
 */
export async function getProblemsBySource(userId, sourceType, sourceId) {
  try {
    const ref = collection(db, 'users', userId, 'problems')
    const q = query(
      ref,
      where('sourceType', '==', sourceType),
      where('sourceId', '==', sourceId),
      orderBy('createdAt', 'asc')
    )
    const snapshot = await getDocs(q)
    const problems = []
    snapshot.forEach(d => {
      problems.push({ id: d.id, ...d.data() })
    })
    return { success: true, data: problems }
  } catch (error) {
    console.error('Error getting problems:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * 問題を更新（reviewStatus・missType 等）
 * @param {string} userId
 * @param {string} problemId - Firestore ドキュメント ID
 * @param {object} updates
 */
export async function updateProblem(userId, problemId, updates) {
  try {
    const ref = doc(db, 'users', userId, 'problems', problemId)
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
    return { success: true }
  } catch (error) {
    console.error('Error updating problem:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 問題を削除
 * @param {string} userId
 * @param {string} problemId - Firestore ドキュメント ID
 */
export async function deleteProblem(userId, problemId) {
  try {
    const ref = doc(db, 'users', userId, 'problems', problemId)
    await deleteDoc(ref)
    return { success: true }
  } catch (error) {
    console.error('Error deleting problem:', error)
    return { success: false, error: error.message }
  }
}

/**
 * sourceType + sourceId に紐づく問題をすべて削除
 * （タスクや単元ログ削除時に呼ぶ）
 * @param {string} userId
 * @param {string} sourceType
 * @param {string} sourceId
 */
export async function deleteProblemsBySource(userId, sourceType, sourceId) {
  try {
    const result = await getProblemsBySource(userId, sourceType, sourceId)
    if (!result.success) return result
    await Promise.all(
      result.data.map(p => deleteProblem(userId, p.id))
    )
    return { success: true, deletedCount: result.data.length }
  } catch (error) {
    console.error('Error deleting problems by source:', error)
    return { success: false, error: error.message }
  }
}

// ─── ヘルパー ───────────────────────────────────────────

/** reviewStatus の表示情報 */
export function reviewStatusInfo(status) {
  if (status === 'done')  return { label: '解き直し済', color: '#16a34a', bg: '#dcfce7' }
  if (status === 'retry') return { label: '要再挑戦',   color: '#dc2626', bg: '#fee2e2' }
  return                         { label: '未完了',     color: '#64748b', bg: '#f1f5f9' }
}

/** missType の日本語ラベル */
export function missTypeLabel(type) {
  if (type === 'understanding') return '理解不足'
  if (type === 'careless')      return 'ケアレス'
  if (type === 'not_studied')   return '未習'
  return ''
}
