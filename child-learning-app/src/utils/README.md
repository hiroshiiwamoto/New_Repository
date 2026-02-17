# Weakness Analysis API

弱点分析システムのFirestore CRUD APIユーティリティ。

## インポート

```javascript
import {
  // 単元マスタ
  getAllMasterUnits,
  getMasterUnitsByCategory,
  getMasterUnitById,
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
} from './utils/weaknessAnalysisApi';
```

---

## 使用例

### 1. 単元マスタの取得

#### すべての単元マスタを取得

```javascript
const masterUnits = await getAllMasterUnits();
console.log(masterUnits);
// [
//   { id: 'CALC_BASIC', name: '四則計算の基礎', category: '計算', ... },
//   { id: 'SPEC_CONC', name: '濃度算', category: '特殊算', ... },
//   ...
// ]
```

#### カテゴリ別に取得

```javascript
const specialTags = await getMasterUnitsByCategory('特殊算');
console.log(specialTags);
// [
//   { id: 'SPEC_CONC', name: '濃度算', ... },
//   { id: 'SPEC_TSURU', name: 'つるかめ算', ... },
//   ...
// ]
```

#### カテゴリ一覧を取得

```javascript
const categories = await getCategories();
console.log(categories);
// ['グラフ・論理', '場合の数', '数の性質', '比', '特殊算', ...]
```

---

### 2. 過去問の取得

#### 特定学校の過去問を取得

```javascript
const problems = await getProblemsBySchool('開成中学校', 2024);
console.log(problems);
// [
//   { id: 'kaisei_2024_001', schoolName: '開成中学校', examYear: 2024, ... },
//   ...
// ]
```

#### 問題に関連する単元を取得

```javascript
const problemTags = await getProblemTags('kaisei_2024_001');
console.log(problemTags);
// [
//   { tag: { id: 'SPEC_CONC', name: '濃度算', ... }, relevanceScore: 1.0 },
//   { tag: { id: 'RATIO_CALC', name: '割合の基本', ... }, relevanceScore: 0.7 },
//   ...
// ]
```

---

### 3. 解答の記録

#### 解答を送信

```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const userId = auth.currentUser.uid;

const answerId = await submitAnswer({
  userId: userId,
  problemId: 'kaisei_2024_001',
  isCorrect: true,
  userAnswer: '42',
  timeSpent: 480, // 秒
  confidenceLevel: 4, // 1-5
  notes: '最初は間違えたが、見直して正解できた'
});

console.log('解答を記録しました:', answerId);
```

#### 解答履歴を取得

```javascript
const history = await getUserAnswerHistory(userId, { limit: 10 });
console.log('最近の解答履歴:', history);
// [
//   {
//     id: '...',
//     userId: '...',
//     problemId: 'kaisei_2024_001',
//     isCorrect: true,
//     userAnswer: '42',
//     timeSpent: 480,
//     answeredAt: Timestamp,
//     ...
//   },
//   ...
// ]
```

---

### 4. 弱点分析

#### ユーザーの弱点を取得

```javascript
// 弱点レベル2以上の単元を取得
const weaknesses = await getUserWeaknessesWithTags(userId, {
  minWeaknessLevel: 2,
  limit: 10
});

console.log('弱点トップ10:', weaknesses);
// [
//   {
//     score: {
//       tagId: 'SPEC_CONC',
//       totalAttempts: 12,
//       correctCount: 4,
//       accuracyRate: 0.33,
//       weaknessLevel: 3,
//       ...
//     },
//     tag: {
//       id: 'SPEC_CONC',
//       name: '濃度算',
//       category: '特殊算',
//       ...
//     }
//   },
//   ...
// ]
```

#### 全体統計を取得

```javascript
const stats = await getUserOverallStats(userId);
console.log('全体統計:', stats);
// {
//   totalProblemsAttempted: 120,
//   correctCount: 85,
//   accuracyRate: 0.708,
//   totalTimeSpent: 36000 // 秒
// }
```

#### カテゴリ別統計を取得

```javascript
const categoryStats = await getCategoryStats(userId);
console.log('カテゴリ別統計:', categoryStats);
// [
//   {
//     category: '特殊算',
//     totalAttempts: 30,
//     correctCount: 18,
//     accuracyRate: 0.6,
//     avgDifficulty: 3.5
//   },
//   ...
// ]
```

