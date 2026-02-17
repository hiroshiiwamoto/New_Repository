/**
 * 単元マスタの初期データインポートスクリプト
 *
 * 使用方法:
 *   1. Firebase Admin SDK サービスアカウントキーを用意
 *   2. 環境変数 GOOGLE_APPLICATION_CREDENTIALS にパスを設定
 *   3. npm install firebase-admin を実行
 *   4. node scripts/import-master-units.js を実行
 *
 * または環境変数を使わずに直接パスを指定:
 *   node scripts/import-master-units.js /path/to/serviceAccountKey.json
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

// 単元マスタデータの読み込み
function loadMasterUnitsData() {
  const dataPath = path.join(__dirname, '../docs/design/master-units-initial-data.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`❌ データファイルが見つかりません: ${dataPath}`);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📂 ${data.length}件の単元マスタデータを読み込みました`);
  return data;
}

// Firestoreにデータをインポート
async function importMasterUnits(db, data, options = {}) {
  const { batchSize = 500, dryRun = false } = options;

  console.log(`\n🚀 インポート開始...`);
  console.log(`   - バッチサイズ: ${batchSize}`);
  console.log(`   - ドライラン: ${dryRun ? 'はい' : 'いいえ'}`);

  if (dryRun) {
    console.log('\n⚠️  ドライランモード: データは実際には書き込まれません\n');
    data.forEach((unit, index) => {
      console.log(`${index + 1}. [${unit.id}] ${unit.name} (${unit.category}, 難易度${unit.difficulty_level})`);
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

    chunk.forEach(unit => {
      try {
        const docRef = db.collection('masterUnits').doc(unit.id);

        // snake_case → camelCase 変換
        const firestoreData = {
          id: unit.id,
          name: unit.name,
          category: unit.category,
          difficultyLevel: unit.difficulty_level || null,
          description: unit.description || '',
          learningResources: unit.learning_resources || [],
          orderIndex: unit.order_index || 0,
          isActive: unit.is_active !== false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(docRef, firestoreData);
      } catch (error) {
        failed++;
        errors.push({ unit: unit.id, error: error.message });
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
    errors.forEach(({ unit, error }) => {
      console.log(`   - ${unit}: ${error}`);
    });
  }
}

// カテゴリ別の統計を表示
function showStatistics(data) {
  console.log('\n📈 カテゴリ別統計:');

  const categoryMap = {};
  data.forEach(unit => {
    if (!categoryMap[unit.category]) {
      categoryMap[unit.category] = [];
    }
    categoryMap[unit.category].push(unit);
  });

  Object.keys(categoryMap).sort().forEach(category => {
    const units = categoryMap[category];
    const avgDifficulty = units.reduce((sum, u) => sum + (u.difficulty_level || 0), 0) / units.length;
    console.log(`   - ${category}: ${units.length}件 (平均難易度 ${avgDifficulty.toFixed(1)})`);
  });

  console.log('\n📈 難易度別統計:');
  const difficultyMap = {};
  data.forEach(unit => {
    const level = unit.difficulty_level || 0;
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

  data.forEach((unit, index) => {
    // ID重複チェック
    if (idSet.has(unit.id)) {
      issues.push(`重複ID: ${unit.id}`);
    }
    idSet.add(unit.id);

    // 必須フィールドチェック
    if (!unit.id) issues.push(`${index + 1}行目: IDが空`);
    if (!unit.name) issues.push(`${index + 1}行目: 名前が空`);
    if (!unit.category) issues.push(`${index + 1}行目: カテゴリが空`);

    // 難易度範囲チェック
    if (unit.difficulty_level && (unit.difficulty_level < 1 || unit.difficulty_level > 5)) {
      issues.push(`${unit.id}: 難易度は1-5の範囲で指定してください`);
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

  // オプション引数を除外してサービスアカウントパスを取得
  const serviceAccountPath = args.find(arg => !arg.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  console.log('========================================');
  console.log('単元マスタ データインポート');
  console.log('========================================\n');

  try {
    // データ読み込み
    const data = loadMasterUnitsData();

    // データ検証
    if (!validateData(data)) {
      process.exit(1);
    }

    // 統計表示
    showStatistics(data);

    // ドライランの場合はFirebase初期化をスキップ
    let db = null;
    if (!dryRun) {
      // Firebase初期化
      db = initializeFirebase(serviceAccountPath);
    }

    // オプション
    const options = {
      batchSize: 500,
      dryRun: dryRun
    };

    // インポート実行
    await importMasterUnits(db, data, options);

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
