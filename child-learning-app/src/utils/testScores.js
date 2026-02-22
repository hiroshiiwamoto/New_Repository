// テスト成績管理（Firestore）

import { getTodayString, nowISO } from './dateUtils'
import { getProblemsBySource } from './problems'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * テスト成績を追加
 * @param {string} userId - ユーザーID
 * @param {object} scoreData - 成績データ
 * @returns {Promise<object>} 結果
 */
export async function addTestScore(userId, scoreData) {
  try {
    const scoresRef = collection(db, 'users', userId, 'testScores')

    const newScore = {
      testName: scoreData.testName || '',
      testDate: scoreData.testDate || getTodayString(),
      grade: scoreData.grade || '',

      // 科目別得点
      scores: {
        kokugo: scoreData.scores?.kokugo || null,
        sansu: scoreData.scores?.sansu || null,
        rika: scoreData.scores?.rika || null,
        shakai: scoreData.scores?.shakai || null,
      },

      // 科目別満点
      maxScores: {
        kokugo: scoreData.maxScores?.kokugo || null,
        sansu: scoreData.maxScores?.sansu || null,
        rika: scoreData.maxScores?.rika || null,
        shakai: scoreData.maxScores?.shakai || null,
      },

      // 2科目
      twoSubjects: {
        score: scoreData.twoSubjects?.score || null,
        maxScore: scoreData.twoSubjects?.maxScore || null,
        deviation: scoreData.twoSubjects?.deviation || null,
        rank: scoreData.twoSubjects?.rank || null,
        totalStudents: scoreData.twoSubjects?.totalStudents || null,
      },

      // 4科目
      fourSubjects: {
        score: scoreData.fourSubjects?.score || null,
        maxScore: scoreData.fourSubjects?.maxScore || null,
        deviation: scoreData.fourSubjects?.deviation || null,
        rank: scoreData.fourSubjects?.rank || null,
        totalStudents: scoreData.fourSubjects?.totalStudents || null,
      },

      // 科目別偏差値
      deviations: {
        kokugo: scoreData.deviations?.kokugo || null,
        sansu: scoreData.deviations?.sansu || null,
        rika: scoreData.deviations?.rika || null,
        shakai: scoreData.deviations?.shakai || null,
      },

      // コース・クラス
      course: scoreData.course || '',
      className: scoreData.className || '',

      // メモ
      notes: scoreData.notes || '',

      // 紐付けPDF
      pdfDocumentId: scoreData.pdfDocumentId || null,

      // 科目別PDF（問題用紙）
      subjectPdfs: scoreData.subjectPdfs || {},

      // ライフサイクル状態（'scheduled' | 'completed'）
      status: scoreData.status || 'completed',

      // テスト範囲（SAPIX カリキュラムコード）
      sapixRange: scoreData.sapixRange || {},

      // カバーされるマスター単元ID（sapixRange から自動計算）
      coveredUnitIds: scoreData.coveredUnitIds || [],

      createdAt: nowISO(),
    }

    const docRef = await addDoc(scoresRef, newScore)

    return {
      success: true,
      data: { id: docRef.id, ...newScore }
    }
  } catch (error) {
    console.error('Error adding test score:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 全てのテスト成績を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>} 結果
 */
export async function getAllTestScores(userId) {
  try {
    const scoresRef = collection(db, 'users', userId, 'testScores')
    const q = query(scoresRef, orderBy('testDate', 'desc'))
    const querySnapshot = await getDocs(q)

    const scores = []
    querySnapshot.forEach((doc) => {
      scores.push({
        id: doc.id,
        ...doc.data()
      })
    })

    return {
      success: true,
      data: scores
    }
  } catch (error) {
    console.error('Error getting test scores:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

/**
 * テスト成績を更新
 * @param {string} userId - ユーザーID
 * @param {string} id - FirestoreドキュメントID
 * @param {object} updates - 更新内容
 * @returns {Promise<object>} 結果
 */
export async function updateTestScore(userId, id, updates) {
  try {
    const scoreRef = doc(db, 'users', userId, 'testScores', id)
    await updateDoc(scoreRef, {
      ...updates,
      updatedAt: nowISO()
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating test score:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * テスト成績を削除
 * @param {string} userId - ユーザーID
 * @param {string} id - FirestoreドキュメントID
 * @returns {Promise<object>} 結果
 */
export async function deleteTestScore(userId, id) {
  try {
    const scoreRef = doc(db, 'users', userId, 'testScores', id)
    await deleteDoc(scoreRef)

    return { success: true }
  } catch (error) {
    console.error('Error deleting test score:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * テストスコアに紐づく問題を取得
 *
 * @param {string} userId
 * @param {object} score - testScore ドキュメント
 * @returns {Promise<Array>}
 */
export async function getProblemsForTestScore(userId, score) {
  const result = await getProblemsBySource(userId, 'test', score.id)
  return result.success ? result.data : []
}

/**
 * テスト名の一覧
 */
export const testTypes = [
  '実力診断サピックスオープン',
  '志望校診断サピックスオープン',
  '志望校判定サピックスオープン',
  '合格力判定サピックスオープン',
  '学校別サピックスオープン',
  '組分けテスト',
  'マンスリー確認テスト',
  'マンスリー実力テスト',
  '確認テスト',
  '復習テスト',
  'その他オープン',
]

/**
 * テスト成績をリアルタイム購読
 * @param {string} userId
 * @param {Function} callback - (scores: Array) => void
 * @returns {Function} unsubscribe
 */
export function subscribeTestScores(userId, callback) {
  const q = query(
    collection(db, 'users', userId, 'testScores'),
    orderBy('testDate', 'desc')
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const scores = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      callback(scores)
    },
    (error) => {
      console.error('Error subscribing testScores:', error)
      callback([])
    }
  )
}
