/**
 * 弱点分析システム - Firestore CRUD API
 *
 * Firestoreとやり取りするためのユーティリティ関数集
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ========================================
// 型定義（JSDoc）
// ========================================

/**
 * @typedef {Object} MasterUnit
 * @property {string} id - 単元コードID (例: CALC_BASIC)
 * @property {string} name - 単元名
 * @property {string} category - カテゴリ
 * @property {number} [difficultyLevel] - 難易度 (1-5)
 * @property {string} [description] - 説明
 * @property {string[]} [learningResources] - 学習リソースURL
 * @property {number} orderIndex - 表示順序
 * @property {boolean} isActive - 有効/無効
 * @property {Timestamp} createdAt - 作成日時
 * @property {Timestamp} updatedAt - 更新日時
 */

/**
 * @typedef {Object} Problem
 * @property {string} id - 問題ID
 * @property {string} schoolName - 学校名
 * @property {number} examYear - 入試年度
 * @property {string} problemNumber - 問題番号
 * @property {number} difficulty - 難易度 (1-5)
 * @property {number} [estimatedTime] - 想定解答時間（分）
 * @property {string} [questionText] - 問題文
 * @property {string} [answer] - 解答
 * @property {string} [solution] - 解説
 * @property {string} [imageUrl] - 問題画像URL
 * @property {string} [sourceUrl] - 出典URL
 * @property {Timestamp} createdAt - 作成日時
 * @property {Timestamp} updatedAt - 更新日時
 */

/**
 * @typedef {Object} AnswerHistory
 * @property {string} id - UUID
 * @property {string} userId - ユーザーID
 * @property {string} problemId - 問題ID
 * @property {boolean} isCorrect - 正解/不正解
 * @property {string} [userAnswer] - 生徒の解答
 * @property {number} [timeSpent] - 解答時間（秒）
 * @property {number} [confidenceLevel] - 自信度 (1-5)
 * @property {string} [notes] - メモ
 * @property {Timestamp} answeredAt - 解答日時
 * @property {Timestamp} createdAt - 作成日時
 */

/**
 * @typedef {Object} UserWeaknessScore
 * @property {string} id - UUID
 * @property {string} userId - ユーザーID
 * @property {string} unitId - 単元ID
 * @property {number} totalAttempts - 挑戦回数
 * @property {number} correctCount - 正解数
 * @property {number} accuracyRate - 正答率 (0.0-1.0)
 * @property {number} [avgTimeSpent] - 平均解答時間（秒）
 * @property {Timestamp} [lastAttemptedAt] - 最終挑戦日時
 * @property {number} weaknessLevel - 弱点レベル (0-5)
 * @property {Timestamp} createdAt - 作成日時
 * @property {Timestamp} updatedAt - 更新日時
 */

// ========================================
// 1. 単元マスタ
// ========================================

/**
 * すべての単元マスタを取得（カテゴリ・表示順でソート）
 * @returns {Promise<MasterUnit[]>}
 */
