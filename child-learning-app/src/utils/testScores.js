// テスト成績管理（Firestore）

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
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
      testDate: scoreData.testDate || new Date().toISOString().split('T')[0],
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

      createdAt: new Date().toISOString(),
    }

    const docRef = await addDoc(scoresRef, newScore)

    return {
      success: true,
      data: { firestoreId: docRef.id, ...newScore }
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
        firestoreId: doc.id,
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
 * @param {string} firestoreId - FirestoreドキュメントID
 * @param {object} updates - 更新内容
 * @returns {Promise<object>} 結果
 */
export async function updateTestScore(userId, firestoreId, updates) {
  try {
    const scoreRef = doc(db, 'users', userId, 'testScores', firestoreId)
    await updateDoc(scoreRef, {
      ...updates,
      updatedAt: new Date().toISOString()
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
 * @param {string} firestoreId - FirestoreドキュメントID
 * @returns {Promise<object>} 結果
 */
export async function deleteTestScore(userId, firestoreId) {
  try {
    const scoreRef = doc(db, 'users', userId, 'testScores', firestoreId)
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
