# テスト範囲の間違い問題まとめ表示 — 実装仕様書

## 解決する課題

テスト前に「この範囲で間違えた問題だけまとめて見せたい」ができない。

現状、問題クリップはテキスト画面からテキストごとに見るしかなく、
テスト範囲（例: 41B-01〜41B-05）を横断して
「この5回分の授業で間違えた問題を全部見せて」ができない。

## ユーザー体験

### テスト画面での導線

テスト一覧画面（TestScoreView）で「3月度復習テスト」をタップすると
テスト詳細が開く。ここに新しいボタンを追加：

```
3月度復習テスト  2026-03-25  4年生
テスト範囲: 算数 41B-01〜41B-05  理科 430-01〜430-05

[📝 この範囲の間違い問題を見る]    ← ★新規ボタン
```

### 間違い問題一覧画面

ボタンをタップすると、テスト範囲に含まれるテキストの問題クリップを
一括表示するビュー（モーダルまたは展開セクション）が開く：

```
┌──────────────────────────────────────────┐
│ 3月度復習テスト — 間違い問題             │
│                                          │
│ 🔢 算数（8問）                           │
│                                          │
│ ┌─ 41B-01 大きな数 ──────────────────┐   │
│ │ 問1  [切り出し画像]      [✅できた] │   │
│ │ 問3  [切り出し画像]      [✅できた] │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ┌─ 41B-02 角と角度① ────────────────┐   │
│ │ 問2  [切り出し画像]      [✅できた] │   │
│ └────────────────────────────────────┘   │
│                                          │
│ ┌─ 41B-03 植木算 ────────────────────┐   │
│ │ 問5  [切り出し画像]      [✅できた] │   │
│ │ 問7  [切り出し画像]      [✅できた] │   │
│ │ 問9  [切り出し画像]      [✅できた] │   │
│ └────────────────────────────────────┘   │
│                                          │
│ 🔬 理科（2問）                           │
│ ...                                      │
│                                          │
│ 解き直し済み（3問）  [表示する ▼]        │
└──────────────────────────────────────────┘
```

**表示のルール：**
- reviewStatus !== 'done' の問題を上に表示（未完了）
- reviewStatus === 'done' の問題は「解き直し済み」に折り畳み
- 画像がある問題は画像を表示（子供に見せるため）
- 画像がない問題は問題番号のみ
- テキストコード順（41B-01 → 41B-02 → ...）でソート
- 「✅できた」タップで reviewStatus を 'done' に更新

**子供に見せるモード（オプション）：**
画像だけを大きく表示するシンプルなビューがあると、
タブレットで子供に見せながら解かせるのに便利。
ただし、これはPhase 2。まずは一覧表示を先に実装。

## データの流れ

```
1. テスト詳細画面から sapixRange を取得
   例: { 算数: ['41B-01', '41B-02', ..., '41B-05'], 理科: ['430-01', ..., '430-05'] }

2. sapixRange のテキストコード → sapixTexts コレクションの textNumber で検索
   → 該当する sapixText ドキュメントの id を取得
   例: textNumber='41B-01' → id='1740830400000'

3. 各 sapixText.id を sourceId として problems コレクションを検索
   getProblemsBySource(userId, 'textbook', sapixTextId)
   → 不正解の問題クリップ一覧（imageUrls 付き）

4. 結果を教科別・テキスト順にグループ化して表示
```

## 技術設計

### 新規コンポーネント: TestRangeProblems.jsx

```javascript
/**
 * テスト範囲に含まれる間違い問題を一括表示するコンポーネント
 * 
 * @param {Object} props
 * @param {string} props.userId
 * @param {Object} props.sapixRange - { 算数: ['41B-01', ...], 理科: ['430-01', ...] }
 * @param {string} props.testName - テスト名（タイトル表示用）
 * @param {Array}  props.sapixTexts - 全テキストのリスト（既にApp.jsxでsubscribe済み）
 * @param {Function} props.onClose - 閉じるコールバック
 */
```

**ロジック:**
```javascript
// 1. sapixRange → 該当テキストをフィルタ
const rangeTextIds = useMemo(() => {
  const ids = {}
  for (const [subject, codes] of Object.entries(sapixRange)) {
    ids[subject] = []
    for (const code of codes) {
      const text = sapixTexts.find(t => t.textNumber === code)
      if (text) {
        ids[subject].push({ 
          textId: text.id, 
          textCode: code, 
          textName: text.textName 
        })
      }
    }
  }
  return ids
}, [sapixRange, sapixTexts])

// 2. 各テキストの問題クリップを取得
useEffect(() => {
  async function load() {
    const allProblems = {}
    for (const [subject, texts] of Object.entries(rangeTextIds)) {
      allProblems[subject] = []
      for (const { textId, textCode, textName } of texts) {
        const result = await getProblemsBySource(userId, 'textbook', textId)
        if (result.success) {
          const incorrect = result.data.filter(p => !p.isCorrect)
          if (incorrect.length > 0) {
            allProblems[subject].push({
              textCode,
              textName,
              problems: incorrect,
            })
          }
        }
      }
    }
    setProblems(allProblems)
  }
  load()
}, [rangeTextIds, userId])
```

### TestScoreView.jsx への変更

テスト詳細表示部分に「この範囲の間違い問題を見る」ボタンを追加:

```jsx
{score.sapixRange && Object.keys(score.sapixRange).length > 0 && (
  <button 
    className="test-range-problems-btn"
    onClick={() => setShowRangeProblems(score)}
  >
    📝 この範囲の間違い問題を見る
  </button>
)}
```

テスト詳細モーダルまたは展開セクション内にTestRangeProblemsを表示:

```jsx
{showRangeProblems && (
  <TestRangeProblems
    userId={user.uid}
    sapixRange={showRangeProblems.sapixRange}
    testName={showRangeProblems.testName}
    sapixTexts={sapixTexts}
    onClose={() => setShowRangeProblems(null)}
  />
)}
```

### 問題の完了更新

「✅できた」ボタンは既存の updateProblem を使用:

```javascript
const handleResolve = async (problemId) => {
  await updateProblem(userId, problemId, { reviewStatus: 'done' })
  // ローカルstateも更新
  setProblems(prev => {
    // problemId の reviewStatus を 'done' に変更
  })
}
```

## ファイル変更サマリー

| ファイル | 操作 | 概要 |
|---|---|---|
| src/components/TestRangeProblems.jsx | 新規 | テスト範囲の間違い問題一覧コンポーネント |
| src/components/TestRangeProblems.css | 新規 | スタイル |
| src/components/TestScoreView.jsx | 修正 | ボタン追加 + TestRangeProblems表示 |

**Firestoreスキーマ変更: なし**
**既存コンポーネント破壊: なし**

## 前提条件

この機能が動くためには:
1. テスト日程に sapixRange が設定されていること（既に対応済み）
2. テキスト画面でテキストが登録されていること（textNumber = テキストコード）
3. テキストから問題クリップが切り出されていること（ProblemClipList / PdfCropper で登録済み）

## 将来拡張（Phase 2）

- 「子供に見せるモード」: 問題画像だけを1問ずつ大きく表示。スワイプで次の問題へ
- 「印刷用まとめ」: 範囲内の間違い問題をPDF 1枚にまとめて出力
- デイリーチェック（毎週の確認テスト）の問題も同じ仕組みで取り込み
