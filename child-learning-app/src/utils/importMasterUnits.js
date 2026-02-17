/**
 * クライアント側から単元マスタをインポートするユーティリティ
 * iPhoneのブラウザから実行可能
 */

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// 単元マスタ初期データ（50単元）
const MASTER_UNITS_DATA = [
  // 計算 (4)
  { id: 'CALC_BASIC', name: '四則計算の基礎', category: '計算', difficulty_level: 1, order_index: 10 },
  { id: 'CALC_TRICK', name: '計算のくふう', category: '計算', difficulty_level: 2, order_index: 20 },
  { id: 'CALC_UNIT', name: '単位換算', category: '計算', difficulty_level: 2, order_index: 30 },
  { id: 'CALC_BOX', name: '□を求める計算', category: '計算', difficulty_level: 2, order_index: 40 },

  // 数の性質 (1)
  { id: 'NUM_DIVISOR', name: '約数・倍数', category: '数の性質', difficulty_level: 3, order_index: 50 },

  // 規則性 (4)
  { id: 'PATTERN_SEQ', name: '規則性(数列)', category: '規則性', difficulty_level: 3, order_index: 60 },
  { id: 'PATTERN_TABLE', name: '数表', category: '規則性', difficulty_level: 3, order_index: 70 },
  { id: 'PATTERN_CALENDAR', name: '日暦算', category: '規則性', difficulty_level: 2, order_index: 80 },
  { id: 'PATTERN_CYCLE', name: '周期算', category: '規則性', difficulty_level: 3, order_index: 90 },

  // 特殊算 (15)
  { id: 'SPEC_WACHA', name: '和差算', category: '特殊算', difficulty_level: 2, order_index: 100 },
  { id: 'SPEC_AGE', name: '年齢算', category: '特殊算', difficulty_level: 2, order_index: 110 },
  { id: 'SPEC_TSURU', name: 'つるかめ算', category: '特殊算', difficulty_level: 3, order_index: 120 },
  { id: 'SPEC_DIFF', name: '差集め算', category: '特殊算', difficulty_level: 3, order_index: 130 },
  { id: 'SPEC_EXCESS', name: '過不足算', category: '特殊算', difficulty_level: 3, order_index: 140 },
  { id: 'SPEC_TREE', name: '植木算', category: '特殊算', difficulty_level: 2, order_index: 150 },
  { id: 'SPEC_SQUARE', name: '方陣算', category: '特殊算', difficulty_level: 3, order_index: 160 },
  { id: 'SPEC_DISTRIB', name: '分配算', category: '特殊算', difficulty_level: 3, order_index: 170 },
  { id: 'SPEC_EQUIV', name: '相当算', category: '特殊算', difficulty_level: 3, order_index: 180 },
  { id: 'SPEC_RESTORE', name: '還元算', category: '特殊算', difficulty_level: 3, order_index: 190 },
  { id: 'SPEC_MULTIPLE', name: '倍数算', category: '特殊算', difficulty_level: 3, order_index: 200 },
  { id: 'SPEC_ELIM', name: '消去算', category: '特殊算', difficulty_level: 4, order_index: 210 },
  { id: 'SPEC_AVG', name: '平均算', category: '特殊算', difficulty_level: 2, order_index: 220 },
  { id: 'SPEC_WORK', name: '仕事算', category: '特殊算', difficulty_level: 4, order_index: 230 },
  { id: 'SPEC_NEWTON', name: 'ニュートン算', category: '特殊算', difficulty_level: 5, order_index: 240 },

  // 速さ (5)
  { id: 'SPEED_BASIC', name: '速さの基本', category: '速さ', difficulty_level: 2, order_index: 250 },
  { id: 'SPEED_TRAVEL', name: '旅人算', category: '速さ', difficulty_level: 3, order_index: 260 },
  { id: 'SPEED_PASS', name: '通過算', category: '速さ', difficulty_level: 3, order_index: 270 },
  { id: 'SPEED_RIVER', name: '流水算', category: '速さ', difficulty_level: 3, order_index: 280 },
  { id: 'SPEED_CLOCK', name: '時計算', category: '速さ', difficulty_level: 4, order_index: 290 },

  // 割合 (3)
  { id: 'RATIO_BASIC', name: '割合の基本', category: '割合', difficulty_level: 2, order_index: 300 },
  { id: 'RATIO_PROFIT', name: '売買損益', category: '割合', difficulty_level: 3, order_index: 310 },
  { id: 'RATIO_CONC', name: '食塩水', category: '割合', difficulty_level: 4, order_index: 320 },

  // 比 (3)
  { id: 'PROP_BASIC', name: '比の基本', category: '比', difficulty_level: 3, order_index: 330 },
  { id: 'PROP_RATIO', name: '比例・反比例', category: '比', difficulty_level: 3, order_index: 340 },
  { id: 'PROP_SPEED', name: '速さと比', category: '比', difficulty_level: 4, order_index: 350 },

  // 平面図形 (7)
  { id: 'PLANE_ANGLE', name: '角度', category: '平面図形', difficulty_level: 2, order_index: 360 },
  { id: 'PLANE_AREA', name: '面積', category: '平面図形', difficulty_level: 2, order_index: 370 },
  { id: 'PLANE_CIRCLE', name: '円・おうぎ形', category: '平面図形', difficulty_level: 3, order_index: 380 },
  { id: 'PLANE_EQUIV', name: '等積変形', category: '平面図形', difficulty_level: 4, order_index: 390 },
  { id: 'PLANE_MOVE', name: '図形の移動', category: '平面図形', difficulty_level: 3, order_index: 400 },
  { id: 'PLANE_SIMILAR', name: '相似', category: '平面図形', difficulty_level: 4, order_index: 410 },
  { id: 'PLANE_RATIO', name: '面積比・線分比', category: '平面図形', difficulty_level: 5, order_index: 420 },

  // 立体図形 (5)
  { id: 'SOLID_BASIC', name: '立体の名前・展開図', category: '立体図形', difficulty_level: 2, order_index: 430 },
  { id: 'SOLID_VOLUME', name: '体積・表面積', category: '立体図形', difficulty_level: 3, order_index: 440 },
  { id: 'SOLID_CUT', name: '立体の切断', category: '立体図形', difficulty_level: 5, order_index: 450 },
  { id: 'SOLID_ROTATE', name: '回転体', category: '立体図形', difficulty_level: 4, order_index: 460 },
  { id: 'SOLID_WATER', name: '水位の変化', category: '立体図形', difficulty_level: 4, order_index: 470 },

  // 場合の数 (1)
  { id: 'COMB_COUNT', name: '場合の数', category: '場合の数', difficulty_level: 4, order_index: 480 },

  // グラフ・論理 (2)
  { id: 'LOGIC_GRAPH', name: 'グラフ', category: 'グラフ・論理', difficulty_level: 3, order_index: 490 },
  { id: 'LOGIC_COND', name: '条件整理・論理', category: 'グラフ・論理', difficulty_level: 4, order_index: 500 }
]

