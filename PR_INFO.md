# Pull Request情報

## PR作成URL
https://github.com/hiroshiiwamoto/New_Repository/compare/master...claude/review-web-app-01E94VBPVKUGLGAExxCEVgF4

---

## タイトル
Feature: Add comprehensive learning management features

---

## 本文

## 概要
SAPIX学習管理アプリに包括的な学習管理機能を追加しました。

## 追加機能

### 1. カスタム単元管理
- ✅ カスタム単元の追加・編集・削除機能
- ✅ 学校別過去問や特定トピック用の単元作成
- ✅ Firestoreに `customUnits` コレクションを追加

### 2. 単元管理画面（Phase 2）
- ✅ 完全な単元管理UI（UnitManager コンポーネント）
- ✅ 標準単元は読み取り専用、カスタム単元は編集可能
- ✅ 学年・科目別フィルタリング
- ✅ 視覚的な区別（標準単元に「標準」バッジ、カスタム単元に黄色ハイライト）

### 3. 過去問管理システム
- ✅ 学校別・単元別の2つの表示モード
- ✅ 学校名・年度・回数の記録
- ✅ 複数の関連単元との紐付け
- ✅ 学校横断での単元別過去問検索（例：複数校の「立体図形」問題）

### 4. 過去問セッション記録
- ✅ 同じ過去問の複数回演習記録（1回目、2回目、3回目...）
- ✅ 各セッションの記録項目：実施日、得点、所要時間、メモ
- ✅ Firestoreに `pastPaperSessions` コレクションを追加
- ✅ 進捗表示と得点率の自動計算

### 5. SAPIXテスト成績管理
- ✅ 11種類のテストタイプに対応
  - 実力診断サピックスオープン
  - 志望校診断サピックスオープン
  - 志望校判定サピックスオープン
  - 合格力判定サピックスオープン
  - 学校別サピックスオープン
  - 組分けテスト
  - マンスリー確認テスト
  - マンスリー実力テスト
  - 確認テスト
  - 復習テスト
  - その他オープン
- ✅ 科目別得点・偏差値の記録（国語・算数・理科・社会）
- ✅ 2科目合計（得点・偏差値・順位・受験者数）
- ✅ 4科目合計（得点・偏差値・順位・受験者数）
- ✅ コース・クラス情報の記録
- ✅ Firestoreに `testScores` コレクションを追加

## 技術的変更

### 新規ファイル
- `src/utils/customUnits.js` - カスタム単元のCRUD操作
- `src/utils/pastPaperSessions.js` - 過去問セッション管理
- `src/utils/testScores.js` - テスト成績管理
- `src/components/UnitManager.jsx` - 単元管理画面
- `src/components/UnitManager.css` - 単元管理画面スタイル
- `src/components/PastPaperView.jsx` - 過去問表示画面
- `src/components/PastPaperView.css` - 過去問表示画面スタイル
- `src/components/TestScoreView.jsx` - テスト成績画面
- `src/components/TestScoreView.css` - テスト成績画面スタイル

### 変更ファイル
- `src/App.jsx` - 新しいビュー追加、ナビゲーション更新
- `src/components/TaskForm.jsx` - 過去問フィールド追加
- `src/components/TaskForm.css` - 過去問スタイル追加
- `src/components/UnitDashboard.jsx` - カスタム単元統合

## Firestore変更

以下のコレクションが追加されました：
- `users/{uid}/customUnits` - カスタム単元データ
- `users/{uid}/pastPaperSessions` - 過去問演習記録
- `users/{uid}/testScores` - テスト成績データ

## 次のステップ

### ⚠️ 必須作業
Firestoreセキュリティルールに以下を追加してください：

```javascript
match /testScores/{scoreId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

注：`pastPaperSessions` の権限は既に追加済みです。

## テスト
- ✅ ビルド成功（637.24 kB JS bundle）
- ✅ 全機能の動作確認済み
- ✅ モバイルレスポンシブ対応

## スクリーンショット
各機能は直感的なUIで実装されており、学年・科目別フィルタリング、視覚的なフィードバック、モーダルフォームによる入力をサポートしています。

---

## コミット履歴
- 2fa1e11 - Feature: Add SAPIX test score management system
- 7e3285d - Feature: Add comprehensive past paper management system with session tracking
- 8b7a794 - Feature: Add past paper management with school, year, and related units tracking
- a853b41 - Feature: Add Phase 2 unit management screen with edit/delete capabilities
- 840207c - Fix: Add custom units support to UnitDashboard
