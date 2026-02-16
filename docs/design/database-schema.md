# データベーススキーマ設計

## 概要

中学受験算数の弱点分析システムのデータベース設計。
Firebase Firestore (NoSQL) を使用するが、将来的なSQLiteマイグレーションも考慮した設計。

**ID方式**: 文字列コードを主キーとして使用（例: `CALC_BASIC`, `SPEC_CONC`）

---

## 1. 弱点タグマスタ (`weakness_tags`)

算数の単元・テーマを管理するマスタテーブル。

### テーブル定義

```sql
CREATE TABLE weakness_tags (
  id TEXT PRIMARY KEY,              -- 単元コード (例: CALC_BASIC, SPEC_CONC)
  name TEXT NOT NULL,               -- 単元名 (例: 四則計算の基礎)
  category TEXT NOT NULL,           -- カテゴリ (計算, 特殊算, etc.)
  difficulty_level INTEGER,         -- 難易度 (1-5)
  description TEXT,                 -- 説明
  learning_resources TEXT,          -- 学習リソースURL (JSON配列)
  order_index INTEGER DEFAULT 0,    -- 表示順序
  is_active BOOLEAN DEFAULT TRUE,   -- 有効/無効
  created_at TEXT NOT NULL,         -- 作成日時 (ISO 8601)
  updated_at TEXT NOT NULL          -- 更新日時 (ISO 8601)
);

CREATE INDEX idx_weakness_tags_category ON weakness_tags(category);
CREATE INDEX idx_weakness_tags_difficulty ON weakness_tags(difficulty_level);
CREATE INDEX idx_weakness_tags_order ON weakness_tags(order_index);
```

### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|-----|------|------|-----|
| `id` | TEXT | ✓ | 単元コード（主キー） | `CALC_BASIC` |
| `name` | TEXT | ✓ | 単元名 | `四則計算の基礎` |
| `category` | TEXT | ✓ | カテゴリ | `計算` |
| `difficulty_level` | INTEGER | - | 難易度 (1-5) | `2` |
| `description` | TEXT | - | 説明・解説 | `整数の四則演算...` |
| `learning_resources` | TEXT | - | 学習リソースURL (JSON配列) | `["https://..."]` |
| `order_index` | INTEGER | - | 表示順序 | `10` |
| `is_active` | BOOLEAN | - | 有効/無効 | `TRUE` |
| `created_at` | TEXT | ✓ | 作成日時 (ISO 8601) | `2024-01-01T00:00:00Z` |
| `updated_at` | TEXT | ✓ | 更新日時 (ISO 8601) | `2024-01-01T00:00:00Z` |

### データ例