/**
 * Firestoreに単元マスタをインポート
 * @param {Function} onProgress - 進捗コールバック (current, total, message)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export async function importMasterUnitsToFirestore(onProgress = null) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  }

  const total = MASTER_UNITS_DATA.length

  for (let i = 0; i < MASTER_UNITS_DATA.length; i++) {
    const unit = MASTER_UNITS_DATA[i]

    try {
      if (onProgress) {
        onProgress(i + 1, total, `インポート中: ${unit.name}`)
      }

      const docRef = doc(db, 'masterUnits', unit.id)

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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(docRef, firestoreData)
      results.success++
    } catch (error) {
      console.error(`エラー: ${unit.id}`, error)
      results.failed++
      results.errors.push({
        id: unit.id,
        name: unit.name,
        error: error.message
      })
    }
  }

  return results
}

/**
 * 統計情報を取得
 * @returns {Object}
 */
export function getMasterUnitsStats() {
  const categoryMap = {}

  MASTER_UNITS_DATA.forEach(unit => {
    if (!categoryMap[unit.category]) {
      categoryMap[unit.category] = {
        count: 0,
        totalDifficulty: 0
      }
    }
    categoryMap[unit.category].count++
    categoryMap[unit.category].totalDifficulty += unit.difficulty_level || 0
  })

  const categoryStats = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    count: data.count,
    avgDifficulty: (data.totalDifficulty / data.count).toFixed(1)
  }))

  return {
    totalUnits: MASTER_UNITS_DATA.length,
    categories: categoryStats.sort((a, b) => a.category.localeCompare(b.category))
  }
}
