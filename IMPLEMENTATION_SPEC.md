# SAPIX学習アプリ — 3層データ入力 + タスク自動生成エンジン 実装仕様書

## 背景と目的

既存のSAPIX学習管理アプリ（Vite + React + Firebase）に、**学習タスク自動生成機能**を追加する。

### 核心的な課題
- 現在のアプリは「管理は最適化されているが、学習ループが存在しない」状態
- 日々の全テキスト・全問題の正誤追跡は物理的に不可能（週3日×4教科）
- テスト結果は明確に正誤が出るが、日々の授業の理解度把握が困難

### 解決アプローチ：3層データ入力
負荷と精度のバランスを取る3層構造でデータを収集し、タスク自動生成エンジンに供給する。

| 層 | 頻度 | 入力コスト | 精度 | データソース |
|---|---|---|---|---|
| Layer 1: テキスト評価 🔵🟡🔴 | 毎テキスト | 1タップ | 低（単元レベル） | lessonLogs → masterUnitStats |
| Layer 2: わからないマーク | 毎テキスト | 0〜3問入力 | 中（問題レベル） | problems コレクション |
| Layer 3: テスト正誤+正答率 | 月1回 | 10〜20問入力 | 高（問題+重要度） | problems + correctRate |

**重要な設計原則：Layer 1だけでもエンジンは動作する。Layer 2, 3のデータが増えるほど推薦精度が上がる。**

---

## 技術スタック（既存）

- **フロントエンド**: Vite + React (JSX) — クラスコンポーネントなし、Hooks使用
- **バックエンド**: Firebase (Firestore + Storage + Auth)
- **認証**: Google Auth + Google Drive連携
- **スタイル**: CSS files（Tailwind不使用）
- **状態管理**: useState/useEffect（Redux等なし）
- **ルーティング**: なし（App.jsx内でview stateによるタブ切替）

---

## 既存Firestoreスキーマ（変更不要）

すべてのデータは `users/{userId}/` 配下のサブコレクション。

### masterUnitStats/{unitId}
```
currentScore: number      // 0-100 習熟度スコア（時間減衰加重平均）
statusLevel: number       // 0-5 (0=未学習, 5=得意)
logCount: number          // 関連lessonLog数
lastUpdated: timestamp
```

### problems/{problemId}
```
sourceType: 'textbook' | 'test' | 'pastPaper'
sourceId: string          // テキストID / テストID / 過去問タスクID
subject: string           // '算数' | '国語' | '理科' | '社会'
problemNumber: string     // '問3(2)' など
unitIds: string[]         // マスター単元ID配列
isCorrect: boolean
missType: 'understanding' | 'careless' | 'not_studied' | null
correctRate: number | null  // テスト問題の全体正答率(%)
reviewStatus: 'pending' | 'done' | 'retry'
difficulty: number | null   // 1-5
imageUrls: string[]
points: number | null       // テスト問題の配点
createdAt: serverTimestamp
```

### testScores/{testId}
```
testName: string          // 'マンスリー確認テスト' 等
testDate: string          // 'YYYY-MM-DD'
status: 'scheduled' | 'completed'
sapixRange: object        // { 算数: ['41B-01', '41B-02', ...], ... }
coveredUnitIds: string[]  // sapixRange から自動計算された単元ID配列
scores: { kokugo, sansu, rika, shakai }
deviations: { kokugo, sansu, rika, shakai }
fourSubjects: { score, maxScore, deviation, rank, totalStudents }
```

### lessonLogs/{logId}
```
unitIds: string[]
mainUnitId: string        // unitIds[0]（習熟度スコア対象）
subject: string
sourceType: 'sapixTask' | 'pastPaper' | 'practice'
evaluationKey: 'blue' | 'yellow' | 'red' | null
performance: number       // blue=90, yellow=65, red=30
date: timestamp
createdAt: serverTimestamp
```

### sapixTexts/{textId}
```
sapixCode: string         // '41B-17' 等
subject: string
name: string              // テキスト名
studyDate: string | null  // 学習日
evaluation: string | null // 'blue' | 'yellow' | 'red'
```

---

## 既存ユーティリティ（そのまま活用）

### sapixSchedule.js
- `SAPIX_SCHEDULE` — テキストコード→単元マッピングテーブル（41B-01〜F41-06まで定義済み）
- `lookupSapixSchedule(code)` — コードから `{ name, unitIds, subject }` を取得
- `computeCoveredUnitIds(sapixRange)` — テスト範囲から単元ID配列を計算

