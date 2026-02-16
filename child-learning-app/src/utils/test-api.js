/**
 * Weakness Analysis API - テストスクリプト
 *
 * 各関数の型定義とエクスポートを検証
 */

// ダミーのFirebase設定（テスト用）
const mockDb = {};

// APIユーティリティから関数をインポート（構文チェック）
import {
  // 弱点タグ
  getAllWeaknessTags,
  getWeaknessTagsByCategory,
  getWeaknessTagById,
  getCategories,

  // 過去問
  getAllProblems,
  getProblemsBySchool,
  getProblemById,
  getProblemTags,

  // 解答履歴
  submitAnswer,
  getUserAnswerHistory,
  getAnswerHistoryByProblem,

  // ユーザー弱点スコア
  getUserWeaknessScores,
  getUserWeaknessScoreByTag,
  getUserWeaknessesWithTags,

  // レコメンド
  saveRecommendation,
  updateRecommendationFeedback,
  getUserRecommendations,

  // 統計・分析
  getUserOverallStats,
  getCategoryStats,
  calculateWeaknessLevel
} from './weaknessAnalysisApi.js';

// エクスポートされた関数の型をチェック
const exportedFunctions = {
  // 弱点タグ (4)
  getAllWeaknessTags,
  getWeaknessTagsByCategory,
  getWeaknessTagById,
  getCategories,

  // 過去問 (4)
  getAllProblems,
  getProblemsBySchool,
  getProblemById,
  getProblemTags,

  // 解答履歴 (3)
  submitAnswer,
  getUserAnswerHistory,
  getAnswerHistoryByProblem,

  // ユーザー弱点スコア (3)
  getUserWeaknessScores,
  getUserWeaknessScoreByTag,
  getUserWeaknessesWithTags,

  // レコメンド (3)
  saveRecommendation,
  updateRecommendationFeedback,
  getUserRecommendations,

  // 統計・分析 (3)
  getUserOverallStats,
  getCategoryStats,
  calculateWeaknessLevel
};

// 関数数の検証
const expectedFunctionCount = 22;
const actualFunctionCount = Object.keys(exportedFunctions).length;

console.log('========================================');
console.log('Weakness Analysis API - 検証テスト');
console.log('========================================\n');

console.log('✅ すべてのインポートが成功しました\n');

console.log('📊 エクスポートされた関数:');
console.log(`   - 弱点タグ: 4関数`);
console.log(`   - 過去問: 4関数`);
console.log(`   - 解答履歴: 3関数`);
console.log(`   - ユーザー弱点スコア: 3関数`);
console.log(`   - レコメンド: 3関数`);
console.log(`   - 統計・分析: 3関数`);
console.log(`   - 合計: ${actualFunctionCount}/${expectedFunctionCount}関数\n`);

if (actualFunctionCount === expectedFunctionCount) {
  console.log('✅ 関数数が一致しました');
} else {
  console.log(`❌ 関数数が一致しません (期待: ${expectedFunctionCount}, 実際: ${actualFunctionCount})`);
  process.exit(1);
}

// calculateWeaknessLevel の動作テスト
console.log('\n📈 calculateWeaknessLevel() 関数のテスト:');

const testCases = [
  { accuracyRate: 0.95, totalAttempts: 10, expected: 0 },
  { accuracyRate: 0.8, totalAttempts: 10, expected: 1 },
  { accuracyRate: 0.6, totalAttempts: 10, expected: 2 },
  { accuracyRate: 0.4, totalAttempts: 10, expected: 3 },
  { accuracyRate: 0.2, totalAttempts: 10, expected: 4 },
  { accuracyRate: 0.05, totalAttempts: 10, expected: 5 },
  { accuracyRate: 0.5, totalAttempts: 2, expected: 0 }, // データ不足
];

let passed = 0;
let failed = 0;

testCases.forEach(({ accuracyRate, totalAttempts, expected }, index) => {
  const result = calculateWeaknessLevel(accuracyRate, totalAttempts);
  const status = result === expected ? '✅' : '❌';

  if (result === expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`   ${status} テスト${index + 1}: 正答率${(accuracyRate * 100).toFixed(0)}% (${totalAttempts}回) → レベル${result} (期待: ${expected})`);
});

console.log(`\n📊 テスト結果: ${passed}/${testCases.length} 成功`);

if (failed > 0) {
  console.log(`❌ ${failed}件のテストが失敗しました`);
  process.exit(1);
}

console.log('\n✅ すべてのテストに合格しました\n');
