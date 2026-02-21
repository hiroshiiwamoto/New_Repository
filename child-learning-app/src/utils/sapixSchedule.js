/**
 * SAPIX 年間スケジュール → マスター単元 マッピング
 *
 * ファイル名（例: 41B-02.pdf）からテキストコードを抽出し、
 * 対応するマスター単元を自動で特定する。
 *
 * コード体系:
 *   通常授業: [学年1桁][ブロック1桁][A|B]-[連番2桁]  例: 41B-02
 *   春期講習: H[学年1桁][ブロック1桁]-[連番2桁]       例: H41-01
 *   夏期講習: N[学年1桁][ブロック1桁]-[連番2桁]       例: N41-01
 *   冬期講習: F[学年1桁][ブロック1桁]-[連番2桁]       例: F41-01
 */

// ── マッピングテーブル ──────────────────────────────────────
// key   : SAPIX テキストコード
// value : { name: テキスト名, unitIds: マスター単元IDの配列, subject: 教科 }
//
// unitIds が空配列の場合、単元タグの自動付与はスキップされる（総合回など）。
// 新しいテキストを追加する場合は、ここにエントリを追加するだけでOK。

const SAPIX_SCHEDULE = {
  // ═══ 4年生 通常授業 Bテキスト（算数）═══════════════════════
  '41B-01': { name: '大きな数',           unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-02': { name: '角と角度①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41B-03': { name: '植木算',             unitIds: ['SAN_SPEC_TREE'],     subject: '算数' },
  '41B-04': { name: '場合の数①',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41B-05': { name: '総合（01～04）',     unitIds: [],                    subject: '算数' },
  '41B-06': { name: '計算のくふう',       unitIds: ['SAN_CALC_TRICK'],    subject: '算数' },
  '41B-07': { name: '図形のせいしつ',     unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  '41B-08': { name: '和差算',             unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41B-09': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41B-10': { name: '総合（06～09）',     unitIds: [],                    subject: '算数' },
  '41B-11': { name: '約数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41B-12': { name: '倍数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  '41B-13': { name: '面積の考え方①',     unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41B-14': { name: '面積の考え方②',     unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  '41B-15': { name: '総合（11～14）',     unitIds: [],                    subject: '算数' },
  '41B-16': { name: '分数の基本',         unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-17': { name: 'つるかめ算',         unitIds: ['SAN_SPEC_TSURU'],    subject: '算数' },
  '41B-18': { name: '過不足算',           unitIds: ['SAN_SPEC_EXCESS'],   subject: '算数' },
  '41B-19': { name: '場合の数②',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  '41B-20': { name: '和差算とやりとり算', unitIds: ['SAN_SPEC_WACHA'],    subject: '算数' },
  '41B-21': { name: '消去算',             unitIds: ['SAN_SPEC_ELIM'],     subject: '算数' },
  '41B-22': { name: '小数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-23': { name: '分数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  '41B-24': { name: '総合（20～23）',     unitIds: [],                    subject: '算数' },
  '41B-25': { name: '方陣算',             unitIds: ['SAN_SPEC_SQUARE'],   subject: '算数' },
  '41B-26': { name: '平均算',             unitIds: ['SAN_SPEC_AVG'],      subject: '算数' },
  '41B-27': { name: '円とおうぎ形①',     unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41B-28': { name: '円とおうぎ形②',     unitIds: ['SAN_PLANE_CIRCLE'],  subject: '算数' },
  '41B-29': { name: '総合（25～28）',     unitIds: [],                    subject: '算数' },
  '41B-30': { name: '深さの変化',         unitIds: ['SAN_SOLID_WATER'],   subject: '算数' },
  '41B-31': { name: 'グラフの読み取り方', unitIds: ['SAN_LOGIC_GRAPH'],   subject: '算数' },
  '41B-32': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  '41B-33': { name: '速さ',               unitIds: ['SAN_SPEED_BASIC'],   subject: '算数' },
  '41B-34': { name: '総合（30～33）',     unitIds: [],                    subject: '算数' },
  '41B-35': { name: '文章題',             unitIds: [],                    subject: '算数' },
  '41B-36': { name: '平面図形',           unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },

  // ═══ 4年生 春期講習（算数）═════════════════════════════════
  'H41-01': { name: 'およその数',         unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'H41-02': { name: '角と角度②',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'H41-03': { name: '数列',               unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  'H41-04': { name: 'すい理算',           unitIds: ['SAN_LOGIC_COND'],    subject: '算数' },
  'H41-05': { name: '春期講習総合',       unitIds: [],                    subject: '算数' },

  // ═══ 4年生 夏期講習（算数）═════════════════════════════════
  'N41-01': { name: '平面図形①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'N41-02': { name: '平面図形②',         unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  'N41-03': { name: '約数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'N41-04': { name: '倍数',               unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'N41-05': { name: '規則性',             unitIds: ['SAN_PATTERN_SEQ'],   subject: '算数' },
  'N41-06': { name: '小数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'N41-07': { name: '分数',               unitIds: ['SAN_CALC_BASIC'],    subject: '算数' },
  'N41-08': { name: '文章題①',           unitIds: [],                    subject: '算数' },
  'N41-09': { name: '立体図形①',         unitIds: ['SAN_SOLID_BASIC'],   subject: '算数' },
  'N41-10': { name: '立体図形②',         unitIds: ['SAN_SOLID_VOLUME'],  subject: '算数' },
  'N41-11': { name: '場合の数①',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  'N41-12': { name: '文章題②',           unitIds: [],                    subject: '算数' },
  'N41-13': { name: '立体図形③',         unitIds: ['SAN_SOLID_VOLUME'],  subject: '算数' },
  'N41-14': { name: '場合の数②',         unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },

  // ═══ 4年生 冬期講習（算数）═════════════════════════════════
  'F41-01': { name: '平面図形①',         unitIds: ['SAN_PLANE_ANGLE'],   subject: '算数' },
  'F41-02': { name: '数のせいしつ',       unitIds: ['SAN_NUM_DIVISOR'],   subject: '算数' },
  'F41-03': { name: '平面図形②',         unitIds: ['SAN_PLANE_AREA'],    subject: '算数' },
  'F41-04': { name: '場合の数',           unitIds: ['SAN_COMB_COUNT'],    subject: '算数' },
  'F41-05': { name: '立体図形',           unitIds: ['SAN_SOLID_BASIC'],   subject: '算数' },
  'F41-06': { name: '総合（01～05）',     unitIds: [],                    subject: '算数' },
}

// ── 正規表現 ────────────────────────────────────────────────
// 通常: 41B-02 / 季節講習: H41-01, N41-03, F41-02
const CODE_REGEX = /(\d{2}[A-B]-\d{2}|[HNF]\d{2}-\d{2})/

/**
 * ファイル名から SAPIX テキストコードを抽出する
 * @param {string} filename - 例: "41B-02.pdf", "H41-03.pdf"
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
 * @param {string} code - 例: "41B-02" → "4年生", "H41-01" → "4年生"
 * @returns {string|null}
 */
export function gradeFromCode(code) {
  // 通常: "41B-02" → charAt(0)='4' / 季節講習: "H41-01" → charAt(1)='4'
  const gradeChar = /^[HNF]/.test(code) ? code.charAt(1) : code.charAt(0)
  const gradeMap = { '3': '3年生', '4': '4年生', '5': '5年生', '6': '6年生' }
  return gradeMap[gradeChar] || null
}