### lessonLogs.js
- `addLessonLogWithStats(userId, data)` — ログ追加 + masterUnitStats自動再計算
- `computeProficiencyScore(logs)` — 時間減衰加重平均（半減期90日）
- `computeAllProficiencies(allLogs)` — 全単元の習熟度マップ生成
- `EVALUATION_SCORES` — `{ blue: 90, yellow: 65, red: 30 }`

### problems.js
- `addProblem(userId, problemData)` — 問題追加
- `getProblemsBySource(userId, sourceType, sourceId)` — ソース別問題取得
- `updateProblem(userId, problemId, updates)` — 問題更新
- `deleteProblem(userId, problemId)` — 問題削除（Storage画像も削除）

### importMasterUnits.js
- `getStaticMasterUnits()` — 全マスター単元一覧を取得（4教科×約50単元、ID体系: `SAN_CALC_BASIC` 等）

---

## 実装内容

### Phase 1：3層データ入力の実装

#### 1-A. 新規ファイル: `src/components/QuickMistakeInput.jsx` + CSS

**目的**: 子供が付箋を貼った「わからなかった問題」を親が素早く記録するUI。

**仕様**:
- モーダルとして表示（SapixTextViewから呼び出し）
- Props: `userId`, `sapixText`（テキスト情報）, `onClose`, `onSaved`

**UIフロー**:
1. テキスト情報を表示（コード＋テキスト名＋自動判定された単元名）
   - 単元名は `lookupSapixSchedule(sapixText.sapixCode)` で取得
2. 問題番号ボタンを格子状に表示（問1〜問8程度、テキストにより異なるため自由入力も可能に）
3. ユーザーが間違えた問題番号をタップ（トグル選択、複数選択可）
4. 「記録する」ボタンで一括保存
5. 完了表示

**保存処理**（ボタン押下時）:
```javascript
for (const problemNumber of selectedProblems) {
  await addProblem(userId, {
    sourceType: 'textbook',
    sourceId: sapixText.id,
    subject: scheduleInfo.subject,
    problemNumber,
    unitIds: scheduleInfo.unitIds, // sapixScheduleから自動
    isCorrect: false,
    missType: 'understanding', // デフォルト
    imageUrls: [],
  })
}
// lessonLogにも反映（間違い問題数に基づくperformance）
await addLessonLogWithStats(userId, {
  unitIds: scheduleInfo.unitIds,
  subject: scheduleInfo.subject,
  sourceType: 'sapixTask',
  sourceId: sapixText.id,
  sourceName: `${sapixText.sapixCode} ${scheduleInfo.name}`,
  performance: calculatePerformance(selectedProblems.length, totalProblems),
  evaluationKey: null, // 個別評価なので3段階とは別
})
```

**パフォーマンス計算（目安）**:
- 間違い0問 → performance=90
- 間違い1問 → performance=70
- 間違い2問 → performance=55
- 間違い3問以上 → performance=30

**注意点**:
- `lookupSapixSchedule()` が null を返す場合（マッピング未登録テキスト）は、手動で科目・単元を選択するフォールバックが必要
- 既存の `UnitTagPicker` コンポーネントを単元選択に再利用できる
- `addProblem` は既存関数をそのまま使用（Firestore書き込み）

#### 1-B. 修正: `src/components/SapixTextView.jsx`

**変更内容**:
- 各テキストカード（既存のテキスト一覧表示）に「⚡ 間違い登録」ボタンを追加
- ボタンタップで `QuickMistakeInput` モーダルを表示
- 保存完了後にテキスト一覧を再読み込み

**具体的な変更箇所**:
- テキストカードのアクションボタン群（既存の評価ボタン🔵🟡🔴の近く）に追加
- 新しいstateを追加: `const [quickMistakeText, setQuickMistakeText] = useState(null)`
- モーダル表示: `quickMistakeText && <QuickMistakeInput ... />`

#### 1-C. 修正: `src/components/TestScoreView.jsx`

**変更内容**:
- テスト登録完了後に「問題分析をしますか？」のバナー/プロンプトを表示
- 既存のProblemClipListコンポーネントの `showCorrectRate={true}` をより目立たせる
- 正答率50%以上で不正解の問題に 🔺 アイコンを自動表示

**具体的な変更箇所**:
- テスト詳細画面で、scoresが入力済み＆問題クリップが0件の場合にプロンプト表示
- ProblemClipList内の問題カードに、correctRate > 50 && !isCorrect の条件で警告表示追加

#### 1-D. 修正: `src/components/MasterUnitDashboard.jsx`

**変更内容**:
- 単元ドリルダウンモーダルに「この単元の間違い問題」セクションを追加
- 既存のdrillLogsに加えて、problemsコレクションからunitIdsでフィルタした問題も表示

