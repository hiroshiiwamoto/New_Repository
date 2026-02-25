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

  // ═══ 4年生 通常授業（理科）══════════════════════════════════
  '430-01': { name: '磁石の性質',         unitIds: ['RIK_PHY_MAGNET'],        subject: '理科' },
  '430-02': { name: '電気の性質',         unitIds: ['RIK_PHY_CIRCUIT_BASIC'], subject: '理科' },
  '430-03': { name: '電磁石のはたらき',   unitIds: ['RIK_PHY_MAGNET'],        subject: '理科' },
  '430-04': { name: '昆虫①',             unitIds: ['RIK_BIO_INSECT'],        subject: '理科' },
  '430-05': { name: 'メダカの生態',       unitIds: ['RIK_BIO_FISH'],          subject: '理科' },
  '430-06': { name: '食物連鎖',           unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-07': { name: '酸素の性質',         unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-08': { name: '二酸化炭素の性質',   unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-09': { name: '気体の発生',         unitIds: ['RIK_CHE_GAS_BASIC'],     subject: '理科' },
  '430-10': { name: '植物のはたらき①',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-11': { name: '植物のはたらき②',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-12': { name: '生き物のつながり',   unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-13': { name: '水溶液①',           unitIds: ['RIK_CHE_DISSOLVE'],      subject: '理科' },
  '430-14': { name: '水溶液②',           unitIds: ['RIK_CHE_ACID'],          subject: '理科' },
  '430-15': { name: '水溶液③',           unitIds: ['RIK_CHE_NEUTRAL'],       subject: '理科' },
  '430-16': { name: '花と受粉',           unitIds: ['RIK_BIO_FLOWER'],        subject: '理科' },
  '430-17': { name: '種子と発芽',         unitIds: ['RIK_BIO_PLANT_GROW'],    subject: '理科' },
  '430-18': { name: '生き物の増え方',     unitIds: ['RIK_BIO_ECOLOGY'],       subject: '理科' },
  '430-19': { name: '植物の分類',         unitIds: ['RIK_BIO_PLANT_CLASS'],   subject: '理科' },
  '430-20': { name: '地層①',             unitIds: ['RIK_GEO_LAYER'],         subject: '理科' },
  '430-21': { name: '地層②',             unitIds: ['RIK_GEO_LAYER'],         subject: '理科' },
  '430-22': { name: '地面の動き',         unitIds: ['RIK_GEO_QUAKE'],         subject: '理科' },
  '430-23': { name: '膨張と収縮',         unitIds: ['RIK_PHY_EXPAND'],        subject: '理科' },
  '430-24': { name: '水の三態①',         unitIds: ['RIK_CHE_STATE'],         subject: '理科' },
  '430-25': { name: '熱の伝わり方',       unitIds: ['RIK_PHY_HEAT'],          subject: '理科' },
  '430-26': { name: '光の性質',           unitIds: ['RIK_PHY_MIRROR'],        subject: '理科' },
  '430-27': { name: '水の三態②',         unitIds: ['RIK_CHE_STATE'],         subject: '理科' },
  '430-28': { name: '気象',               unitIds: ['RIK_GEO_WEATHER'],       subject: '理科' },
  '430-29': { name: '太陽②',             unitIds: ['RIK_GEO_SUN_DAY'],      subject: '理科' },
  '430-30': { name: '太陽③',             unitIds: ['RIK_GEO_SUN_YEAR'],     subject: '理科' },
  '430-31': { name: '太陽④',             unitIds: ['RIK_GEO_SUN_YEAR'],     subject: '理科' },
  '430-32': { name: '植物のはたらき③',   unitIds: ['RIK_BIO_PHOTO'],         subject: '理科' },
  '430-33': { name: '昆虫③',             unitIds: ['RIK_BIO_INSECT_SEAS'],   subject: '理科' },
  '430-34': { name: '生き物の分類②',     unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },
  '430-35': { name: '栄養素',             unitIds: ['RIK_BIO_DIGEST'],        subject: '理科' },
  '430-36': { name: '動物の分類',         unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },

  // ═══ 4年生 春期講習（理科）═════════════════════════════════
  'H43-01': { name: '太陽①',             unitIds: ['RIK_GEO_SUN_DAY'],      subject: '理科' },
  'H43-02': { name: '星①',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'H43-03': { name: '天体総合',           unitIds: [],                        subject: '理科' },

  // ═══ 4年生 夏期講習（理科）═════════════════════════════════
  'N43-01': { name: '昆虫②',             unitIds: ['RIK_BIO_INSECT_SEAS'],   subject: '理科' },
  'N43-02': { name: '生き物の分類①',     unitIds: ['RIK_BIO_ANIMAL'],        subject: '理科' },
  'N43-03': { name: '星②',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-04': { name: '星③',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-05': { name: '星④',               unitIds: ['RIK_GEO_STAR'],          subject: '理科' },
  'N43-06': { name: 'ばねの性質',         unitIds: ['RIK_PHY_SCALE'],         subject: '理科' },
  'N43-07': { name: 'てこ①',             unitIds: ['RIK_PHY_LEVER'],         subject: '理科' },
  'N43-08': { name: 'てこ②',             unitIds: ['RIK_PHY_LEVER'],         subject: '理科' },

  // ═══ 4年生 冬期講習（理科）═════════════════════════════════
  'F43-01': { name: '電気回路①',         unitIds: ['RIK_PHY_CIRCUIT_BASIC'], subject: '理科' },
  'F43-02': { name: '電気回路②',         unitIds: ['RIK_PHY_CIRCUIT'],       subject: '理科' },
  'F43-03': { name: '電気回路③',         unitIds: ['RIK_PHY_CIRCUIT'],       subject: '理科' },

  // ═══ 4年生 通常授業（社会）══════════════════════════════════
  '440-01': { name: '紙と生活',                             unitIds: [],                    subject: '社会' },
  '440-02': { name: '日本の住居',                           unitIds: [],                    subject: '社会' },
  '440-03': { name: '日本の衣服',                           unitIds: [],                    subject: '社会' },
  '440-04': { name: '電気エネルギー',                       unitIds: ['SHA_GEO_RESOURCE'],  subject: '社会' },
  '440-05': { name: '自動車産業',                           unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },
  '440-06': { name: '商店と流通',                           unitIds: ['SHA_GEO_TRADE'],     subject: '社会' },
  '440-07': { name: '日本の国土',                           unitIds: ['SHA_GEO_LAND'],      subject: '社会' },
  '440-08': { name: '日本の気候',                           unitIds: ['SHA_GEO_CLIMATE'],   subject: '社会' },
  '440-09': { name: '地図の見方①',                         unitIds: ['SHA_GEO_MAP'],       subject: '社会' },
  '440-10': { name: '地図の見方②',                         unitIds: ['SHA_GEO_MAP'],       subject: '社会' },
  '440-11': { name: '北海道地方',                           unitIds: ['SHA_GEO_HOKKAIDO'],  subject: '社会' },
  '440-12': { name: '東北地方',                             unitIds: ['SHA_GEO_TOHOKU'],    subject: '社会' },
  '440-13': { name: '関東地方',                             unitIds: ['SHA_GEO_KANTO'],     subject: '社会' },
  '440-14': { name: '中部地方①',                           unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  '440-15': { name: '中部地方②',                           unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  '440-16': { name: '近畿地方',                             unitIds: ['SHA_GEO_KINKI'],     subject: '社会' },
  '440-17': { name: '中国・四国地方',                       unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  '440-18': { name: '九州地方',                             unitIds: ['SHA_GEO_KYUSHU'],    subject: '社会' },
  '440-19': { name: '世界の中の日本',                       unitIds: ['SHA_NEWS_WORLD'],    subject: '社会' },
  '440-20': { name: 'お米の国・日本',                       unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-21': { name: '米作のいろいろな工夫',                 unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-22': { name: '日本の米作の問題点',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-23': { name: 'いろいろな野菜作り',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-24': { name: 'いろいろな果物作り',                   unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-25': { name: '麦・豆・いも類と工芸作物',             unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-26': { name: '日本の畜産業',                         unitIds: ['SHA_GEO_LIVESTOCK'], subject: '社会' },
  '440-27': { name: '日本の農業の特徴',                     unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  '440-28': { name: '日本の水産業①日本と漁業',             unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-29': { name: '日本の水産業②いろいろな漁業',         unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-30': { name: '日本の水産業③魚を「育てる漁業」',     unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  '440-31': { name: '日本の森林と林業',                     unitIds: ['SHA_GEO_RESOURCE'],  subject: '社会' },
  '440-32': { name: '自然災害と防災へのとりくみ',           unitIds: ['SHA_GEO_CLIMATE'],   subject: '社会' },
  '440-33': { name: '工業の種類',                           unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },
  '440-34': { name: '織物・染物・和紙・文具',               unitIds: ['SHA_GEO_CRAFT'],     subject: '社会' },
  '440-35': { name: '陶磁器・漆器・その他',                 unitIds: ['SHA_GEO_CRAFT'],     subject: '社会' },
  '440-36': { name: '４年生のまとめ',                       unitIds: [],                    subject: '社会' },

  // ═══ 4年生 春期講習（社会）═════════════════════════════════
  'H44-01': { name: '米と野菜',             unitIds: ['SHA_GEO_CROP'],      subject: '社会' },
  'H44-02': { name: '魚と肉',               unitIds: ['SHA_GEO_FISHERY'],   subject: '社会' },
  'H44-03': { name: '加工食品',             unitIds: ['SHA_GEO_INDUSTRY'],  subject: '社会' },

  // ═══ 4年生 夏期講習（社会）═════════════════════════════════
  'N44-01': { name: '北海道の旅',           unitIds: ['SHA_GEO_HOKKAIDO'],  subject: '社会' },
  'N44-02': { name: '東北地方の旅',         unitIds: ['SHA_GEO_TOHOKU'],    subject: '社会' },
  'N44-03': { name: '関東地方の旅',         unitIds: ['SHA_GEO_KANTO'],     subject: '社会' },
  'N44-04': { name: '中部地方の旅',         unitIds: ['SHA_GEO_CHUBU'],     subject: '社会' },
  'N44-05': { name: '近畿地方の旅',         unitIds: ['SHA_GEO_KINKI'],     subject: '社会' },
  'N44-06': { name: '中国地方の旅',         unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  'N44-07': { name: '四国地方の旅',         unitIds: ['SHA_GEO_CHUGOKU'],   subject: '社会' },
  'N44-08': { name: '九州地方の旅',         unitIds: ['SHA_GEO_KYUSHU'],    subject: '社会' },

  // ═══ 4年生 冬期講習（社会）═════════════════════════════════
  'F44-01': { name: '金属工業と石油化学工業', unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },
  'F44-02': { name: '機械工業',               unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },
  'F44-03': { name: 'その他の工業',           unitIds: ['SHA_GEO_INDUSTRY'], subject: '社会' },
}

// ── 正規表現 ────────────────────────────────────────────────
// 通常: 41B-02, 430-01 / 季節講習: H41-01, N43-03, F43-02
const CODE_REGEX = /(\d{2}[A-B]-\d{2}|\d{3}-\d{2}|[HNF]\d{2}-\d{2})/

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

/**
 * 教科でフィルタした SAPIX テキストコード一覧を返す（autocomplete用）
 * @param {string} subject - 例: '算数'
 * @returns {string[]}
 */
export function getSapixCodesBySubject(subject) {
  return Object.entries(SAPIX_SCHEDULE)
    .filter(([, info]) => info.subject === subject)
    .map(([code]) => code)
}

/**
 * sapixRange オブジェクトからカバーされるマスター単元IDを計算する
 * @param {Object} sapixRange - { 算数: ['41B-01', ...], 社会: ['440-01', ...], ... }
 * @returns {string[]} - ユニークな unitId の配列
 */
export function computeCoveredUnitIds(sapixRange) {
  const unitIdSet = new Set()
  for (const codes of Object.values(sapixRange || {})) {
    for (const code of codes) {
      const info = SAPIX_SCHEDULE[code]
      if (info && info.unitIds) {
        info.unitIds.forEach(id => unitIdSet.add(id))
      }
    }
  }
  return [...unitIdSet]
}
