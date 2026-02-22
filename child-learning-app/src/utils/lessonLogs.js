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
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { MS_PER_DAY } from './dateUtils'
import { HALF_LIFE_DAYS } from './constants'

// ========================================
// 評価スコア定数
// ========================================

/** 🔵/🟡/🔴 ボタンに対応するスコア値 */
export const EVALUATION_SCORES = {
  blue: 90,   // 🔵 よくできた
  yellow: 65, // 🟡 まあまあ
  red: 30,    // 🔴 むずかしかった
}

export const EVALUATION_LABELS = {
  blue: '🔵 よくできた',
  yellow: '🟡 まあまあ',
  red: '🔴 むずかしかった',
}

export const EVALUATION_COLORS = {
  blue: '#2563eb',
  yellow: '#ca8a04',
  red: '#dc2626',
}

// ========================================
// lessonLogs CRUD
// ========================================

/**
 * lessonLog を追加し、関連する masterUnitStats を更新
 * @param {string} userId
 * @param {Object} data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function addLessonLogWithStats(userId, data) {
  try {
    const unitIds = data.unitIds || []
    const mainUnitId = unitIds[0] || null  // 最初のタグ = メイン単元

    const docData = {
      unitIds,
      mainUnitId,                               // NEW: メイン単元ID（習熟度スコアの対象）
      subject: data.subject || null,            // 科目（算数・国語・理科・社会）
      sourceType: data.sourceType || 'practice',
      sourceId: data.sourceId || null,
      sourceName: data.sourceName || '',
      date: data.date || serverTimestamp(),
      performance: data.performance ?? 0,
      evaluationKey: data.evaluationKey || null, // 'blue' | 'yellow' | 'red'
      missType: data.missType || null,           // NEW: 'understanding' | 'careless' | 'not_studied' | null
      problemIds: data.problemIds || [],         // 紐づく problems ドキュメント ID 一覧
      timeSpent: data.timeSpent || null,
      notes: data.notes || '',
      grade: data.grade || null,
      createdAt: serverTimestamp(),
    }

    const ref = await addDoc(
      collection(db, 'users', userId, 'lessonLogs'),
      docData
    )

    // メイン単元のスタッツのみ更新（サブ単元は影響なし）
    if (mainUnitId) {
      await updateMasterUnitStats(userId, mainUnitId)
    }

    return { success: true, data: { id: ref.id, ...docData } }
  } catch (error) {
    console.error('lessonLog 追加エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * ユーザーの全 lessonLog を取得
 */
