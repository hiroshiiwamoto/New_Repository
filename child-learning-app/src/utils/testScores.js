// テスト成績管理（Firestore）

import { getTodayString, nowISO } from './dateUtils'
import { getProblemsBySource, deleteProblemsBySource } from './problems'
import { deleteLessonLogsBySource } from './lessonLogs'
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

    // 成績セクションのフィールドを保存用に整形（空文字はnullに変換）
    const saveSection = (section) => {
      if (!section) return {}
      const result = {}
      for (const [key, val] of Object.entries(section)) {
        result[key] = val === '' ? null : val
      }
      return result
    }

    const newScore = {
      testName: scoreData.testName || '',
      testDate: scoreData.testDate || getTodayString(),
      grade: scoreData.grade || '',

      // 4科目合計・2科目合計
      fourSubjects: saveSection(scoreData.fourSubjects),
      fourSubjectsGender: saveSection(scoreData.fourSubjectsGender),
      twoSubjects: saveSection(scoreData.twoSubjects),
      twoSubjectsGender: saveSection(scoreData.twoSubjectsGender),

      // 科目別
      sansu: saveSection(scoreData.sansu),
      kokugo: saveSection(scoreData.kokugo),
      rika: saveSection(scoreData.rika),
      shakai: saveSection(scoreData.shakai),

      // 科目別（男女別）
      sansuGender: saveSection(scoreData.sansuGender),
      kokugoGender: saveSection(scoreData.kokugoGender),
      rikaGender: saveSection(scoreData.rikaGender),
      shakaiGender: saveSection(scoreData.shakaiGender),

      // 設問内容別
      questionBreakdown: scoreData.questionBreakdown || {},

      // コース・クラス
      course: scoreData.course || '',
      className: scoreData.className || '',

      // メモ
      notes: scoreData.notes || '',

      // 成績表PDF
      pdfUrl: scoreData.pdfUrl || '',
      pdfFileName: scoreData.pdfFileName || '',

      // 紐付けPDF
      pdfDocumentId: scoreData.pdfDocumentId || null,

      // 科目別PDF（問題用紙）
      subjectPdfs: scoreData.subjectPdfs || {},

      // 科目別PDF（採点後答案）
      answerSheetPdfs: scoreData.answerSheetPdfs || {},

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
 * テスト成績を削除（紐づく problems / lessonLogs も連鎖削除）
 * @param {string} userId - ユーザーID
 * @param {string} id - FirestoreドキュメントID
 * @returns {Promise<object>} 結果
 */
export async function deleteTestScore(userId, id) {
  try {
    // 子データを先に削除してから親の testScore を削除する
    await deleteProblemsBySource(userId, 'test', id)
    await deleteLessonLogsBySource(userId, 'test', id)

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
