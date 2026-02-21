/**
 * SAPIX 年間スケジュール → マスター単元 マッピング
 *
 * ファイル名（例: 41B-02.pdf）からテキストコードを抽出し、
 * 対応するマスター単元を自動で特定する。
 *
 * コード体系: [学年1桁][ブロック1桁][A|B]-[連番2桁]
 *   例: 41B-02 → 4年生・ブロック1・Bテキスト・第02回
 */

// ── マッピングテーブル ──────────────────────────────────────
// key   : SAPIX テキストコード
// value : { name: テキスト名, unitIds: マスター単元IDの配列, subject: 教科 }
//
// unitIds が空配列の場合、単元タグの自動付与はスキップされる。
// 新しいテキストを追加する場合は、ここにエントリを追加するだけでOK。

const SAPIX_SCHEDULE = {
  // ── 4年生 ブロック1 Bテキスト（算数）──
  '41B-01': { name: '大きな数',       unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-02': { name: '角と角度①',     unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41B-03': { name: '植木算',         unitIds: ['SAN_SPEC_TREE'],     subject: '算数' },
  '41B-04': { name: '場合の数①',     unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  // ── 追加エントリはここに ─────────────────────────────────
}

// ── 正規表現 ────────────────────────────────────────────────
const CODE_REGEX = /([0-9]{2}[A-B]-[0-9]{2})/

/**
 * ファイル名から SAPIX テキストコードを抽出する
 * @param {string} filename - 例: "41B-02.pdf", "SAPIX_41B-02_角度.pdf"
 * @returns {string|null} - 例: "41B-02" or null
 */
export function extractSapixCode(filename) {
  const match = filename.match(CODE_REGEX)
  return match ? match[1] : null
}

/**
 * テキストコードからスケジュール情報を取得する
 * @param {string} code - 例: "41B-02"
 * @returns {{ name: string, unitIds: string[], subject: string }|null}
 */
export function lookupSapixSchedule(code) {
  return SAPIX_SCHEDULE[code] || null
}

/**
 * テキストコードから学年を推定する
 * @param {string} code - 例: "41B-02"
 * @returns {string|null} - 例: "4年生"
 */
export function gradeFromCode(code) {
  const gradeNum = code.charAt(0)
  const gradeMap = { '3': '3年生', '4': '4年生', '5': '5年生', '6': '6年生' }
  return gradeMap[gradeNum] || null
}