export async function getLessonLogs(userId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'lessonLogs')
      // orderBy は Firestore インデックスを要求するため除去。クライアント側でソートする
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? new Date(a.createdAt ?? 0).getTime()
        const tb = b.createdAt?.toMillis?.() ?? new Date(b.createdAt ?? 0).getTime()
        return tb - ta
      })
    return { success: true, data }
  } catch (error) {
    console.error('lessonLog 取得エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 特定の単元に紐づく lessonLog を取得
 */
export async function getLessonLogsByUnit(userId, unitId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'lessonLogs'),
      where('unitIds', 'array-contains', unitId)
      // orderBy は複合インデックスが必要なため除去。呼び出し側でソートする
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? new Date(a.createdAt ?? 0).getTime()
        const tb = b.createdAt?.toMillis?.() ?? new Date(b.createdAt ?? 0).getTime()
        return tb - ta
      })
    return { success: true, data }
  } catch (error) {
    console.error('lessonLog (単元別) 取得エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * lessonLog を削除し、関連する masterUnitStats を更新
 */
export async function deleteLessonLog(userId, logId, unitIds = []) {
  try {
    await deleteDoc(doc(db, 'users', userId, 'lessonLogs', logId))
    await Promise.all(unitIds.map(unitId => updateMasterUnitStats(userId, unitId)))
    return { success: true }
  } catch (error) {
    console.error('lessonLog 削除エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * sourceType + sourceId に紐づく lessonLog をすべて削除し、masterUnitStats を再計算
 * （テキスト・テスト削除時に呼ぶ）
 */
export async function deleteLessonLogsBySource(userId, sourceType, sourceId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'lessonLogs'),
      where('sourceType', '==', sourceType),
      where('sourceId', '==', sourceId)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return { success: true, deletedCount: 0 }

    // 影響を受ける unitIds を収集（masterUnitStats 再計算用）
    const affectedUnitIds = new Set()
    for (const d of snapshot.docs) {
      for (const id of (d.data().unitIds || [])) {
        affectedUnitIds.add(id)
      }
    }

    // Firestore batch は最大500件なので分割
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      const batch = writeBatch(db)
      snapshot.docs.slice(i, i + 500).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }

    // 影響を受けた全 unitIds の masterUnitStats を再計算
    await Promise.all(
      [...affectedUnitIds].map(id => updateMasterUnitStats(userId, id))
    )

    return { success: true, deletedCount: snapshot.docs.length }
  } catch (error) {
    console.error('lessonLog (ソース別) 削除エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * lessonLogs と masterUnitStats を全削除（弱点マップのリセット）
 */
export async function resetAllLessonData(userId) {
  try {
    const logsSnap = await getDocs(collection(db, 'users', userId, 'lessonLogs'))
    const statsSnap = await getDocs(collection(db, 'users', userId, 'masterUnitStats'))

    // Firestore batch は最大500件なので分割
    const allDocs = [...logsSnap.docs, ...statsSnap.docs]
    for (let i = 0; i < allDocs.length; i += 500) {
      const batch = writeBatch(db)
      allDocs.slice(i, i + 500).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }

    return { success: true, deletedCount: allDocs.length }
  } catch (error) {
    console.error('弱点マップリセットエラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 特定単元の lessonLogs と masterUnitStats を削除（単元単位のリセット）
 */
export async function resetUnitLessonData(userId, unitId) {
  try {
    // unitIds に unitId を含む lessonLogs を取得
    const q = query(
      collection(db, 'users', userId, 'lessonLogs'),
      where('unitIds', 'array-contains', unitId)
    )
    const logsSnap = await getDocs(q)

    // 削除対象ログに含まれる他の unitIds を収集（stats 再計算用）
    const affectedUnitIds = new Set()
    for (const d of logsSnap.docs) {
      const data = d.data()
      for (const id of (data.unitIds || [])) {
        if (id !== unitId) affectedUnitIds.add(id)
      }
    }

    // lessonLogs を batch 削除
    const docsToDelete = logsSnap.docs
    for (let i = 0; i < docsToDelete.length; i += 500) {
      const batch = writeBatch(db)
      docsToDelete.slice(i, i + 500).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }

    // 対象単元の masterUnitStats を削除
    await deleteDoc(doc(db, 'users', userId, 'masterUnitStats', unitId))

    // 影響を受けた他の単元の stats を再計算
    await Promise.all(
      [...affectedUnitIds].map(id => updateMasterUnitStats(userId, id))
    )

    return { success: true, deletedCount: docsToDelete.length }
  } catch (error) {
    console.error(`単元リセットエラー (${unitId}):`, error)
    return { success: false, error: error.message }
  }
}

// ========================================
// masterUnitStats CRUD
// ========================================

/**
 * ユーザーの全 masterUnitStats を取得
 */
export async function getMasterUnitStats(userId) {
  try {
    const snapshot = await getDocs(
      collection(db, 'users', userId, 'masterUnitStats')
    )
    const data = {}
    snapshot.docs.forEach(d => {
      data[d.id] = d.data()
    })
    return { success: true, data }
  } catch (error) {
    console.error('masterUnitStats 取得エラー:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 特定単元の masterUnitStats を更新（lessonLogs から再計算）
 */
export async function updateMasterUnitStats(userId, unitId) {
  try {
    // その単元に紐づく全 lessonLog を取得
    const result = await getLessonLogsByUnit(userId, unitId)
    const logs = result.success ? result.data : []

    const score = computeProficiencyScore(logs)
    const profLevel = getProficiencyLevel(score)

    const statsData = {
      currentScore: Math.max(0, score),
      statusLevel: profLevel.level,
      logCount: logs.length,
      lastUpdated: serverTimestamp(),
    }

    await setDoc(
      doc(db, 'users', userId, 'masterUnitStats', unitId),
      statsData,
      { merge: true }
    )
  } catch (error) {
    console.error(`masterUnitStats 更新エラー (${unitId}):`, error)
  }
}

// ========================================
// 習熟度計算ロジック（時間減衰加重平均）
// ========================================

const LAMBDA = Math.LN2 / HALF_LIFE_DAYS

/**
 * 時間減衰係数を計算
 * w_i = exp(-ln(2)/90 × daysSince_i)
 */
function getDecayWeight(date) {
  if (!date) return 1
  const studyDate = date?.toDate ? date.toDate() : new Date(date)
  const daysSince = (Date.now() - studyDate.getTime()) / MS_PER_DAY
  return Math.exp(-LAMBDA * Math.max(0, daysSince))
}

/**
 * 習熟度スコアを計算
 * score = Σ(performance_i × w_i) / Σ(w_i)
 * @param {Array} logs - lessonLogs
 * @returns {number} - 0〜100 or -1（データなし）
 */
export function computeProficiencyScore(logs) {
  if (logs.length === 0) return -1

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
 * 習熟度スコアから習熟度レベルを取得（6段階）
 */
export function getProficiencyLevel(score) {
  if (score < 0) return { level: 0, label: '未学習', color: '#d1d5db', bgColor: '#f9fafb' }
  if (score >= 90) return { level: 5, label: '得意',   color: '#16a34a', bgColor: '#dcfce7' }
  if (score >= 75) return { level: 4, label: '良好',   color: '#2563eb', bgColor: '#dbeafe' }
  if (score >= 60) return { level: 3, label: '普通',   color: '#ca8a04', bgColor: '#fef9c3' }
  if (score >= 40) return { level: 2, label: '要復習', color: '#ea580c', bgColor: '#ffedd5' }
  return              { level: 1, label: '苦手',   color: '#dc2626', bgColor: '#fee2e2' }
}

/**
 * 全単元の習熟度マップを lessonLogs から計算（ダッシュボード表示用）
 *
 * メイン単元（mainUnitId = unitIds[0]）のみ習熟度スコアに影響する。
 * サブ単元（2番目以降の unitIds）は登場回数（indirectCount）として記録するのみ。
 */
export function computeAllProficiencies(allLogs) {
  // メイン単元ごとにログを集める
  const mainLogsByUnit = {}
  // サブ単元として登場した回数
  const subCountByUnit = {}

  for (const log of allLogs) {
    const mainId = log.mainUnitId || (log.unitIds || [])[0] || null
    if (mainId) {
      if (!mainLogsByUnit[mainId]) mainLogsByUnit[mainId] = []
      mainLogsByUnit[mainId].push(log)
    }
    // サブ単元（メイン以外）の登場回数をカウント
    for (const id of (log.unitIds || [])) {
      if (id !== mainId) subCountByUnit[id] = (subCountByUnit[id] || 0) + 1
    }
  }

  const result = {}

  // メイン単元：習熟度スコアを計算
  for (const [unitId, logs] of Object.entries(mainLogsByUnit)) {
    const score = computeProficiencyScore(logs)
    const profLevel = getProficiencyLevel(score)
    result[unitId] = {
      score,
      ...profLevel,
      logCount: logs.length,
      directCount: logs.length,    // メイン単元として評価された回数
      indirectCount: 0,
      lastStudied: logs[0]?.date || logs[0]?.createdAt || null,
    }
  }

  // サブ単元：登場回数を追記
  for (const [unitId, count] of Object.entries(subCountByUnit)) {
    if (!result[unitId]) {
      result[unitId] = {
        score: -1,
        ...getProficiencyLevel(-1),
        logCount: 0,
        directCount: 0,
        lastStudied: null,
      }
    }
    result[unitId].indirectCount = (result[unitId].indirectCount || 0) + count
  }

  return result
}
