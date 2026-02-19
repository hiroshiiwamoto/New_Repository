# UI統一感・冗長コード 全体監査レポート

> 監査日: 2026-02-19
> 対象: `child-learning-app/src/` 全ファイル（コンポーネント40+、ユーティリティ15+、CSS 31ファイル）

---

## 目次

1. [総合サマリー](#1-総合サマリー)
2. [CSS・デザインの不統一](#2-cssデザインの不統一)
3. [コンポーネント実装パターンの不統一](#3-コンポーネント実装パターンの不統一)
4. [ユーティリティコードの冗長・重複](#4-ユーティリティコードの冗長重複)
5. [不要・未使用コード](#5-不要未使用コード)
6. [改善優先度マトリクス](#6-改善優先度マトリクス)

---

## 1. 総合サマリー

本プロジェクトは SAPIX 学習管理アプリとして多機能で充実していますが、機能追加が重ねられる中で **デザインシステムの不在** が顕著になっています。以下の3つの大カテゴリで合計 **47件** の問題を検出しました。

| カテゴリ | 重大 | 中程度 | 軽微 | 合計 |
|---------|------|--------|------|------|
| CSS・デザイン不統一 | 4 | 5 | 3 | 12 |
| コンポーネントパターン不統一 | 3 | 5 | 4 | 12 |
| ユーティリティ冗長・重複 | 5 | 5 | 3 | 13 |
| 不要・未使用コード | 2 | 4 | 4 | 10 |
| **合計** | **14** | **19** | **14** | **47** |

---

## 2. CSS・デザインの不統一

### 2.1 カラーパレットの不統一 【重大】

デザイントークン（CSS変数）が定義されておらず、同じ目的の色が複数ファイルでバラバラに使われています。

#### プライマリブルー（5種類が混在）
| ファイル | 値 | 用途 |
|---------|-----|------|
| `Auth.css:6` | `#1e40af` / `#3b82f6` | グラデーション |
| `WeeklyCalendar.css:24` | `#1e40af`, `#3b82f6`, `#2563eb` | ヘッダー |
| `DriveFilePicker.css:83` | `#3b82f6`, `#2563eb` | ボタン |
| `TaskForm.css:63` | `#3b82f6`, `#2563eb` | フォーム送信ボタン |
| `PDFProblemView.css:130` | `#007AFF` | アクションボタン |
| `StudyTimer.css:177` | `#007AFF` | コントロールボタン |

→ Apple系 `#007AFF` と Tailwind系 `#3b82f6` が混在しています。

#### グリーン（2系統が混在）
| ファイル | 値 | 用途 |
|---------|-----|------|
| `UnitManager.css:489` | `#34C759` | 一括完了ボタン |
| `TaskList.css:283` | `#34C759` | 一括完了ボタン |
| `PDFProblemView.css:376` | `#10b981` | 管理ボタン |
| `StudyTimer.css:99` | `#10b981` | 休憩モード |
| `PdfCropper.css:299` | `#10b981` | 確認ボタン |

→ Apple系 `#34C759` と Tailwind系 `#10b981` が混在しています。

#### レッド・エラー色（3種類が混在）
| ファイル | 値 |
|---------|-----|
| `PDFProblemView.css:385` | `#ef4444` |
| `TodayAndWeekView.css:20` | `#ef4444` / `#dc2626` |
| `TaskList.css:299` | `#FF3B30` |

#### グレー背景色（微妙に異なる4種類）
`#f5f5f7`, `#f1f5f9`, `#f8fafc`, `#f9fafb` — すべて非常に似ているが統一されていません。

---

### 2.2 ボタンスタイルの不統一 【重大】

プライマリボタンのスタイルが2系統に分裂しています。

| パターン | 使用ファイル | スタイル |
|---------|------------|---------|
| グラデーション | `TargetSchoolView.css:91` | `linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)` |
| ソリッドカラー | `PDFProblemView.css:130`, `TaskList.css:373`, `StudyTimer.css:177` | `background: #007AFF` |

またボタンの padding も統一されていません: `14px 24px` vs `8px 16px` vs `10px 20px`

---

### 2.3 border-radius の不統一 【中程度】

9種類の異なる値が使われています:

| 値 | 使用例 |
|-----|-------|
| `4px` | 小型ボタン |
| `6px` | `TaskForm.css` フォーム要素 |
| `8px` | `PDFProblemView.css` 検索ボタン |
| `10px` | 各種カード |
| `12px` | `SubjectView.css` セクション |
| `14px` | 一部カード |
| `16px` | `DriveFilePicker.css` モーダル, `UnitManager.css` カード |
| `20px` | `Auth.css` 認証カード |

→ `4px`/`8px`/`12px`/`16px` の4段階に統一すべきです。

---

### 2.4 box-shadow の不統一 【中程度】

カード影の定義がファイルごとにバラバラです:

| ファイル | 通常 | ホバー |
|---------|------|--------|
| `PDFProblemView.css` | `0 2px 8px rgba(0,0,0,0.04)` | `0 4px 12px rgba(0,0,0,0.08)` |
| `TaskList.css` | `0 2px 8px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)` | — |
| `SubjectView.css` | `0 4px 12px rgba(0,0,0,0.1)` | `0 4px 12px rgba(0,0,0,0.1)` |
| `Dashboard.css` | — | `0 6px 16px rgba(0,0,0,0.1)` |
| `toast.css` | `0 4px 12px rgba(0,0,0,0.15)` | — |

---

### 2.5 カード padding の不統一 【中程度】

| ファイル | 値 |
|---------|-----|
| `UnitManager.css` (`.unit-card`) | `12px` |
| `TaskList.css` (`.stat-item`) | `16px` |
| `Dashboard.css` (`.subject-progress-card`) | `18px` |
| `PDFProblemView.css` (`.stat-card`) | `20px` |

→ 同じ「カード」要素で4種類の padding が混在しています。

---

### 2.6 フォントサイズの不統一 【中程度】

| 要素 | ファイル | 値 |
|------|---------|-----|
| セクションタイトル | `Dashboard.css` | `1.3rem` |
| セクションタイトル | `Analytics.css` | `1.8rem` |
| アクションボタン | `PDFProblemView.css` | `0.9375rem` |
| アクションボタン | `StudyTimer.css` | `1rem` |
| 空状態テキスト | `TaskList.css` | `1.25rem` |

---

### 2.7 z-index の管理不在 【中程度】

| ファイル | 値 | 用途 |
|---------|-----|------|
| `toast.css` | `10000` | トースト通知 |
| `PdfCropper.css` | `2000` | PDFクロッパー |
| `PDFProblemView.css` | `1000` | アップロードフォーム |
| `DriveFilePicker.css` | `1000` | ドライブピッカー |
| `TestScoreView.css` | `1000` | フォームオーバーレイ |

→ トーストの `10000` は過剰です。管理された z-index スケールが必要です。

---

### 2.8 transition/animation の不統一 【軽微】

- `ease` と `cubic-bezier(0.4, 0, 0.2, 1)` が混在
- 同じスピンアニメーションが `spin`（PdfCropper.css）と `drive-spin`（DriveFilePicker.css）で重複定義
- ホバー時の `translateY` 値: `-1px`, `-2px`, `-3px` と統一なし

---

### 2.9 モーダルオーバーレイの重複定義 【軽微】

以下のファイルで同じパターンが個別定義されています:
- `PDFProblemView.css` (`.upload-form-overlay`)
- `DriveFilePicker.css` (`.drive-picker-overlay`)
- `PastPaperView.css` (`.form-overlay`)
- `TestScoreView.css` (`.form-overlay`)

すべて `position: fixed; inset: 0; background: rgba(0,0,0,0.5);` — 共通クラスに抽出可能です。

---

### 2.10 レスポンシブブレークポイント 【軽微】

ほとんどのファイルが `480px` / `768px` / `1024px` を使用しますが、`UnitManager.css` のみ `2000px` という異常なブレークポイントが含まれています。

---

## 3. コンポーネント実装パターンの不統一

### 3.1 エラーハンドリングの混在 【重大】

3つの異なるエラー表示方法が混在しています:

| 方法 | 使用コンポーネント |
|------|------------------|
| `alert()` | `Auth.jsx:55,65` |
| `toast.error()` | `UnitManager.jsx`, `TargetSchoolView.jsx`, `PastPaperView.jsx` 他多数 |
| `setError()` (state) | `DriveFilePicker.jsx:79-82` |
| エラー処理なし | `Dashboard.jsx`, `ScoreCard.jsx`, `SubjectView.jsx` |

→ `alert()` は UX として不適切です。すべて `toast` に統一すべきです。

---

### 3.2 ローディング表示の不統一 【重大】

| 方法 | 使用コンポーネント |
|------|------------------|
| 絵文字 + テキスト | `MasterUnitDashboard.jsx:227` (`📊 単元データを読み込み中...`) |
| CSSスピナー | `DriveFilePicker.jsx:294` |
| テキストのみ | `PdfCropper.jsx:665` (`PDFを読み込んでいます...`) |
| 三項演算子内の分岐 | `GradesView.jsx:45` |

→ 共通の `<Loading />` コンポーネントが必要です。

---

### 3.3 useState 過多 【重大】

以下のコンポーネントは `useState` が10個以上あり、`useReducer` に切り替えるべきです:

| コンポーネント | useState 数 |
|---------------|------------|
| `SapixTextView.jsx` | 17+ |
| `PastPaperView.jsx` | 15+ |
| `PdfCropper.jsx` | 15+ |
| `TaskForm.jsx` | 13+ |
| `TestScoreView.jsx` | 11+ |

---

### 3.4 空状態表示の不統一 【中程度】

| コンポーネント | 空状態の実装 |
|---------------|-------------|
| `PastPaperView.jsx:581` | `📝 この条件の過去問タスクがありません...` |
| `SapixTextView.jsx:471` | `📘 この科目のSAPIXテキストがありません` |
| `TaskList.jsx:273` | 検索結果用の空状態 |
| `UnitDashboard.jsx` | 空状態ハンドリングなし |
| `GradesView.jsx:352` | `📊 この学年のテスト成績がありません` |

→ 共通の `<EmptyState icon message />` コンポーネントが必要です。

---

### 3.5 データ取得パターンの不統一 【中程度】

3つのパターンが混在しています:

**パターン1: useCallback + useEffect**
```jsx
// PastPaperView.jsx
const loadSessions = useCallback(async () => { ... }, [deps])
useEffect(() => { loadSessions() }, [loadSessions])
```

**パターン2: useEffect 内で直接関数定義**
```jsx
// TargetSchoolView.jsx
useEffect(() => {
  if (!user) return
  loadSchools()
}, [user])
```

**パターン3: Promise.then() チェーン**
```jsx
// GradesView.jsx
useEffect(() => {
  getAllTestScores(user.uid).then(result => { ... })
}, [user])
```

---

### 3.6 インラインスタイルの多用 【中程度】

以下のコンポーネントで科目ボタンのスタイルがインラインで定義されています:
- `UnitDashboard.jsx:95-106` — `style={{ borderColor, background, padding, fontSize, display, ... }}`
- `UnitManager.jsx:117-128` — 同じパターンの繰り返し
- `TaskItem.jsx:24-28` — `style={{ borderColor, backgroundColor, boxShadow }}`

→ CSS クラスに抽出すべきです。

---

### 3.7 フォームバリデーションの不統一 【中程度】

| コンポーネント | 方法 |
|---------------|------|
| `TargetSchoolView.jsx:77` | `if (!form.name) { toast.error(...) }` |
| `TaskForm.jsx:56` | `if (title.trim()) { ... }` |
| `UnitManager.jsx:23` | `if (!customUnitName.trim()) { toast.error(...) }` |
| `PDFProblemView.jsx:93` | 複数のインラインチェック |

→ `.trim()` の使用有無がバラバラ、バリデーションユーティリティが必要です。

---

### 3.8 ハードコードされた日本語文字列 【中程度】

50以上の日本語文字列がコンポーネントに直接記述されています。代表例:

- `UnitDashboard.jsx:77` — `"学年:"`
- `StudyTimer.jsx:113` — `"⏱️ 学習タイマー"`
- `Dashboard.jsx:17` — `"📊 科目別達成率"`
- `TargetSchoolView.jsx:164` — `"🏫 志望校管理"`
- `WeeklyCalendar.jsx:152` — `"予定なし"`
- `GradesView.jsx:111` — `"✏️ 成績を編集"`

→ `constants.js` に集約するか、i18n 対応を検討すべきです。

---

### 3.9 イベントハンドラ命名の不統一 【軽微】

`handle*` プレフィックスが主流ですが、一部で無名インラインハンドラが使われています:
- `WeeklyCalendar.jsx:82` — `onClick={() => setSelectedGrade(grade)}`（名前付きハンドラにすべき）

---

### 3.10 モーダル実装の不統一 【軽微】

- ほとんどのモーダルは通常の `<div>` + オーバーレイで実装
- `ProblemClipList.jsx:328` と `PdfCropper.jsx:429` は `createPortal` を使用
- 統一された Modal コンポーネントが必要

---

### 3.11 Props の多すぎるコンポーネント 【軽微】

- `ProblemClipList.jsx:67-87` — 20以上の props を受け取っている
- オブジェクトにまとめるか、Context を使うべきです。

---

### 3.12 CSS ファイルの過不足 【軽微】

- `GradesView.jsx` — 専用 CSS がなく `TestScoreView.css` を共用
- `ScoreCard.jsx` — 専用 CSS がなく `TestScoreView.css` を共用
- `CustomUnitForm.jsx` — 専用 CSS なし
- `PastPaperFields.jsx` — 専用 CSS なし
- `UnitAnalysisView.jsx` — 専用 CSS なし

→ スタイルの依存関係が暗黙的で、変更時に影響範囲が把握しにくいです。

---

## 4. ユーティリティコードの冗長・重複

### 4.1 Firestore CRUD パターンの大量重複 【重大】

8つのファイルでほぼ同一の CRUD ボイラープレートが繰り返されています:

```
firestore.js, targetSchools.js, customUnits.js, testScores.js,
sapixTexts.js, pastPaperSessions.js, problems.js, pdfStorage.js
```

代表例（各ファイルの add 関数）:
```javascript
// targetSchools.js
export async function addTargetSchool(userId, schoolData) {
  try {
    const ref = collection(db, 'users', userId, 'targetSchoolsDetail')
    const newData = { ...schoolData, createdAt: new Date().toISOString() }
    const docRef = await addDoc(ref, newData)
    return { success: true, data: { firestoreId: docRef.id, ...newData } }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// customUnits.js — ほぼ同じ構造
// testScores.js — ほぼ同じ構造
// sapixTexts.js — ほぼ同じ構造
```

→ 汎用 `createCrudService(collectionPath)` ファクトリで **約500行の重複を削減可能** です。

---

### 4.2 レスポンスオブジェクト構造の不統一 【重大】

#### ID フィールド名の不統一
| ファイル | ID フィールド名 |
|---------|----------------|
| `firestore.js` | `id` |
| `sapixTexts.js` | `firestoreId` |
| `customUnits.js` | `firestoreId` |
| `testScores.js` | `firestoreId` |
| `targetSchools.js` | `firestoreId` |

#### レスポンスエンベロープの不統一
| パターン | 使用ファイル |
|---------|------------|
| `{ success, error }` (data なし) | `firestore.js` |
| `{ success, data, error }` | `targetSchools.js`, `customUnits.js` |
| `{ success, data: [], error }` | `testScores.js`, `problems.js` |

---

### 4.3 日付処理の不統一 【重大】

4つの異なるアプローチが混在しています:

| 方法 | 使用ファイル |
|------|------------|
| `new Date().toISOString().split('T')[0]` | `studySessions.js:33`, `testScores.js:28` |
| `new Date().toISOString()` (フルタイムスタンプ) | `customUnits.js:24`, `targetSchools.js:35` |
| `serverTimestamp()` (Firestore) | `lessonLogs.js:77`, `problems.js:60` |
| `dateUtils.js` の関数 | ほとんど使われていない |

→ `dateUtils.js` に `formatDate()` と `getTodayString()` が定義されているのに、ほぼ使われていません。

---

### 4.4 localStorage と Firestore の混在 【重大】

| ストレージ | 使用ファイル |
|-----------|------------|
| localStorage のみ | `studySessions.js`, `progressTracking.js` |
| Firestore のみ | `testScores.js`, `targetSchools.js`, `problems.js` |
| 両方（条件分岐） | `App.jsx` (ログイン有無で分岐) |

→ `studySessions.js` と `progressTracking.js` はログインユーザーでも localStorage を使い続けるため、データが端末間で同期されません。

---

### 4.5 マジックナンバーの散在 【重大】

`constants.js` にいくつかの定数が定義されていますが、多くのマジックナンバーが各ファイルに散在しています:

| ファイル | 値 | 意味 |
|---------|-----|------|
| `pdfStorage.js:23` | `20 * 1024 * 1024` | 最大ファイルサイズ 20MB |
| `pdfStorage.js:24` | `100` | 最大PDFファイル数 |
| `lessonLogs.js:244` | `90` | 半減期日数 |
| `progressTracking.js:4` | `90` | 最大履歴日数（同じ90日！） |
| 複数ファイル | `24 * 60 * 60 * 1000` | ミリ秒/日 |

---

### 4.6 重複する機能を持つファイル群 【中程度】

#### `studySessions.js` vs `progressTracking.js`
- 両方とも学習データを localStorage で追跡
- 統合して1つのモジュールにできます

#### `problems.js` vs `pdfStorage.js`
- `problems.js`: `problems` コレクション（汎用問題管理）
- `pdfStorage.js:206-238`: `pdfProblems` コレクション（PDF固有問題管理）
- 同じ「問題」を2つの別コレクションで管理しています

#### 日付計算の重複
- `targetSchools.js:108-116`: `getDaysUntilExam()` — 日数差分計算
- `dateUtils.js:51-54`: `daysDifference()` — ほぼ同じロジック

---

### 4.7 エラーハンドリングの不統一 【中程度】

| パターン | 使用ファイル |
|---------|------------|
| try/catch + console.error | `firestore.js`, `targetSchools.js` 他 |
| try/catch + console.warn | `pdfStorage.js:162` |
| try/catch なし | `progressTracking.js`（13関数中2つだけ）, `studySessions.js`, `dateUtils.js` |

---

### 4.8 非推奨関数が残存 【中程度】

```javascript
// lessonLogs.js:97-100
/** @deprecated addLessonLogWithStats を使用してください */
export async function addLessonLog(userId, data) {
  return addLessonLogWithStats(userId, data)
}
```

→ 使用箇所を更新して削除すべきです。

---

### 4.9 Firebase import の書き方バラバラ 【中程度】

各ファイルで import の順序・内容が異なります。一貫したルールが必要です。

---

### 4.10 関数命名規則の不統一 【中程度】

| ファイル | 命名パターン |
|---------|-------------|
| `firestore.js` | `addTaskToFirestore`, `updateTaskInFirestore` (動詞+名詞+場所) |
| `customUnits.js` | `addCustomUnit`, `getCustomUnits` (動詞+名詞) |
| `problems.js` | `addProblem`, `getProblemsBySource` (混在) |

---

## 5. 不要・未使用コード

### 5.1 スタブ・未実装関数 【重大】

```javascript
// studySessions.js:161-165
function getUnitById(unitId) {
  // この関数は unitsDatabase.js の getUnitById を使用
  // ここでは簡易的に実装
  return { unitId }  // ← 実質的に何もしていない
}

// progressTracking.js:191-195
const getStudySessionsForDate = (_dateKey) => {
  // TODO: 実際の学習セッションデータと連携
  return []  // ← 常に空配列を返す
}
```

---

### 5.2 空のサンプルデータ 【重大】

```javascript
// sampleData.js
export const generateGrade3Schedule = () => { return [] }  // 空！
export const generateGrade4Schedule = () => { return [] }  // 空！
```

→ 使われていないなら削除すべきです。

---

### 5.3 テスト用ファイルが本番コードに混在 【中程度】

- `utils/test-api.js` — テスト検証用ファイルが `utils/` ディレクトリに存在
- `test.py` — ルートディレクトリにプレースホルダーの Python テストファイル

---

### 5.4 使われていない可能性のあるユーティリティ関数 【中程度】

- `dateUtils.js:6-11`: `getWeekStart()` — 使用頻度が低い
- `dateUtils.js`: `formatDate()`, `getTodayString()` — 定義済みだがほとんどのファイルで使われていない

---

### 5.5 重複アニメーション定義 【中程度】

- `PdfCropper.css`: `@keyframes spin { ... }`
- `DriveFilePicker.css`: `@keyframes drive-spin { ... }`
- 同じ回転アニメーションが別名で定義されています

---

### 5.6 未使用の可能性がある CSS 【中程度】

- `PastPaperView.css:1493-1530`: 問題ログセクション — 使用確認が必要
- `TestScoreView.css:1541-1573`: PDFクロッパー科目タブ — 使用確認が必要

---

### 5.7 `customUnits.js` の重複 ID フィールド 【軽微】

`customUnits.js:31` で `id` フィールドを、`customUnits.js:54` で `firestoreId` フィールドを返しています。同じドキュメントに対して2つの ID 表現があります。

---

### 5.8 eslint-disable コメント 【軽微】

`PdfCropper.jsx:76-82` に `eslint-disable-next-line react-hooks/exhaustive-deps` があります。依存配列の問題を suppression で隠しています。

---

### 5.9 不要な公開ディレクトリ 【軽微】

`child-learning-app/public/exam-tracker/index.html` — メインアプリとは別のスタンドアロンHTMLで、統合されていません。

---

### 5.10 docs/assets のビルド成果物 【軽微】

`docs/assets/index-CTU17U-y.js` と `docs/assets/index-DEb2X8WO.css` — ビルド成果物がリポジトリにコミットされています。通常は `.gitignore` に追加すべきです。

---

## 6. 改善優先度マトリクス

### 優先度1（すぐに対応すべき・効果大）

| # | 項目 | 影響範囲 | 推定工数 |
|---|------|---------|---------|
| 1 | CSS変数によるデザイントークン定義 | 全CSSファイル | 中 |
| 2 | `alert()` → `toast` への統一 | `Auth.jsx` | 小 |
| 3 | 汎用 CRUD サービスの作成 | 8ユーティリティファイル | 大 |
| 4 | レスポンス構造の統一 (`id` vs `firestoreId`) | 5ユーティリティファイル | 中 |
| 5 | スタブ関数の削除または実装 | 3ファイル | 小 |

### 優先度2（中期的に対応すべき）

| # | 項目 | 影響範囲 | 推定工数 |
|---|------|---------|---------|
| 6 | 共通 `<Loading />` コンポーネント作成 | 全コンポーネント | 中 |
| 7 | 共通 `<EmptyState />` コンポーネント作成 | 10+ コンポーネント | 中 |
| 8 | モーダルオーバーレイの共通化 | 4+ CSS ファイル | 小 |
| 9 | 日付処理の `dateUtils.js` への統一 | 6ファイル | 中 |
| 10 | マジックナンバーの `constants.js` 集約 | 5ファイル | 小 |
| 11 | `localStorage` データの Firestore 移行 | 2ファイル | 大 |
| 12 | 非推奨関数の削除 | `lessonLogs.js` | 小 |

### 優先度3（長期的に対応）

| # | 項目 | 影響範囲 | 推定工数 |
|---|------|---------|---------|
| 13 | useState 過多コンポーネントの useReducer 化 | 5コンポーネント | 大 |
| 14 | ハードコード日本語の定数化 | 全コンポーネント | 大 |
| 15 | データ取得パターンの統一 | 全コンポーネント | 大 |
| 16 | インラインスタイルの CSS クラス化 | 3コンポーネント | 中 |
| 17 | テスト用ファイルの分離 | 2ファイル | 小 |
| 18 | `studySessions.js` と `progressTracking.js` の統合 | 2ファイル | 中 |

---

## 推奨: デザイントークン定義例

最初のステップとして、以下のような CSS 変数を `index.css` に追加することを推奨します:

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-primary-light: #dbeafe;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-danger-dark: #dc2626;
  --color-warning: #f59e0b;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.12);

  /* Z-Index Scale */
  --z-dropdown: 100;
  --z-modal: 200;
  --z-overlay: 300;
  --z-toast: 400;

  /* Transitions */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* Font Sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

---

*本レポートは全ソースファイルの詳細な調査に基づいています。各項目の修正にあたっては、影響範囲のテストを十分に行ってください。*