**具体的な変更箇所**:
- ドリルダウンモーダルopen時にproblemsデータを取得（userId + unitIdで全problems取得→unitIdsフィルタ）
- 間違い問題リストをdrillLogsの下に表示（問題番号、missType、reviewStatus）

---

### Phase 2：タスク自動生成エンジン

#### 2-A. 新規ファイル: `src/utils/dailyTaskEngine.js`

**目的**: 4つのデータソースから優先度付き学習タスクを自動生成する純粋関数。

**エクスポート**:
```javascript
/**
 * 本日の推薦タスクを生成する
 * @param {Object} params
 * @param {Object} params.unitStats - { unitId: { currentScore, statusLevel, logCount, lastUpdated } }
 * @param {Array} params.problems - problems コレクションの全ドキュメント
 * @param {Array} params.testScores - testScores コレクションの全ドキュメント
 * @param {Array} params.lessonLogs - lessonLogs コレクションの全ドキュメント
 * @param {Array} params.masterUnits - getStaticMasterUnits() の結果
 * @returns {DailyTask[]} 最大5件の推薦タスク
 */
export function generateDailyTasks({ unitStats, problems, testScores, lessonLogs, masterUnits })
```

**DailyTask型**:
```javascript
{
  id: string,              // 一時ID（表示用）
  unitId: string,          // マスター単元ID
  unitName: string,        // 単元名（表示用）
  subject: string,         // 科目
  priority: 'high' | 'medium' | 'low',
  score: number,           // 0-100 のスコアリング結果
  reason: string,          // 「マンスリーまで5日 + 習熟度42%」等の説明文
  linkedProblems: Array,   // この単元に関連する間違い問題
  suggestedAction: string, // 「テキスト41B-17の問3, 問5を解き直し」等
  taskType: 'test_prep' | 'weakness' | 'review' | 'sr_review',
}
```

**スコアリングアルゴリズム**:
```
totalScore = forgettingScore × 0.30
           + testUrgency    × 0.35
           + weaknessDepth  × 0.25
           + jitter         × 0.10
```

**forgettingScore（忘却スコア）** 0-100:
```javascript
// 最後に学習した日からの経過日数に基づく
// unitStatsのlastUpdated（Firestore timestamp）を使用
const daysSince = (Date.now() - lastStudiedAt) / (1000 * 60 * 60 * 24)
const memoryStrength = Math.max(1, reviewCount * 2 + 3)  // S
const retention = Math.exp(-daysSince / memoryStrength)   // R = e^(-t/S)
const forgettingScore = (1 - retention) * 100
```

**testUrgency（テスト緊急度）** 0-100:
```javascript
// status='scheduled' かつ testDate が未来のテストを対象
// そのテストの coveredUnitIds に含まれる単元の緊急度を計算
const daysUntilTest = (testDate - today) / (1000 * 60 * 60 * 24)

let baseUrgency
if (daysUntilTest <= 3) baseUrgency = 95
else if (daysUntilTest <= 7) baseUrgency = 80
else if (daysUntilTest <= 14) baseUrgency = 60
else if (daysUntilTest <= 21) baseUrgency = 40
else if (daysUntilTest <= 30) baseUrgency = 20
else baseUrgency = 5

// テスト種別による重み
const testWeight = testName.includes('組分け') ? 1.3
                 : testName.includes('マンスリー') ? 1.0
                 : 0.7

// 習熟度が低いほど緊急
const masteryPenalty = 1 + (100 - currentScore) / 200  // 1.0〜1.5
testUrgency = Math.min(100, baseUrgency * testWeight * masteryPenalty)
```

**weaknessDepth（弱点深度）** 0-100:
```javascript
const masteryPart = (100 - currentScore) / 2  // 0-50

// 間違い問題数（この単元の不正解問題数）
const mistakeCount = unitProblems.filter(p => !p.isCorrect).length
const mistakePart = Math.min(30, mistakeCount * 7)  // 0-30

// ミス種別の最大深刻度
const severityMap = {
  'understanding': 20,  // 解法が浮かばない → 最深刻
  'not_studied': 15,    // 未習 → 深刻だが教わってないのでやや低い
  'careless': 5,        // ケアレスミス → 軽度
}
const maxSeverity = Math.max(0, ...unitProblems.map(p => severityMap[p.missType] || 0))

// 正答率ブースト: 正答率50%以上で不正解 = 「取るべき問題を落とした」
const hasHighCorrectRateMiss = unitProblems.some(
  p => !p.isCorrect && p.correctRate != null && p.correctRate >= 50
)
const correctRateBoost = hasHighCorrectRateMiss ? 1.5 : 1.0

weaknessDepth = Math.min(100, (masteryPart + mistakePart + maxSeverity) * correctRateBoost)
```

