/**
 * マスター単元 管理モジュール
 *
 * 教科別データは src/utils/masterUnits/ 以下で管理。
 * 単元の追加・変更は各教科ファイルを直接編集してください。
 *   算数: masterUnits/sansu.js
 *   国語: masterUnits/kokugo.js
 *   理科: masterUnits/rika.js
 *   社会: masterUnits/shakai.js
 */

import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { SANSU_UNITS } from './masterUnits/sansu'
import { KOKUGO_UNITS } from './masterUnits/kokugo'
import { RIKA_UNITS } from './masterUnits/rika'
import { SHAKAI_UNITS } from './masterUnits/shakai'

// 教科ラベルの定義（表示名とIDプレフィックスの対応）
export const SUBJECTS = {
  算数: { label: '算数', color: '#3b82f6' },
  国語: { label: '国語', color: '#ec4899' },
  理科: { label: '理科', color: '#10b981' },
  社会: { label: '社会', color: '#f59e0b' },
}

// 全教科データ（subject フィールドを付与して統合）
export const MASTER_UNITS_DATA = [
  ...SANSU_UNITS.map(u => ({ ...u, subject: '算数' })),
  ...KOKUGO_UNITS.map(u => ({ ...u, subject: '国語' })),
  ...RIKA_UNITS.map(u => ({ ...u, subject: '理科' })),
  ...SHAKAI_UNITS.map(u => ({ ...u, subject: '社会' })),
]

/**
 * 静的な単元データを返す（オフライン・フォールバック用）
 * @param {string|null} subject - 絞り込む教科名。null の場合は全教科
 * @returns {Array}
 */
export function getStaticMasterUnits(subject = null) {
  const mapped = MASTER_UNITS_DATA.map(u => ({
    id: u.id,
    name: u.name,
    subject: u.subject,
    category: u.category,
    difficultyLevel: u.difficulty_level || null,
    description: u.description || '',
    orderIndex: u.order_index || 0,
    isActive: true,
  }))
  return subject ? mapped.filter(u => u.subject === subject) : mapped
}

/**
 * Firestoreに単元マスタをインポート（管理者用・初回 or 更新時に実行）
 * @param {Function} onProgress - 進捗コールバック (current, total, message)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export async function importMasterUnitsToFirestore(onProgress = null) {
  const results = { success: 0, failed: 0, errors: [] }
  const total = MASTER_UNITS_DATA.length

  for (let i = 0; i < MASTER_UNITS_DATA.length; i++) {
    const unit = MASTER_UNITS_DATA[i]
    try {
      if (onProgress) onProgress(i + 1, total, `インポート中: ${unit.subject} / ${unit.name}`)
      await setDoc(doc(db, 'masterUnits', unit.id), {
        id: unit.id,
        name: unit.name,
        subject: unit.subject,
        category: unit.category,
        difficultyLevel: unit.difficulty_level || null,
        description: unit.description || '',
        orderIndex: unit.order_index || 0,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      results.success++
    } catch (error) {
      console.error(`エラー: ${unit.id}`, error)
      results.failed++
      results.errors.push({ id: unit.id, name: unit.name, error: error.message })
    }
  }
  return results
}

/**
 * masterUnitsコレクションが空の場合に自動シードする
 * @returns {Promise<boolean>} シードした場合は true
 */
export async function ensureMasterUnitsSeeded() {
  try {
    const snapshot = await getDocs(collection(db, 'masterUnits'))
    if (!snapshot.empty) return false
    await importMasterUnitsToFirestore()
    return true
  } catch (err) {
    console.warn('ensureMasterUnitsSeeded failed:', err)
    return false
  }
}

/**
 * 教科・カテゴリ別の統計情報を返す
 * @returns {Object}
 */
export function getMasterUnitsStats() {
  const bySubject = {}
  MASTER_UNITS_DATA.forEach(u => {
    if (!bySubject[u.subject]) bySubject[u.subject] = { count: 0, categories: {} }
    bySubject[u.subject].count++
    if (!bySubject[u.subject].categories[u.category]) {
      bySubject[u.subject].categories[u.category] = 0
    }
    bySubject[u.subject].categories[u.category]++
  })
  return {
    totalUnits: MASTER_UNITS_DATA.length,
    bySubject,
  }
}
