# データインポートスクリプト

弱点分析システムの初期データをFirestoreにインポートするスクリプト集。

## セットアップ

### 1. 依存関係のインストール

```bash
cd scripts
npm install
```

### 2. Firebase Admin SDK サービスアカウントキーの取得

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクトを選択
3. 「プロジェクトの設定」→「サービスアカウント」タブ
4. 「新しい秘密鍵を生成」をクリック
5. ダウンロードしたJSONファイルを安全な場所に保存

**⚠️ セキュリティ警告:**
- サービスアカウントキーは**絶対にGitにコミットしない**こと
- `.gitignore` に `serviceAccountKey.json` を追加済み

---

## 使用方法

### 単元マスタのインポート

#### 方法1: 環境変数を使用

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
cd scripts
npm run import:master-units
```

#### 方法2: 引数でパスを指定

```bash
cd scripts
node import-master-units.js /path/to/serviceAccountKey.json
```

#### ドライラン（実際にはインポートしない）

データの検証とプレビューのみ実行:

```bash
cd scripts
npm run import:dry-run
# または
node import-master-units.js --dry-run
```

---

## スクリプト詳細

### `import-master-units.js`

単元マスタ（50単元）をFirestoreにインポートします。

**処理内容:**
1. データファイル読み込み (`docs/design/master-units-initial-data.json`)
2. データ検証（ID重複チェック、必須フィールドチェックなど）
3. カテゴリ別・難易度別の統計表示
4. Firestoreへのバッチインポート（500件ずつ）

**コレクション名:** `masterUnits`

**オプション:**
- `--dry-run`: ドライランモード（データは書き込まれない）

**出力例:**

```
========================================
単元マスタ データインポート
========================================

📂 50件の単元マスタデータを読み込みました

🔍 データ検証中...
✅ データ検証OK

📈 カテゴリ別統計:
   - グラフ・論理: 2件 (平均難易度 3.5)
   - 場合の数: 1件 (平均難易度 4.0)
   - 数の性質: 1件 (平均難易度 3.0)
   - 比: 3件 (平均難易度 3.7)
   - 特殊算: 15件 (平均難易度 3.1)
   - 立体図形: 5件 (平均難易度 3.6)
   - 規則性: 4件 (平均難易度 2.8)
   - 計算: 4件 (平均難易度 1.8)
   - 速さ: 5件 (平均難易度 3.2)
   - 割合: 3件 (平均難易度 3.0)
   - 平面図形: 7件 (平均難易度 3.4)

📈 難易度別統計:
   - レベル1: 1件
   - レベル2: 11件
   - レベル3: 20件
   - レベル4: 13件
   - レベル5: 5件

✅ Firebase Admin SDK を初期化しました

🚀 インポート開始...
   - バッチサイズ: 500
   - ドライラン: いいえ

✅ 50/50 件インポート完了

📊 インポート結果:
   - 成功: 50件
   - 失敗: 0件

✅ すべての処理が完了しました
```

---

## データ構造

### Firestore: `masterUnits` コレクション

```javascript
{
  id: 'CALC_BASIC',              // ドキュメントID（文字列コード）
  name: '四則計算の基礎',
  category: '計算',
  difficultyLevel: 1,            // 1-5
  description: '整数の四則演算の基本',
  learningResources: [],
  orderIndex: 10,
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## トラブルシューティング

### エラー: `Firebase認証情報が見つかりません`

**原因:** サービスアカウントキーが設定されていない

**解決策:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

または引数でパスを指定:
```bash
node import-master-units.js /path/to/serviceAccountKey.json
```

### エラー: `データファイルが見つかりません`

**原因:** `docs/design/master-units-initial-data.json` が存在しない

**解決策:**
- ファイルが正しい場所にあるか確認
- リポジトリのルートディレクトリで実行しているか確認

### エラー: `PERMISSION_DENIED`

**原因:** Firestoreセキュリティルールで書き込みが拒否されている

**解決策:**
- Admin SDKは セキュリティルールをバイパスするため、通常は発生しない
- プロジェクトIDが正しいか確認
- サービスアカウントに適切な権限があるか確認

---

## セキュリティのベストプラクティス

### ✅ すべき

- サービスアカウントキーは `.gitignore` に追加
- 環境変数で管理（`GOOGLE_APPLICATION_CREDENTIALS`）
- 本番環境ではCI/CDの秘密情報として管理

### ❌ してはいけない

- サービスアカウントキーをGitにコミット
- ハードコードでパスを指定
- 公開リポジトリにキーをアップロード

---

## 次のステップ

1. **Firestoreルールのデプロイ**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **データの確認**
   - Firebase Consoleで `masterUnits` コレクションを確認
   - 50件すべてインポートされているか確認

3. **過去問データのインポート**
   - `import-problems.js` スクリプトを作成（TODO）

4. **問題-タグ関連のインポート**
   - `import-problem-tags.js` スクリプトを作成（TODO）
