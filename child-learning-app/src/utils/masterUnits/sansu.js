/**
 * 算数 マスター単元データ（50単元）
 * ID命名規則: SAN_カテゴリ略語_単元略語
 * difficulty_level: 1=基礎〜5=最難問
 * order_index: 10単位で採番（後から挿入しやすくするため）
 */
export const SANSU_UNITS = [
  // 計算 (4)
  { id: 'SAN_CALC_BASIC',    name: '四則計算の基礎',    category: '計算',       difficulty_level: 1, order_index: 10 },
  { id: 'SAN_CALC_TRICK',   name: '計算のくふう',       category: '計算',       difficulty_level: 2, order_index: 20 },
  { id: 'SAN_CALC_UNIT',    name: '単位換算',            category: '計算',       difficulty_level: 2, order_index: 30 },
  { id: 'SAN_CALC_BOX',     name: '□を求める計算',      category: '計算',       difficulty_level: 2, order_index: 40 },

  // 数の性質 (1)
  { id: 'SAN_NUM_DIVISOR',  name: '約数・倍数',          category: '数の性質',   difficulty_level: 3, order_index: 50 },

  // 規則性 (4)
  { id: 'SAN_PATTERN_SEQ',      name: '規則性(数列)',    category: '規則性',     difficulty_level: 3, order_index: 60 },
  { id: 'SAN_PATTERN_TABLE',    name: '数表',            category: '規則性',     difficulty_level: 3, order_index: 70 },
  { id: 'SAN_PATTERN_CALENDAR', name: '日暦算',          category: '規則性',     difficulty_level: 2, order_index: 80 },
  { id: 'SAN_PATTERN_CYCLE',    name: '周期算',          category: '規則性',     difficulty_level: 3, order_index: 90 },

  // 特殊算 (15)
  { id: 'SAN_SPEC_WACHA',   name: '和差算',              category: '特殊算',     difficulty_level: 2, order_index: 100 },
  { id: 'SAN_SPEC_AGE',     name: '年齢算',              category: '特殊算',     difficulty_level: 2, order_index: 110 },
  { id: 'SAN_SPEC_TSURU',   name: 'つるかめ算',          category: '特殊算',     difficulty_level: 3, order_index: 120 },
  { id: 'SAN_SPEC_DIFF',    name: '差集め算',            category: '特殊算',     difficulty_level: 3, order_index: 130 },
  { id: 'SAN_SPEC_EXCESS',  name: '過不足算',            category: '特殊算',     difficulty_level: 3, order_index: 140 },
  { id: 'SAN_SPEC_TREE',    name: '植木算',              category: '特殊算',     difficulty_level: 2, order_index: 150 },
  { id: 'SAN_SPEC_SQUARE',  name: '方陣算',              category: '特殊算',     difficulty_level: 3, order_index: 160 },
  { id: 'SAN_SPEC_DISTRIB', name: '分配算',              category: '特殊算',     difficulty_level: 3, order_index: 170 },
  { id: 'SAN_SPEC_EQUIV',   name: '相当算',              category: '特殊算',     difficulty_level: 3, order_index: 180 },
  { id: 'SAN_SPEC_RESTORE', name: '還元算',              category: '特殊算',     difficulty_level: 3, order_index: 190 },
  { id: 'SAN_SPEC_MULTIPLE',name: '倍数算',              category: '特殊算',     difficulty_level: 3, order_index: 200 },
  { id: 'SAN_SPEC_ELIM',    name: '消去算',              category: '特殊算',     difficulty_level: 4, order_index: 210 },
  { id: 'SAN_SPEC_AVG',     name: '平均算',              category: '特殊算',     difficulty_level: 2, order_index: 220 },
  { id: 'SAN_SPEC_WORK',    name: '仕事算',              category: '特殊算',     difficulty_level: 4, order_index: 230 },
  { id: 'SAN_SPEC_NEWTON',  name: 'ニュートン算',        category: '特殊算',     difficulty_level: 5, order_index: 240 },

  // 速さ (5)
  { id: 'SAN_SPEED_BASIC',  name: '速さの基本',          category: '速さ',       difficulty_level: 2, order_index: 250 },
  { id: 'SAN_SPEED_TRAVEL', name: '旅人算',              category: '速さ',       difficulty_level: 3, order_index: 260 },
  { id: 'SAN_SPEED_PASS',   name: '通過算',              category: '速さ',       difficulty_level: 3, order_index: 270 },
  { id: 'SAN_SPEED_RIVER',  name: '流水算',              category: '速さ',       difficulty_level: 3, order_index: 280 },
  { id: 'SAN_SPEED_CLOCK',  name: '時計算',              category: '速さ',       difficulty_level: 4, order_index: 290 },

  // 割合 (3)
  { id: 'SAN_RATIO_BASIC',  name: '割合の基本',          category: '割合',       difficulty_level: 2, order_index: 300 },
  { id: 'SAN_RATIO_PROFIT', name: '売買損益',            category: '割合',       difficulty_level: 3, order_index: 310 },
  { id: 'SAN_RATIO_CONC',   name: '食塩水',              category: '割合',       difficulty_level: 4, order_index: 320 },

  // 比 (3)
  { id: 'SAN_PROP_BASIC',   name: '比の基本',            category: '比',         difficulty_level: 3, order_index: 330 },
  { id: 'SAN_PROP_RATIO',   name: '比例・反比例',        category: '比',         difficulty_level: 3, order_index: 340 },
  { id: 'SAN_PROP_SPEED',   name: '速さと比',            category: '比',         difficulty_level: 4, order_index: 350 },

  // 平面図形 (7)
  { id: 'SAN_PLANE_ANGLE',   name: '角度',               category: '平面図形',   difficulty_level: 2, order_index: 360 },
  { id: 'SAN_PLANE_AREA',    name: '面積',               category: '平面図形',   difficulty_level: 2, order_index: 370 },
  { id: 'SAN_PLANE_CIRCLE',  name: '円・おうぎ形',       category: '平面図形',   difficulty_level: 3, order_index: 380 },
  { id: 'SAN_PLANE_EQUIV',   name: '等積変形',           category: '平面図形',   difficulty_level: 4, order_index: 390 },
  { id: 'SAN_PLANE_MOVE',    name: '図形の移動',         category: '平面図形',   difficulty_level: 3, order_index: 400 },
  { id: 'SAN_PLANE_SIMILAR', name: '相似',               category: '平面図形',   difficulty_level: 4, order_index: 410 },
  { id: 'SAN_PLANE_RATIO',   name: '面積比・線分比',     category: '平面図形',   difficulty_level: 5, order_index: 420 },

  // 立体図形 (5)
  { id: 'SAN_SOLID_BASIC',   name: '立体の名前・展開図', category: '立体図形',   difficulty_level: 2, order_index: 430 },
  { id: 'SAN_SOLID_VOLUME',  name: '体積・表面積',       category: '立体図形',   difficulty_level: 3, order_index: 440 },
  { id: 'SAN_SOLID_CUT',     name: '立体の切断',         category: '立体図形',   difficulty_level: 5, order_index: 450 },
  { id: 'SAN_SOLID_ROTATE',  name: '回転体',             category: '立体図形',   difficulty_level: 4, order_index: 460 },
  { id: 'SAN_SOLID_WATER',   name: '水位の変化',         category: '立体図形',   difficulty_level: 4, order_index: 470 },

  // 場合の数 (1)
  { id: 'SAN_COMB_COUNT',    name: '場合の数',           category: '場合の数',   difficulty_level: 4, order_index: 480 },

  // グラフ・論理 (2)
  { id: 'SAN_LOGIC_GRAPH',   name: 'グラフ',             category: 'グラフ・論理', difficulty_level: 3, order_index: 490 },
  { id: 'SAN_LOGIC_COND',    name: '条件整理・論理',     category: 'グラフ・論理', difficulty_level: 4, order_index: 500 },
]