export async function getAllMasterUnits() {
  const q = query(
    collection(db, 'masterUnits'),
    where('isActive', '==', true),
    orderBy('orderIndex')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定カテゴリの単元マスタを取得
 * @param {string} category - カテゴリ名
 * @returns {Promise<MasterUnit[]>}
 */
export async function getMasterUnitsByCategory(category) {
  const q = query(
    collection(db, 'masterUnits'),
    where('category', '==', category),
    where('isActive', '==', true),
    orderBy('orderIndex')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定の単元マスタを取得
 * @param {string} unitId - 単元ID
 * @returns {Promise<MasterUnit|null>}
 */
export async function getMasterUnitById(unitId) {
  const docRef = doc(db, 'masterUnits', unitId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

/**
 * カテゴリ一覧を取得
 * @returns {Promise<string[]>}
 */
export async function getCategories() {
  const units = await getAllMasterUnits();
  const categories = [...new Set(units.map(unit => unit.category))];
  return categories.sort();
}

// ========================================
// 2. 過去問
// ========================================

/**
 * すべての過去問を取得
 * @param {Object} options - オプション
 * @param {number} [options.limit] - 取得件数上限
 * @returns {Promise<Problem[]>}
 */
export async function getAllProblems(options = {}) {
  let q = query(
    collection(db, 'problems'),
    orderBy('examYear', 'desc'),
    orderBy('schoolName')
  );

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定学校の過去問を取得
 * @param {string} schoolName - 学校名
 * @param {number} [year] - 年度（オプション）
 * @returns {Promise<Problem[]>}
 */
export async function getProblemsBySchool(schoolName, year = null) {
  let q = query(
    collection(db, 'problems'),
    where('schoolName', '==', schoolName)
  );

  if (year) {
    q = query(q, where('examYear', '==', year));
  }

  q = query(q, orderBy('examYear', 'desc'), orderBy('problemNumber'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定の過去問を取得
 * @param {string} problemId - 問題ID
 * @returns {Promise<Problem|null>}
 */
export async function getProblemById(problemId) {
  const docRef = doc(db, 'problems', problemId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

/**
 * 問題に関連する単元を取得
 * @param {string} problemId - 問題ID
 * @returns {Promise<Array<{unit: MasterUnit, relevanceScore: number}>>}
 */
export async function getProblemTags(problemId) {
  const q = query(
    collection(db, 'problemUnitTags'),
    where('problemId', '==', problemId),
    orderBy('relevanceScore', 'desc')
  );

  const snapshot = await getDocs(q);
  const unitPromises = snapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();
    const unit = await getMasterUnitById(data.unitId);
    return {
      unit,
      relevanceScore: data.relevanceScore
    };
  });

  return Promise.all(unitPromises);
}

// ========================================
// 3. 解答履歴
// ========================================

/**
 * 解答を記録
 * @param {Object} answerData - 解答データ
 * @param {string} answerData.userId - ユーザーID
 * @param {string} answerData.problemId - 問題ID
 * @param {boolean} answerData.isCorrect - 正解/不正解
 * @param {string} [answerData.userAnswer] - 生徒の解答
 * @param {number} [answerData.timeSpent] - 解答時間（秒）
 * @param {number} [answerData.confidenceLevel] - 自信度 (1-5)
 * @param {string} [answerData.notes] - メモ
 * @returns {Promise<string>} - 作成されたドキュメントID
 */
export async function submitAnswer(answerData) {
  const docData = {
    userId: answerData.userId,
    problemId: answerData.problemId,
    isCorrect: answerData.isCorrect,
    userAnswer: answerData.userAnswer || '',
    timeSpent: answerData.timeSpent || null,
    confidenceLevel: answerData.confidenceLevel || null,
    notes: answerData.notes || '',
    answeredAt: answerData.answeredAt || serverTimestamp(),
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'answerHistory'), docData);
  return docRef.id;
}

/**
 * ユーザーの解答履歴を取得
 * @param {string} userId - ユーザーID
 * @param {Object} options - オプション
 * @param {number} [options.limit] - 取得件数上限
 * @returns {Promise<AnswerHistory[]>}
 */
export async function getUserAnswerHistory(userId, options = {}) {
  let q = query(
    collection(db, 'answerHistory'),
    where('userId', '==', userId),
    orderBy('answeredAt', 'desc')
  );

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定問題の解答履歴を取得
 * @param {string} userId - ユーザーID
 * @param {string} problemId - 問題ID
 * @returns {Promise<AnswerHistory[]>}
 */
export async function getAnswerHistoryByProblem(userId, problemId) {
  const q = query(
    collection(db, 'answerHistory'),
    where('userId', '==', userId),
    where('problemId', '==', problemId),
    orderBy('answeredAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ========================================
// 4. ユーザー弱点スコア
// ========================================

/**
 * ユーザーの弱点スコアを取得
 * @param {string} userId - ユーザーID
 * @param {Object} options - オプション
 * @param {number} [options.minWeaknessLevel] - 最低弱点レベル
 * @param {number} [options.limit] - 取得件数上限
 * @returns {Promise<UserWeaknessScore[]>}
 */
export async function getUserWeaknessScores(userId, options = {}) {
  let q = query(
    collection(db, 'userWeaknessScores'),
    where('userId', '==', userId)
  );

  if (options.minWeaknessLevel !== undefined) {
    q = query(q, where('weaknessLevel', '>=', options.minWeaknessLevel));
  }

  q = query(q, orderBy('weaknessLevel', 'desc'), orderBy('accuracyRate', 'asc'));

  if (options.limit) {
    q = query(q, limit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * 特定単元の弱点スコアを取得
 * @param {string} userId - ユーザーID
 * @param {string} unitId - 単元ID
 * @returns {Promise<UserWeaknessScore|null>}
 */
export async function getUserWeaknessScoreByUnit(userId, unitId) {
  const q = query(
    collection(db, 'userWeaknessScores'),
    where('userId', '==', userId),
    where('unitId', '==', unitId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * 弱点スコアと対応する単元マスタを取得
 * @param {string} userId - ユーザーID
 * @param {Object} options - オプション
 * @returns {Promise<Array<{score: UserWeaknessScore, unit: MasterUnit}>>}
 */
export async function getUserWeaknessesWithUnits(userId, options = {}) {
  const scores = await getUserWeaknessScores(userId, options);

  const promises = scores.map(async (score) => {
    const unit = await getMasterUnitById(score.unitId);
    return { score, unit };
  });

  return Promise.all(promises);
}

// ========================================
// 5. レコメンド
// ========================================

/**
 * レコメンド履歴を保存
 * @param {Object} recommendationData - レコメンドデータ
 * @param {string} recommendationData.userId - ユーザーID
 * @param {string[]} recommendationData.recommendedUnitIds - レコメンド単元ID
 * @param {string[]} recommendationData.recommendedProblems - レコメンド問題ID
 * @param {string} [recommendationData.reasoning] - レコメンド理由
 * @returns {Promise<string>} - 作成されたドキュメントID
 */
export async function saveRecommendation(recommendationData) {
  const docData = {
    userId: recommendationData.userId,
    recommendedUnitIds: recommendationData.recommendedUnitIds,
    recommendedProblems: recommendationData.recommendedProblems,
    reasoning: recommendationData.reasoning || '',
    accepted: null,
    feedback: '',
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'recommendationHistory'), docData);
  return docRef.id;
}

/**
 * レコメンドにフィードバックを記録
 * @param {string} recommendationId - レコメンドID
 * @param {boolean} accepted - 受け入れたか
 * @param {string} [feedback] - フィードバック
 * @returns {Promise<void>}
 */
export async function updateRecommendationFeedback(recommendationId, accepted, feedback = '') {
  const docRef = doc(db, 'recommendationHistory', recommendationId);
  await updateDoc(docRef, {
    accepted,
    feedback
  });
}

/**
 * ユーザーのレコメンド履歴を取得
 * @param {string} userId - ユーザーID
 * @param {number} [limitCount] - 取得件数上限
 * @returns {Promise<Array>}
 */
export async function getUserRecommendations(userId, limitCount = 10) {
  const q = query(
    collection(db, 'recommendationHistory'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ========================================
// 6. 統計・分析
// ========================================

/**
 * ユーザーの全体統計を計算
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>}
 */
export async function getUserOverallStats(userId) {
  const history = await getUserAnswerHistory(userId);

  if (history.length === 0) {
    return {
      totalProblemsAttempted: 0,
      correctCount: 0,
      accuracyRate: 0,
      totalTimeSpent: 0
    };
  }

  const correctCount = history.filter(h => h.isCorrect).length;
  const totalTimeSpent = history.reduce((sum, h) => sum + (h.timeSpent || 0), 0);

  return {
    totalProblemsAttempted: history.length,
    correctCount,
    accuracyRate: correctCount / history.length,
    totalTimeSpent
  };
}

/**
 * カテゴリ別の統計を計算
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array<Object>>}
 */
export async function getCategoryStats(userId) {
  const history = await getUserAnswerHistory(userId);

  const categoryMap = {};

  for (const answer of history) {
    const problemTags = await getProblemTags(answer.problemId);

    for (const { unit } of problemTags) {
      if (!unit) continue;

      if (!categoryMap[unit.category]) {
        categoryMap[unit.category] = {
          category: unit.category,
          totalAttempts: 0,
          correctCount: 0,
          difficulties: []
        };
      }

      categoryMap[unit.category].totalAttempts++;
      if (answer.isCorrect) {
        categoryMap[unit.category].correctCount++;
      }
      categoryMap[unit.category].difficulties.push(unit.difficultyLevel || 0);
    }
  }

  return Object.values(categoryMap).map(cat => ({
    category: cat.category,
    totalAttempts: cat.totalAttempts,
    correctCount: cat.correctCount,
    accuracyRate: cat.correctCount / cat.totalAttempts,
    avgDifficulty: cat.difficulties.reduce((a, b) => a + b, 0) / cat.difficulties.length
  }));
}

/**
 * 弱点レベルを計算
 * @param {number} accuracyRate - 正答率 (0.0-1.0)
 * @param {number} totalAttempts - 挑戦回数
 * @returns {number} - 弱点レベル (0-5)
 */
export function calculateWeaknessLevel(accuracyRate, totalAttempts) {
  if (totalAttempts < 3) return 0; // データ不足

  if (accuracyRate >= 0.9) return 0; // 弱点なし
  if (accuracyRate >= 0.7) return 1; // 軽度の弱点
  if (accuracyRate >= 0.5) return 2; // 中程度の弱点
  if (accuracyRate >= 0.3) return 3; // 重度の弱点
  if (accuracyRate >= 0.1) return 4; // 非常に重度の弱点
  return 5; // 致命的な弱点
}
