# Firebase セットアップ手順

このアプリはFirebase Firestoreを使用して、PCとiPhone間でデータを同期します。以下の手順に従ってFirebaseをセットアップしてください。

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：sapix-learning-app）
4. Google アナリティクスは任意（不要な場合はオフにできます）
5. 「プロジェクトを作成」をクリック

## 2. Webアプリの登録

1. Firebase コンソールのプロジェクトページで「Web」アイコン（</>）をクリック
2. アプリのニックネームを入力（例：SAPIX学習管理）
3. 「このアプリのFirebase Hostingも設定します」はチェック不要
4. 「アプリを登録」をクリック
5. 表示される設定情報（firebaseConfig）をコピー

## 3. Firebaseの設定情報を追加

1. `src/firebase.js` ファイルを開く
2. 以下の部分を、先ほどコピーした設定情報で置き換える：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

例：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGH1234567890abcdefghijklmno",
  authDomain: "sapix-learning-app.firebaseapp.com",
  projectId: "sapix-learning-app",
  storageBucket: "sapix-learning-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
}
```

## 4. Authentication（認証）の設定

1. Firebase コンソールで「Authentication」をクリック
2. 「始める」をクリック
3. 「Sign-in method」タブをクリック
4. 「Google」をクリック
5. 有効化スイッチをオンにする
6. プロジェクトのサポートメールを選択
7. 「保存」をクリック

## 5. Cloud Firestoreの設定

1. Firebase コンソールで「Firestore Database」をクリック
2. 「データベースを作成」をクリック
3. ロケーションを選択（例：asia-northeast1（東京））
4. 「次へ」をクリック
5. セキュリティルールで「本番環境モード」を選択
6. 「作成」をクリック

## 6. Firestoreセキュリティルールの設定

1. Firestore Databaseの「ルール」タブをクリック
2. 以下のルールを入力：

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のデータのみ読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. 「公開」をクリック

## 7. アプリの起動

設定が完了したら、アプリをビルドして起動します：

```bash
cd child-learning-app
npm run build
npm run dev
```

## 8. データの同期確認

1. アプリにGoogleアカウントでログイン
2. タスクを追加
3. 別のデバイス（PCまたはiPhone）で同じアカウントでログイン
4. タスクが自動的に同期されることを確認

## トラブルシューティング

### ログインできない

- Firebase ConsoleでAuthenticationのGoogleが有効化されているか確認
- `src/firebase.js`の設定情報が正しいか確認
- ブラウザのコンソールにエラーが表示されていないか確認

### データが同期されない

- Firestoreが作成されているか確認
- Firestoreのセキュリティルールが正しく設定されているか確認
- ブラウザのコンソールにエラーが表示されていないか確認

### ビルドエラーが出る

- `npm install`を実行してパッケージが正しくインストールされているか確認
- `src/firebase.js`の設定情報が正しい形式か確認

## 注意事項

- Firebase の無料プラン（Spark Plan）では以下の制限があります：
  - Firestore: 1日あたり50,000回の読み取り、20,000回の書き込み
  - Authentication: 無制限
- 個人利用や小規模利用では無料プランで十分です
- セキュリティのため、`src/firebase.js`をGitHubなどにコミットする際は、API Keyが公開されることになりますが、Firestoreのセキュリティルールで保護されているため問題ありません
