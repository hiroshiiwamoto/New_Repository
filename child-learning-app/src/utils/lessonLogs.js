/**
 * lessonLogs - 学習履歴の統合管理
 *
 * sapixTask / pastPaper / practice のすべての学習記録を
 * masterUnits と紐付けて管理するコレクション
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * @typedef {Object} LessonLog
 * @property {string} id - ドキュメントID
 * @property {string[]} unitIds - 関連するマスター単元IDのリスト
 * @property {'sapixTask'|'pastPaper'|'practice'} sourceType - 学習の種類
 * @property {string} [sourceId] - 参照元ドキュメントID
 * @property {string} [sourceName] - 参照元の名称（表示用）
 * @property {Date|Timestamp} date - 学習日
 * @property {number} performance - 得点率 0-100
 * @property {boolean} [isCorrect] - 正解/不正解（practice用）
 * @property {number} [timeSpent] - 所要時間（秒）
 * @property {string} [notes] - メモ
 * @property {number} [grade] - 記録時の学年（4/5/6）
 * @property {Timestamp} createdAt
 */

/**
 * lessonLog を追加
 * @param {string} userId
 * @param {Object} data
 * @returns {Promise<{success: boolean, data?: LessonLog, error?: string}>}
 */
export async function addLessonLog(userId, data) {
  try {
    const docData = {
      unitIds: data.unitIds || [],
      sourceType: data.sourceType || 'practice',
      sourceId: data.sourceId || null,
      sourceName: data.sourceName || '',
      date: data.date || serverTimestamp(),
      performance: data.performance ?? 0,
      isCorrect: data.isCorrect ?? null,
      timeSpent: data.timeSpent || null,
      notes: data.notes || '',
      grade: data.grade || null,
      createdAt: serverTimestamp(),
    }

    const ref = await addDoc(
      collection(db, 'users', userId, 'lessonLogs'),
      docData
    )

    return { success: true, data: { id: ref.id, ...docData } }
  } catch (error) {
    console.error('lessonLog 追加エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * ユーザーの全 lessonLog を取得
 * @param {string} userId
 * @returns {Promise<{success: boolean, data?: LessonLog[], error?: string}>}
 */
export async function getLessonLogs(userId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'lessonLogs'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('lessonLog 取得エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 特定の単元に紐づく lessonLog を取得
 * @param {string} userId
 * @param {string} unitId
 * @returns {Promise<{success: boolean, data?: LessonLog[], error?: string}>}
 */
export async function getLessonLogsByUnit(userId, unitId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'lessonLogs'),
      where('unitIds', 'array-contains', unitId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('lessonLog (単元別) 取得エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * lessonLog を更新
 * @param {string} userId
 * @param {string} logId
 * @param {Object} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateLessonLog(userId, logId, updates) {
  try {
    const ref = doc(db, 'users', userId, 'lessonLogs', logId)
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
    return { success: true }
  } catch (error) {
    console.error('lessonLog 更新エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * lessonLog を削除
 * @param {string} userId
 * @param {string} logId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLessonLog(userId, logId) {
  try {
    const ref = doc(db, 'users', userId, 'lessonLogs', logId)
    await deleteDoc(ref)
    return { success: true }
  } catch (error) {
    console.error('lessonLog 削除エラー:', error)
    return { success: false, error: error.message }
  }
}

// ========================================
// 習熟度計算ロジック
// ========================================

const HALF_LIFE_DAYS = 90
const LAMBDA = Math.LN2 / HALF_LIFE_DAYS

/**
 * 時間減衰係数を計算
 * @param {Date|Timestamp} date - 学習日
 * @returns {number} - 0.0〜1.0 の減衰係数
 */
function getDecayWeight(date) {
  const studyDate = date?.toDate ? date.toDate() : new Date(date)
  const daysSince = (Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24)
  return Math.exp(-LAMBDA * Math.max(0, daysSince))
}

/**
 * 単元の習熟度スコアを計算（0〜100）
 * @param {LessonLog[]} logs - 単元に紐づくログ
 * @returns {number} - 習熟度スコア 0-100
 */
export function computeProficiencyScore(logs) {
  if (logs.length === 0) return -1 // データなし

  let weightedSum = 0
  let totalWeight = 0

  for (const log of logs) {
    const weight = getDecayWeight(log.date || log.createdAt)
    const perf = log.performance ?? (log.isCorrect === true ? 100 : log.isCorrect === false ? 0 : 50)

    weightedSum += perf * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return -1
  return Math.round(weightedSum / totalWeight)
}

/**
 * 習熟度スコアから習熟度レベルを取得
 * @param {number} score - 習熟度スコア (-1 〜 100)
 * @returns {{ level: number, label: string, color: string }}
 */
export function getProficiencyLevel(score) {
  if (score < 0) return { level: 0, label: '未学習', color: '#d1d5db' }
  if (score >= 90) return { level: 5, label: '得意', color: '#16a34a' }
  if (score >= 75) return { level: 4, label: '良好', color: '#2563eb' }
  if (score >= 60) return { level: 3, label: '普通', color: '#ca8a04' }
  if (score >= 40) return { level: 2, label: '要復習', color: '#ea580c' }
  return { level: 1, label: '苦手', color: '#dc2626' }
}

/**
 * 全マスター単元の習熟度マップを計算
 * @param {LessonLog[]} allLogs - ユーザーの全 lessonLog
 * @returns {Object} - { unitId: { score, level, label, color, logCount } }
 */
export function computeAllProficiencies(allLogs) {
  // 単元IDごとにログをグループ化
  const logsByUnit = {}
  for (const log of allLogs) {
    for (const unitId of (log.unitIds || [])) {
      if (!logsByUnit[unitId]) logsByUnit[unitId] = []
      logsByUnit[unitId].push(log)
    }
  }

  // 各単元の習熟度を計算
  const result = {}
  for (const [unitId, logs] of Object.entries(logsByUnit)) {
    const score = computeProficiencyScore(logs)
    const profLevel = getProficiencyLevel(score)
    result[unitId] = {
      score,
      ...profLevel,
      logCount: logs.length,
      lastStudied: logs[0]?.date || logs[0]?.createdAt || null,
    }
  }

  return result
}