```json
[
  {
    "id": "CALC_BASIC",
    "name": "四則計算の基礎",
    "category": "計算",
    "difficulty_level": 1,
    "description": "整数の四則演算の基本",
    "learning_resources": ["https://example.com/calc-basic"],
    "order_index": 10,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "CALC_TRICK",
    "name": "計算の工夫",
    "category": "計算",
    "difficulty_level": 2,
    "description": "計算順序を工夫して効率化",
    "learning_resources": ["https://example.com/calc-trick"],
    "order_index": 20,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "SPEC_CONC",
    "name": "濃度算",
    "category": "特殊算",
    "difficulty_level": 4,
    "description": "食塩水や混合物の濃度を扱う問題",
    "learning_resources": ["https://example.com/concentration"],
    "order_index": 100,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### カテゴリ一覧（案）

- `計算` - 四則計算、小数・分数計算、概算など
- `特殊算` - 濃度算、速さ、植木算、ニュートン算など
- `文章題` - 割合、比、数の性質など
- `図形` - 平面図形、立体図形、図形の移動など
- `場合の数` - 順列・組み合わせ、確率など
- `規則性` - 数列、群数列、周期算など
- `論理` - 推理、条件整理など

---

## 2. 過去問管理 (`problems`)

過去の入試問題を管理するテーブル。

### テーブル定義

```sql
CREATE TABLE problems (
  id TEXT PRIMARY KEY,              -- 問題ID (例: kaisei_2024_001)
  school_name TEXT NOT NULL,        -- 学校名
  exam_year INTEGER NOT NULL,       -- 入試年度
  problem_number TEXT NOT NULL,     -- 問題番号 (大問1, 小問(2)など)
  difficulty INTEGER NOT NULL,      -- 難易度 (1-5)
  estimated_time INTEGER,           -- 想定解答時間（分）
  question_text TEXT,               -- 問題文
  answer TEXT,                      -- 解答
  solution TEXT,                    -- 解説
  image_url TEXT,                   -- 問題画像URL
  source_url TEXT,                  -- 出典URL
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_problems_school_year ON problems(school_name, exam_year);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
```

### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|-----|------|------|-----|
| `id` | TEXT | ✓ | 問題ID（主キー） | `kaisei_2024_001` |
| `school_name` | TEXT | ✓ | 学校名 | `開成中学校` |
| `exam_year` | INTEGER | ✓ | 入試年度 | `2024` |
| `problem_number` | TEXT | ✓ | 問題番号 | `大問1(2)` |
| `difficulty` | INTEGER | ✓ | 難易度 (1-5) | `4` |
| `estimated_time` | INTEGER | - | 想定解答時間（分） | `8` |
| `question_text` | TEXT | - | 問題文 | `次の計算をしなさい...` |
| `answer` | TEXT | - | 解答 | `42` |
| `solution` | TEXT | - | 解説 | `まず、...` |
| `image_url` | TEXT | - | 問題画像URL | `gs://bucket/problems/kaisei_2024_001.png` |
| `source_url` | TEXT | - | 出典URL | `https://...` |
| `created_at` | TEXT | ✓ | 作成日時 | `2024-01-01T00:00:00Z` |
| `updated_at` | TEXT | ✓ | 更新日時 | `2024-01-01T00:00:00Z` |

---

## 3. 問題-弱点タグ中間テーブル (`problem_weakness_tags`)

問題と弱点タグの多対多の関係を管理。

### テーブル定義

```sql
CREATE TABLE problem_weakness_tags (
  id TEXT PRIMARY KEY,              -- UUID
  problem_id TEXT NOT NULL,         -- 問題ID (外部キー: problems.id)
  tag_id TEXT NOT NULL,             -- タグID (外部キー: weakness_tags.id)
  relevance_score REAL DEFAULT 1.0, -- 関連度スコア (0.0-1.0)
  created_at TEXT NOT NULL,

  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES weakness_tags(id) ON DELETE CASCADE,
  UNIQUE(problem_id, tag_id)        -- 同じ組み合わせは重複不可
);

CREATE INDEX idx_pwt_problem ON problem_weakness_tags(problem_id);
CREATE INDEX idx_pwt_tag ON problem_weakness_tags(tag_id);
CREATE INDEX idx_pwt_relevance ON problem_weakness_tags(relevance_score);
```

### フィールド詳細

| フィールド | 型 | 必須 | 説明 | 例 |
|-----------|-----|------|------|-----|
| `id` | TEXT | ✓ | UUID（主キー） | `550e8400-...` |
| `problem_id` | TEXT | ✓ | 問題ID（外部キー） | `kaisei_2024_001` |
| `tag_id` | TEXT | ✓ | タグID（外部キー） | `SPEC_CONC` |
| `relevance_score` | REAL | - | 関連度スコア (0.0-1.0) | `0.8` |
| `created_at` | TEXT | ✓ | 作成日時 | `2024-01-01T00:00:00Z` |

### データ例

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "problem_id": "kaisei_2024_001",
    "tag_id": "SPEC_CONC",
    "relevance_score": 1.0,
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "problem_id": "kaisei_2024_001",
    "tag_id": "RATIO_CALC",
    "relevance_score": 0.7,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## 4. ユーザー (`users`)

生徒のアカウント情報を管理。

### テーブル定義

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Firebase Auth UID
  email TEXT UNIQUE,                -- メールアドレス
  display_name TEXT,                -- 表示名
  grade TEXT,                       -- 学年 (小3, 小4, 小5, 小6)
  target_schools TEXT,              -- 志望校リスト (JSON配列)
  avatar_url TEXT,                  -- プロフィール画像URL
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_grade ON users(grade);
```

---

## 5. 解答履歴 (`answer_history`)

生徒の過去問解答履歴を記録。

### テーブル定義

```sql
CREATE TABLE answer_history (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- ユーザーID (外部キー: users.id)
  problem_id TEXT NOT NULL,         -- 問題ID (外部キー: problems.id)
  is_correct BOOLEAN NOT NULL,      -- 正解/不正解
  user_answer TEXT,                 -- 生徒の解答
  time_spent INTEGER,               -- 解答時間（秒）
  confidence_level INTEGER,         -- 自信度 (1-5)
  notes TEXT,                       -- メモ
  answered_at TEXT NOT NULL,        -- 解答日時
  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX idx_answer_history_user ON answer_history(user_id);
CREATE INDEX idx_answer_history_problem ON answer_history(problem_id);
CREATE INDEX idx_answer_history_answered_at ON answer_history(answered_at);
CREATE INDEX idx_answer_history_correct ON answer_history(is_correct);
```

---

## 6. ユーザー弱点スコア (`user_weakness_scores`)

生徒ごとの弱点タグ別スコアを管理（集計テーブル）。

### テーブル定義

```sql
CREATE TABLE user_weakness_scores (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- ユーザーID (外部キー: users.id)
  tag_id TEXT NOT NULL,             -- タグID (外部キー: weakness_tags.id)
  total_attempts INTEGER DEFAULT 0, -- 挑戦回数
  correct_count INTEGER DEFAULT 0,  -- 正解数
  accuracy_rate REAL DEFAULT 0.0,   -- 正答率 (0.0-1.0)
  avg_time_spent REAL,              -- 平均解答時間（秒）
  last_attempted_at TEXT,           -- 最終挑戦日時
  weakness_level INTEGER DEFAULT 0, -- 弱点レベル (0-5, 5が最も弱い)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES weakness_tags(id) ON DELETE CASCADE,
  UNIQUE(user_id, tag_id)
);

CREATE INDEX idx_uws_user ON user_weakness_scores(user_id);
CREATE INDEX idx_uws_tag ON user_weakness_scores(tag_id);
CREATE INDEX idx_uws_weakness_level ON user_weakness_scores(weakness_level);
CREATE INDEX idx_uws_accuracy ON user_weakness_scores(accuracy_rate);
```

### 弱点レベルの計算ロジック（案）

```javascript
function calculateWeaknessLevel(accuracyRate, totalAttempts) {
  if (totalAttempts < 3) return 0; // データ不足

  if (accuracyRate >= 0.9) return 0;      // 弱点なし
  if (accuracyRate >= 0.7) return 1;      // 軽度の弱点
  if (accuracyRate >= 0.5) return 2;      // 中程度の弱点
  if (accuracyRate >= 0.3) return 3;      // 重度の弱点
  if (accuracyRate >= 0.1) return 4;      // 非常に重度の弱点
  return 5;                               // 致命的な弱点
}
```

---

## 7. レコメンド履歴 (`recommendation_history`)

AIが生成した学習レコメンドの履歴を記録。

### テーブル定義

```sql
CREATE TABLE recommendation_history (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- ユーザーID (外部キー: users.id)
  recommended_tag_ids TEXT NOT NULL,-- レコメンドタグID (JSON配列)
  recommended_problems TEXT NOT NULL,-- レコメンド問題ID (JSON配列)
  reasoning TEXT,                   -- レコメンド理由
  accepted BOOLEAN,                 -- ユーザーが受け入れたか
  feedback TEXT,                    -- ユーザーフィードバック
  created_at TEXT NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_rec_history_user ON recommendation_history(user_id);
CREATE INDEX idx_rec_history_created_at ON recommendation_history(created_at);
```

---

## Firestore マッピング

### コレクション構造

```
weaknessTags/
  {id}
    - id: string (例: "CALC_BASIC")
    - name: string
    - category: string
    - difficultyLevel: number
    - description: string
    - learningResources: string[]
    - orderIndex: number
    - isActive: boolean
    - createdAt: Timestamp
    - updatedAt: Timestamp

problems/
  {id}
    - id: string (例: "kaisei_2024_001")
    - schoolName: string
    - examYear: number
    - problemNumber: string
    - difficulty: number
    - estimatedTime: number
    - questionText: string
    - answer: string
    - solution: string
    - imageUrl: string
    - sourceUrl: string
    - createdAt: Timestamp
    - updatedAt: Timestamp

problemWeaknessTags/
  {id}
    - id: string (UUID)
    - problemId: string
    - tagId: string (例: "SPEC_CONC")
    - relevanceScore: number
    - createdAt: Timestamp

users/
  {id}
    - id: string (Firebase Auth UID)
    - email: string
    - displayName: string
    - grade: string
    - targetSchools: string[]
    - avatarUrl: string
    - createdAt: Timestamp
    - updatedAt: Timestamp

answerHistory/
  {id}
    - id: string (UUID)
    - userId: string
    - problemId: string
    - isCorrect: boolean
    - userAnswer: string
    - timeSpent: number
    - confidenceLevel: number
    - notes: string
    - answeredAt: Timestamp
    - createdAt: Timestamp

userWeaknessScores/
  {id}
    - id: string (UUID)
    - userId: string
    - tagId: string (例: "SPEC_CONC")
    - totalAttempts: number
    - correctCount: number
    - accuracyRate: number
    - avgTimeSpent: number
    - lastAttemptedAt: Timestamp
    - weaknessLevel: number
    - createdAt: Timestamp
    - updatedAt: Timestamp

recommendationHistory/
  {id}
    - id: string (UUID)
    - userId: string
    - recommendedTagIds: string[] (例: ["SPEC_CONC", "RATIO_CALC"])
    - recommendedProblems: string[]
    - reasoning: string
    - accepted: boolean
    - feedback: string
    - createdAt: Timestamp
```

---

## セキュリティルール（Firestore）

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 認証済みユーザーのみアクセス可能
    function isAuthenticated() {
      return request.auth != null;
    }

    // 自分自身のデータかチェック
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // 弱点タグマスタ（全員読み取り可、管理者のみ書き込み可）
    match /weaknessTags/{tagId} {
      allow read: if isAuthenticated();
      allow write: if false; // 管理者のみ（Cloud Functionsから）
    }

    // 過去問（全員読み取り可、管理者のみ書き込み可）
    match /problems/{problemId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // 問題-タグ中間テーブル（全員読み取り可、管理者のみ書き込み可）
    match /problemWeaknessTags/{id} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // ユーザー（自分のみ読み書き可）
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // 解答履歴（自分のみ読み書き可）
    match /answerHistory/{id} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    // ユーザー弱点スコア（自分のみ読み取り可、システムのみ書き込み可）
    match /userWeaknessScores/{id} {
      allow read: if isOwner(resource.data.userId);
      allow write: if false; // Cloud Functionsから自動計算
    }

    // レコメンド履歴（自分のみ読み書き可）
    match /recommendationHistory/{id} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }
  }
}
```

---

## データ初期投入計画

### 1. 弱点タグマスタデータ

初期データとして約50-100件の単元タグを投入予定。

**投入方法**:
- CSV/JSONファイルを作成
- Admin SDKまたはFirebase CLIでバッチインポート

**データ構造例**:
```csv
id,name,category,difficulty_level,order_index
CALC_BASIC,四則計算の基礎,計算,1,10
CALC_TRICK,計算の工夫,計算,2,20
CALC_DECIMAL,小数の計算,計算,2,30
CALC_FRACTION,分数の計算,計算,3,40
SPEC_CONC,濃度算,特殊算,4,100
SPEC_TRAVEL,旅人算,特殊算,3,110
...
```

### 2. 過去問データ

- 初期フェーズ: 主要校の過去3年分（約100-200問）
- 段階的に拡充

### 3. タグ付け作業

- 各問題に2-5個のタグを付与
- 自動タグ付け（AI） + 手動レビュー

---

## マイグレーション戦略

### Firestore → SQLite 移行時の考慮点

1. **ID体系**: 文字列IDはそのまま移行可能
2. **Timestamp**: ISO 8601形式の文字列で統一
3. **配列フィールド**: JSON文字列として格納
4. **インデックス**: 上記の `CREATE INDEX` を適用
5. **外部キー制約**: SQLiteで有効化（`PRAGMA foreign_keys = ON;`）

### 移行スクリプト例

```javascript
// Firestore → SQLite 移行スクリプト（概要）
async function migrateFirestoreToSQLite() {
  const db = await openSQLiteDB();

  // 1. 弱点タグマスタ
  const tags = await firestore.collection('weaknessTags').get();
  for (const doc of tags.docs) {
    const data = doc.data();
    await db.run(`
      INSERT INTO weakness_tags VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.id,
      data.name,
      data.category,
      data.difficultyLevel,
      data.description,
      JSON.stringify(data.learningResources),
      data.orderIndex,
      data.isActive,
      data.createdAt.toISOString(),
      data.updatedAt.toISOString()
    ]);
  }

  // 2-7. 他のテーブルも同様に移行
}
```

---

## パフォーマンス最適化

### インデックス戦略

- **検索頻度の高いフィールド**: `category`, `difficulty`, `user_id`, `tag_id`
- **ソートに使用するフィールド**: `order_index`, `answered_at`, `created_at`
- **複合インデックス**: 必要に応じて追加（例: `(user_id, tag_id, answered_at)`）

### Firestore クエリ例

```javascript
// 特定カテゴリの弱点タグを取得（難易度順）
const tags = await firestore
  .collection('weaknessTags')
  .where('category', '==', '特殊算')
  .where('isActive', '==', true)
  .orderBy('orderIndex')
  .get();