**タスク生成フロー**:
1. 全マスター単元に対してスコアを計算
2. スコアでソート
3. フィルタ: 昨日学習した単元を除外、currentScore < 0（未学習）を除外
4. 科目バランス制約: 同一科目は最大2件
5. 上位5件を選択
6. 各タスクにreason（選出理由）とsuggestedAction（推奨アクション）を生成

**reason生成ロジック**:
```javascript
const reasons = []
if (testUrgency > 50) reasons.push(`${testName}まで${daysUntilTest}日`)
if (currentScore >= 0 && currentScore < 50) reasons.push(`習熟度${currentScore}%`)
if (mistakeCount > 0) reasons.push(`間違い${mistakeCount}問`)
if (hasHighCorrectRateMiss) reasons.push('正答率50%↑で不正解あり')
return reasons.join(' + ')
```

**suggestedAction生成ロジック**:
```javascript
// 関連する間違い問題があればそれを指定
if (linkedProblems.length > 0) {
  const nums = linkedProblems.map(p => `第${p.problemNumber}問`).join(', ')
  const source = linkedProblems[0].sourceType === 'textbook'
    ? `テキスト${sapixCode}`
    : `テスト`
  return `${source}の${nums}を解き直し`
}
// なければ単元のテキストを復習
return `${unitName}のテキストを復習`
```

#### 2-B. 修正: `src/App.jsx`

**変更内容**:
- dailyTaskEngineに必要なデータを取得するuseEffectを追加
- 生成された推薦タスクをstateに保持
- TodayAndWeekViewにpropsとして渡す

**追加state**:
```javascript
const [suggestedTasks, setSuggestedTasks] = useState([])
```

**追加useEffect**:
```javascript
useEffect(() => {
  if (!user) return
  
  async function loadSuggestedTasks() {
    const [statsResult, problemsResult, logsResult] = await Promise.all([
      getMasterUnitStats(user.uid),
      getAllProblems(user.uid),  // ← 新規: problems全取得関数（後述）
      getLessonLogs(user.uid),
    ])
    
    const tasks = generateDailyTasks({
      unitStats: statsResult.data || {},
      problems: problemsResult.data || [],
      testScores,  // 既にstateにある（subscribeTestScoresで購読中）
      lessonLogs: logsResult.data || [],
      masterUnits: getStaticMasterUnits(),
    })
    
    setSuggestedTasks(tasks)
  }
  
  loadSuggestedTasks()
}, [user, testScores]) // testScoresが更新されたら再計算
```

**注意**: `getAllProblems` は既存の `problems.js` に追加が必要。現在は `getProblemsBySource` しかない。
```javascript
// problems.js に追加
export async function getAllProblems(userId) {
  const ref = collection(db, 'users', userId, 'problems')
  const snapshot = await getDocs(ref)
  const problems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  return { success: true, data: problems }
}
```

**TodayAndWeekViewへの渡し**:
```jsx
<TodayAndWeekView
  tasks={tasks}
  suggestedTasks={suggestedTasks}  // ← 追加
  onToggleTask={toggleTask}
  onDeleteTask={deleteTask}
  onEditTask={handleEditTask}
  userId={user.uid}
/>
```

#### 2-C. 修正: `src/components/TodayAndWeekView.jsx`

**変更内容**:
- 既存の「🎯 今日のタスク」セクションの上に「🧠 おすすめ復習」セクションを追加
- suggestedTasksを受け取り、カード形式で表示
- 各カードにreason（選出理由）を薄く表示
- 「完了」ボタンでtasksコレクションに移動 or 直接完了扱い

**Props追加**:
```javascript
function TodayAndWeekView({ tasks, suggestedTasks = [], onToggleTask, onDeleteTask, onEditTask, userId })
```

**表示仕様**:
- suggestedTasks が空の場合はセクション自体を非表示
- 各カードに: subject emoji + 科目名 + 単元名 + priority badge + reason（グレーテキスト）
- suggestedAction をカード下部に表示
- カードタップで展開: linkedProblems の一覧を表示

---

### Phase 3（将来実装）：子供モード + スペースドリピティション

#### 概要のみ記載（Phase 1-2完了後に詳細設計）