---

### 5. レコメンド

#### レコメンドを保存

```javascript
const recommendationId = await saveRecommendation({
  userId: userId,
  recommendedTagIds: ['SPEC_CONC', 'RATIO_CALC', 'SPEED_TRAVEL'],
  recommendedProblems: ['kaisei_2024_003', 'azabu_2024_005'],
  reasoning: '濃度算と速さの問題が苦手なため、これらの単元を重点的に学習することをお勧めします。'
});

console.log('レコメンドを保存しました:', recommendationId);
```

#### レコメンドにフィードバックを記録

```javascript
await updateRecommendationFeedback(recommendationId, true, '役に立った');
```

#### レコメンド履歴を取得

```javascript
const recommendations = await getUserRecommendations(userId, 5);
console.log('最近のレコメンド:', recommendations);
```

---

## React コンポーネント例

### 弱点ダッシュボード

```jsx
import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getUserOverallStats,
  getUserWeaknessesWithTags,
  getCategoryStats
} from './utils/weaknessAnalysisApi';

function WeaknessDashboard() {
  const [overallStats, setOverallStats] = useState(null);
  const [weaknesses, setWeaknesses] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;

      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const [stats, weak, catStats] = await Promise.all([
          getUserOverallStats(userId),
          getUserWeaknessesWithTags(userId, { minWeaknessLevel: 2, limit: 10 }),
          getCategoryStats(userId)
        ]);

        setOverallStats(stats);
        setWeaknesses(weak);
        setCategoryStats(catStats);
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>読み込み中...</div>;

  return (
    <div>
      <h1>弱点分析ダッシュボード</h1>

      {/* 全体統計 */}
      <section>
        <h2>全体統計</h2>
        <p>解答数: {overallStats.totalProblemsAttempted}</p>
        <p>正解数: {overallStats.correctCount}</p>
        <p>正答率: {(overallStats.accuracyRate * 100).toFixed(1)}%</p>
      </section>

      {/* 弱点トップ10 */}
      <section>
        <h2>弱点トップ10</h2>
        <ul>
          {weaknesses.map(({ score, tag }) => (
            <li key={score.id}>
              <strong>{tag.name}</strong> ({tag.category}) -
              正答率: {(score.accuracyRate * 100).toFixed(1)}%
              ({score.correctCount}/{score.totalAttempts})
            </li>
          ))}
        </ul>
      </section>

      {/* カテゴリ別統計 */}
      <section>
        <h2>カテゴリ別統計</h2>
        <ul>
          {categoryStats.map(stat => (
            <li key={stat.category}>
              <strong>{stat.category}</strong> -
              正答率: {(stat.accuracyRate * 100).toFixed(1)}%
              ({stat.correctCount}/{stat.totalAttempts})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default WeaknessDashboard;
```

---

## 注意事項

### セキュリティルール

- 単元マスタ・過去問は**全員読み取り可**（書き込み不可）
- 解答履歴・レコメンド履歴は**自分のみ読み書き可**
- ユーザー弱点スコアは**自分のみ読み取り可**（書き込みはCloud Functionsのみ）

### Cloud Functions の必要性

`userWeaknessScores` は解答履歴から自動計算されるべきです。以下のトリガーでCloud Functionを実装することを推奨：

```javascript
// Cloud Function例（未実装）
exports.updateWeaknessScores = functions.firestore
  .document('answerHistory/{answerId}')
  .onCreate(async (snap, context) => {
    // 解答履歴から弱点スコアを再計算
    // userWeaknessScores を更新
  });
```

---

## エラーハンドリング

```javascript
try {
  const masterUnits = await getAllMasterUnits();
  console.log(masterUnits);
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('アクセス権限がありません');
  } else if (error.code === 'unavailable') {
    console.error('ネットワークエラー');
  } else {
    console.error('エラー:', error.message);
  }
}
```

---

## 今後の拡張

1. **Cloud Functions の実装**
   - 解答履歴から弱点スコアを自動更新
   - AIによる自動レコメンド生成

2. **リアルタイム更新**
   - `onSnapshot` を使ったリアルタイムデータ取得

3. **ページネーション**
   - 大量データの効率的な取得

4. **キャッシング**
   - 頻繁にアクセスするデータのローカルキャッシュ
