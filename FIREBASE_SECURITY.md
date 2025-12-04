# 🔐 Firebaseセキュリティルール設定ガイド

このドキュメントでは、Firebaseセキュリティルールの設定方法を説明します。

## 📋 概要

このプロジェクトでは、以下のFirestoreセキュリティルールが設定されています：

- ✅ 認証されたユーザーのみがデータにアクセス可能
- ✅ 各ユーザーは自分のデータのみ読み書き可能
- ✅ 他のユーザーのデータへのアクセスは完全にブロック

## 🚀 デプロイ方法

### 方法1: Firebase Console（推奨・簡単）

1. **Firebase Consoleにアクセス**
   ```
   https://console.firebase.google.com/project/studyapp-28e08
   ```

2. **Firestoreセクションに移動**
   - 左メニューから「Firestore Database」をクリック
   - 上部タブから「ルール」をクリック

3. **ルールを編集**
   - `firestore.rules` ファイルの内容をコピー
   - Firebase Consoleのエディタに貼り付け
   - 「公開」ボタンをクリック

4. **確認**
   - ルールが公開されたら完了です

### 方法2: Firebase CLI（自動化）

Firebase CLIを使用すると、コマンドラインからルールをデプロイできます。

#### ステップ1: Firebase CLIをインストール

```bash
npm install -g firebase-tools
```

#### ステップ2: Firebaseにログイン

```bash
firebase login
```

ブラウザが開き、Googleアカウントでログインを求められます。

#### ステップ3: プロジェクトを初期化（初回のみ）

```bash
firebase init firestore
```

- プロジェクト: `studyapp-28e08` を選択
- ルールファイル: `firestore.rules` を指定
- インデックスファイル: `firestore.indexes.json` を指定

#### ステップ4: ルールをデプロイ

```bash
firebase deploy --only firestore:rules
```

成功すると以下のようなメッセージが表示されます：
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/studyapp-28e08/overview
```

## 📁 ファイル構成

```
New_Repository/
├── firestore.rules           # Firestoreセキュリティルール
├── firestore.indexes.json    # Firestoreインデックス設定
├── firebase.json             # Firebase設定ファイル
└── .firebaserc              # Firebaseプロジェクト設定
```

## 🔍 セキュリティルールの詳細

### 基本ルール

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

このルールは以下を保証します：
- ✅ ログインしているユーザーのみアクセス可能
- ✅ `{userId}` が自分のUIDと一致する場合のみ読み書き可能

### サブコレクション

各サブコレクション（tasks, customUnits, pastPaperSessions, testScores）も同じルールを継承しています。

```javascript
match /tasks/{taskId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## ⚠️ 重要な注意事項

### 1. ルールが未設定の場合のリスク

ルールが未設定の場合、**誰でもデータベースの全データを読み書きできます**。これは以下のリスクがあります：

- 🚨 他のユーザーの個人情報が漏洩
- 🚨 悪意のあるユーザーがデータを改ざん・削除
- 🚨 大量のデータを書き込まれてコストが増大

### 2. ルールのテスト方法

Firebase Consoleでルールをテストできます：

1. Firestore Database > ルール
2. 「ルールプレイグラウンド」タブをクリック
3. テストケースを実行

例：
```
Location: /users/test-user-id/tasks/task-1
Auth UID: test-user-id
Operation: read
→ ✅ Allow（自分のデータなのでOK）

Location: /users/other-user-id/tasks/task-1
Auth UID: test-user-id
Operation: read
→ ❌ Deny（他人のデータなのでNG）
```

## 🔄 インデックスについて

`firestore.indexes.json` には、複合クエリ用のインデックスが定義されています。

現在のインデックス：
- `pastPaperSessions`: `taskId` + `studiedAt` の複合インデックス

新しいクエリを追加した際にインデックスエラーが出た場合：
1. Firebase Consoleのエラーメッセージに表示されるURLをクリック
2. 自動的にインデックスが作成されます

または、`firestore.indexes.json` に手動で追加してデプロイできます。

## 📞 サポート

ルール設定に関する問題が発生した場合：
1. Firebase Consoleのログを確認
2. ブラウザの開発者ツールでエラーメッセージを確認
3. [Firebase公式ドキュメント](https://firebase.google.com/docs/firestore/security/get-started)を参照

## ✅ チェックリスト

デプロイ前に以下を確認してください：

- [ ] Firebase Consoleにログインできる
- [ ] プロジェクトID `studyapp-28e08` が正しい
- [ ] `firestore.rules` ファイルが存在する
- [ ] ルールをデプロイまたはFirebase Consoleで手動設定した
- [ ] ルールのテストを実行して正しく動作することを確認した
- [ ] アプリケーションで認証後にデータの読み書きができることを確認した

---

**最終更新**: 2025年12月4日