**3-A. ChildHomeView.jsx**
- App.jsxのヘッダーに「👦 こどもモード」切替ボタン
- 切替時は管理UIを非表示にしてChildHomeViewのみ表示
- 大きなカード5枚（suggestedTasksと同じデータ源）
- 「できた😊」「もう一回😣」の2ボタンのみ
- 「できた」→ updateProblem(reviewStatus='done') + masterUnitStats再計算
- 「もう一回」→ updateProblem(reviewStatus='retry')
- 全完了で🎉アニメーション

**3-B. スペースドリピティション**
- problems に `srLevel`（0〜6）と `nextReviewAt`（timestamp）フィールドを追加
- 「できた」→ srLevel+1、「もう一回」→ srLevel-2（最低0）
- 間隔: srLevel 0→1日, 1→2日, 2→4日, 3→7日, 4→14日, 5→30日, 6→60日
- srLevel 6 で「できた」→ retired（卒業）
- dailyTaskEngine がnextReviewAt <= today の問題を候補プールに含める

---

## ファイル変更サマリー

### Phase 1
| ファイル | 操作 | 概要 |
|---|---|---|
| `src/components/QuickMistakeInput.jsx` | **新規** | 間違い問題クイック登録UI |
| `src/components/QuickMistakeInput.css` | **新規** | 上記のスタイル |
| `src/components/SapixTextView.jsx` | 修正 | テキストカードに「⚡間違い登録」ボタン追加 |
| `src/components/TestScoreView.jsx` | 修正 | 問題分析プロンプト + 正答率強調 |
| `src/components/MasterUnitDashboard.jsx` | 修正 | ドリルダウンに間違い問題セクション追加 |

### Phase 2
| ファイル | 操作 | 概要 |
|---|---|---|
| `src/utils/dailyTaskEngine.js` | **新規** | タスク自動生成エンジン（純粋関数） |
| `src/utils/problems.js` | 修正 | `getAllProblems()` 関数を追加 |
| `src/App.jsx` | 修正 | エンジン呼び出し + suggestedTasks state |
| `src/components/TodayAndWeekView.jsx` | 修正 | おすすめ復習セクション追加 |
| `src/components/TodayAndWeekView.css` | 修正 | おすすめ復習セクションのスタイル |

### Firestoreスキーマ変更: なし（Phase 1-2）

---

## 実装上の注意点

### 既存コードとの整合性
- CSSはコンポーネントごとに別ファイル（`.css`）。Tailwindは使わない
- コンポーネントはすべて関数コンポーネント + Hooks
- Firestoreのデータ操作は `src/utils/` 配下のユーティリティ関数経由
- トースト通知は既存の `toast.success()` / `toast.error()` を使用
- メッセージ定数は `src/utils/messages.js` に定義

### パフォーマンス
- `generateDailyTasks()` は純粋関数。データ取得はApp.jsxのuseEffectで行い、結果をstateに保持
- 全problems取得は重くなる可能性がある。初回は非同期で読み込み、ローディング表示
- suggestedTasksの再計算トリガー: ログイン時、テスト追加時、問題追加時

### 段階的にデータが増える設計
- masterUnitStatsが0件でも空配列を返す（エラーにならない）
- problemsが0件でもforgettingScore + weaknessDepth（mastery部分のみ）で動作
- testScoresに scheduled テストがなくても testUrgency=0 で残り3要素で動作

---

## テスト方法

### dailyTaskEngine.js の単体テスト
```javascript
// テストデータ例
const mockUnitStats = {
  'SAN_SPEC_TSURU': { currentScore: 42, statusLevel: 2, logCount: 3, lastUpdated: ... },
  'SAN_PLANE_AREA': { currentScore: 78, statusLevel: 4, logCount: 8, lastUpdated: ... },
}

const mockProblems = [
  { unitIds: ['SAN_SPEC_TSURU'], isCorrect: false, missType: 'understanding', correctRate: 62 },
  { unitIds: ['SAN_SPEC_TSURU'], isCorrect: false, missType: 'careless', correctRate: 85 },
]

const mockTestScores = [
  { testDate: '2026-03-10', status: 'scheduled', coveredUnitIds: ['SAN_SPEC_TSURU', 'SAN_PLANE_AREA', ...], testName: '3月マンスリー' },
]

const result = generateDailyTasks({ unitStats: mockUnitStats, problems: mockProblems, testScores: mockTestScores, lessonLogs: [], masterUnits: getStaticMasterUnits() })

// 期待: SAN_SPEC_TSURU が最優先（低習熟度 + テスト近い + 正答率50%↑の不正解あり）
assert(result[0].unitId === 'SAN_SPEC_TSURU')
assert(result[0].priority === 'high')
assert(result.length <= 5)
```