// 特定ユーザーの弱点スコア（弱点レベル順）
const scores = await firestore
  .collection('userWeaknessScores')
  .where('userId', '==', currentUserId)
  .where('weaknessLevel', '>=', 2)
  .orderBy('weaknessLevel', 'desc')
  .orderBy('accuracyRate', 'asc')
  .limit(10)
  .get();

// 特定問題に関連するタグを取得
const problemTags = await firestore
  .collection('problemWeaknessTags')
  .where('problemId', '==', 'kaisei_2024_001')
  .orderBy('relevanceScore', 'desc')
  .get();
```

---

## 今後の拡張

### Phase 2で追加予定のテーブル

1. **学習プラン** (`learning_plans`)
   - ユーザーごとの学習計画を管理

2. **達成バッジ** (`achievements`)
   - モチベーション向上のためのバッジシステム

3. **保護者アカウント** (`parent_accounts`)
   - 保護者による進捗確認機能

4. **問題コメント** (`problem_comments`)
   - 問題に対する質問・メモ機能

---

## まとめ

- **ID方式**: 文字列コード（`CALC_BASIC` など）を主キーとして使用
- **メリット**: 人間が読みやすく、検索性・デバッグ性が高い
- **デメリット**: IDが長い（ストレージ効率は若干劣る）、後から変更しにくい
- **Firestore/SQLite 両対応**: 将来的なマイグレーションを考慮した設計

次のステップ:
1. 弱点タグマスタの初期データ作成
2. Firestore セキュリティルールの実装
3. バックエンドAPI設計（次のドキュメント）
