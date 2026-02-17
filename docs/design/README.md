# 設計ドキュメント

## ファイル一覧

### 1. `database-schema.md`
データベーススキーマ設計書。Firestore/SQLite両対応の設計。

**主な内容:**
- 7つのコアテーブル設計
- 文字列コードを主キーとして使用（例: `CALC_BASIC`, `SPEC_CONC`）
- Firestoreマッピング
- セキュリティルール
- インデックス戦略

### 2. `master-units-initial-data.json`
単元マスタの初期データ（50単元）。

**データ構造:**
```json
{
  "id": "CALC_BASIC",           // 文字列コードID
  "name": "四則計算の基礎",      // 単元名
  "category": "計算",            // カテゴリ
  "difficulty_level": 1,         // 難易度 (1-5)
  "description": "...",          // 説明
  "learning_resources": [],      // 学習リソースURL
  "order_index": 10,             // 表示順序
  "is_active": true              // 有効/無効
}
```

**カテゴリ一覧:**
- `計算` - 四則計算、計算の工夫、単位換算など（4単元）
- `数の性質` - 約数・倍数（1単元）
- `規則性` - 数列、数表、日暦算、周期算（4単元）
- `特殊算` - 和差算、つるかめ算、仕事算など（15単元）
- `速さ` - 旅人算、通過算、流水算など（5単元）
- `割合` - 割合の基本、売買損益、食塩水（3単元）
- `比` - 比の基本、比例・反比例、速さと比（3単元）
- `平面図形` - 角度、面積、相似など（7単元）
- `立体図形` - 体積、立体の切断、水位の変化など（5単元）
- `場合の数` - 順列・組み合わせ（1単元）
- `グラフ・論理` - グラフ、条件整理（2単元）

---

## データのインポート方法

### Firestore（Firebase Admin SDK）

```javascript
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

async function importMasterUnits() {
  const data = JSON.parse(
    fs.readFileSync('./master-units-initial-data.json', 'utf8')
  );

  const batch = db.batch();

  data.forEach(tag => {
    const docRef = db.collection('masterUnits').doc(tag.id);
    batch.set(docRef, {
      ...tag,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log(`✅ ${data.length}件の単元マスタをインポートしました`);
}

importMasterUnits();
```

### SQLite

```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database.sqlite');

async function importMasterUnits() {
  const data = JSON.parse(
    fs.readFileSync('./master-units-initial-data.json', 'utf8')
  );

  const stmt = db.prepare(`
    INSERT INTO master_units
    (id, name, category, difficulty_level, description, learning_resources,
     order_index, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  data.forEach(tag => {
    stmt.run(
      tag.id,
      tag.name,
      tag.category,
      tag.difficulty_level,
      tag.description,
      JSON.stringify(tag.learning_resources),
      tag.order_index,
      tag.is_active ? 1 : 0,
      now,
      now
    );
  });

  stmt.finalize();
  console.log(`✅ ${data.length}件の単元マスタをインポートしました`);
}

importMasterUnits();
```

---

## データの検証

### カテゴリ別の単元数

```bash
cat master-units-initial-data.json | jq '[.[] | .category] | group_by(.) | map({category: .[0], count: length})'
```

### 難易度別の分布

```bash
cat master-units-initial-data.json | jq '[.[] | .difficulty_level] | group_by(.) | map({difficulty: .[0], count: length})'
```

### IDの重複チェック

```bash
cat master-units-initial-data.json | jq '[.[] | .id] | length' # 全件数
cat master-units-initial-data.json | jq '[.[] | .id] | unique | length' # ユニーク数
# 上記2つが同じであれば重複なし
```

---

## 次のステップ

1. **TypeScript型定義の作成**
   - Firestore用の型定義ファイル
   - バックエンド・フロントエンドで共有

2. **API仕様書の作成**
   - REST API / Cloud Functions の設計
   - 弱点分析ロジックの詳細

3. **実装**
   - Firestore セキュリティルールの実装
   - 初期データのインポートスクリプト作成
   - CRUD API の実装

4. **テストデータ作成**
   - 過去問データのサンプル作成
   - 解答履歴のダミーデータ作成
