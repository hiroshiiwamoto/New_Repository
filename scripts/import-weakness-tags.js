/**
 * 弱点タグマスタの初期データインポートスクリプト
 *
 * 使用方法:
 *   1. Firebase Admin SDK サービスアカウントキーを用意
 *   2. 環境変数 GOOGLE_APPLICATION_CREDENTIALS にパスを設定
 *   3. npm install firebase-admin を実行
 *   4. node scripts/import-weakness-tags.js を実行
 *
 * または環境変数を使わずに直接パスを指定:
 *   node scripts/import-weakness-tags.js /path/to/serviceAccountKey.json
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin SDK の初期化
function initializeFirebase(serviceAccountPath) {
  if (admin.apps.length === 0) {
    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    } else {
      throw new Error(
        '❌ Firebase認証情報が見つかりません。\n' +
        '環境変数 GOOGLE_APPLICATION_CREDENTIALS を設定するか、\n' +
        'サービスアカウントキーのパスを引数に指定してください。'
      );
    }
    console.log('✅ Firebase Admin SDK を初期化しました');
  }
  return admin.firestore();
}

// 弱点タグマスタデータの読み込み
function loadWeaknessTagsData() {
  const dataPath = path.join(__dirname, '../docs/design/weakness-tags-initial-data.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ データファイルが見つかりません: ${dataPath}`);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📂 ${data.length}件の弱点タグデータを読み込みました`);
  return data;
}

// Firestoreにデータをインポート
async function importWeaknessTags(db, data, options = {}) {
  const { batchSize = 500, dryRun = false } = options;

  console.log(`\n🚀 インポート開始...`);
  console.log(`   - バッチサイズ: ${batchSize}`);
  console.log(`   - ドライラン: ${dryRun ? 'はい' : 'いいえ'}`);

  if (dryRun) {
    console.log('\n⚠️  ドライランモード: データは実際には書き込まれません\n');
    data.forEach((tag, index) => {
      console.log(`${index + 1}. [${tag.id}] ${tag.name} (${tag.category}, 難易度${tag.difficulty_level})`);
    });
    return;
  }

  let imported = 0;
  let failed = 0;
  const errors = [];

  // バッチ処理
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = db.batch();
    const chunk = data.slice(i, Math.min(i + batchSize, data.length));

    chunk.forEach(tag => {
      try {
        const docRef = db.collection('weaknessTags').doc(tag.id);

        // snake_case → camelCase 変換
        const firestoreData = {
          id: tag.id,
          name: tag.name,
          category: tag.category,
          difficultyLevel: tag.difficulty_level || null,
          description: tag.description || '',
          learningResources: tag.learning_resources || [],
          orderIndex: tag.order_index || 0,
          isActive: tag.is_active !== false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(docRef, firestoreData);
      } catch (error) {
        failed++;
        errors.push({ tag: tag.id, error: error.message });
      }
    });

    try {
      await batch.commit();
      imported += chunk.length;
      console.log(`✅ ${imported}/${data.length} 件インポート完了`);
    } catch (error) {
      console.error(`❌ バッチ処理エラー: ${error.message}`);
      failed += chunk.length;
    }
  }

  // 結果サマリー
  console.log('\n📊 インポート結果:');
  console.log(`   - 成功: ${imported}件`);
  console.log(`   - 失敗: ${failed}件`);

  if (errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    errors.forEach(({ tag, error }) => {
      console.log(`   - ${tag}: ${error}`);
    });
  }
}

// カテゴリ別の統計を表示
function showStatistics(data) {
  console.log('\n📈 カテゴリ別統計:');

  const categoryMap = {};
  data.forEach(tag => {
    if (!categoryMap[tag.category]) {
      categoryMap[tag.category] = [];
    }
    categoryMap[tag.category].push(tag);
  });

  Object.keys(categoryMap).sort().forEach(category => {
    const tags = categoryMap[category];
    const avgDifficulty = tags.reduce((sum, t) => sum + (t.difficulty_level || 0), 0) / tags.length;
    console.log(`   - ${category}: ${tags.length}件 (平均難易度 ${avgDifficulty.toFixed(1)})`);
  });

  console.log('\n📈 難易度別統計:');
  const difficultyMap = {};
  data.forEach(tag => {
    const level = tag.difficulty_level || 0;
    difficultyMap[level] = (difficultyMap[level] || 0) + 1;
  });

  Object.keys(difficultyMap).sort().forEach(level => {
    console.log(`   - レベル${level}: ${difficultyMap[level]}件`);
  });
}

// データの検証
function validateData(data) {
  console.log('\n🔍 データ検証中...');

  const issues = [];
  const idSet = new Set();

  data.forEach((tag, index) => {
    // ID重複チェック
    if (idSet.has(tag.id)) {
      issues.push(`重複ID: ${tag.id}`);
    }
    idSet.add(tag.id);

    // 必須フィールドチェック
    if (!tag.id) issues.push(`${index + 1}行目: IDが空`);
    if (!tag.name) issues.push(`${index + 1}行目: 名前が空`);
    if (!tag.category) issues.push(`${index + 1}行目: カテゴリが空`);

    // 難易度範囲チェック
    if (tag.difficulty_level && (tag.difficulty_level < 1 || tag.difficulty_level > 5)) {
      issues.push(`${tag.id}: 難易度は1-5の範囲で指定してください`);
    }
  });

  if (issues.length > 0) {
    console.log('❌ データに問題があります:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }

  console.log('✅ データ検証OK');
  return true;
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const serviceAccountPath = args[0];

  console.log('========================================');
  console.log('弱点タグマスタ データインポート');
  console.log('========================================\n');

  try {
    // データ読み込み
    const data = loadWeaknessTagsData();

    // データ検証
    if (!validateData(data)) {
      process.exit(1);
    }

    // 統計表示
    showStatistics(data);

    // Firebase初期化
    const db = initializeFirebase(serviceAccountPath);

    // オプション
    const options = {
      batchSize: 500,
      dryRun: args.includes('--dry-run')
    };

    // インポート実行
    await importWeaknessTags(db, data, options);

    console.log('\n✅ すべての処理が完了しました\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプト実行
main();
