/**
 * 国語 マスター単元データ（50単元）
 * ID命名規則: KOK_カテゴリ略語_単元略語
 * difficulty_level: 1=基礎〜5=最難問
 * order_index: 1001〜1500（算数と重複しないよう1000番台）
 */
export const KOKUGO_UNITS = [
  // 読解技術：論理・構造 (14)
  { id: 'KOK_LOG_DEMONST',    name: '指示語',             category: '読解技術：論理・構造', difficulty_level: 2, order_index: 1010 },
  { id: 'KOK_LOG_CONJ',       name: '接続詞',             category: '読解技術：論理・構造', difficulty_level: 2, order_index: 1020 },
  { id: 'KOK_LOG_PARA',       name: '意味段落',           category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1030 },
  { id: 'KOK_LOG_SUMMARY',    name: '要点・要旨',         category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1040 },
  { id: 'KOK_LOG_CONTRAST',   name: '対比',               category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1050 },
  { id: 'KOK_LOG_ABSTRACT',   name: '抽象・具体',         category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1060 },
  { id: 'KOK_LOG_REASON',     name: '理由説明',           category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1070 },
  { id: 'KOK_LOG_SCENE',      name: '場面・情景',         category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1080 },
  { id: 'KOK_LOG_CHAR_REL',   name: '人物相関',           category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1090 },
  { id: 'KOK_LOG_EMOTION',    name: '心情',               category: '読解技術：論理・構造', difficulty_level: 4, order_index: 1100 },
  { id: 'KOK_LOG_PERSON',     name: '性格・人柄',         category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1110 },
  { id: 'KOK_LOG_DESC',       name: '情景描写',           category: '読解技術：論理・構造', difficulty_level: 3, order_index: 1120 },
  { id: 'KOK_LOG_THEME',      name: '主題',               category: '読解技術：論理・構造', difficulty_level: 4, order_index: 1130 },
  { id: 'KOK_LOG_FORESHADOW', name: '伏線',               category: '読解技術：論理・構造', difficulty_level: 4, order_index: 1140 },

  // 読解ジャンル (6)
  { id: 'KOK_GEN_STORY',   name: '物語文',               category: '読解ジャンル', difficulty_level: 3, order_index: 1150 },
  { id: 'KOK_GEN_EXPLAIN', name: '説明文',               category: '読解ジャンル', difficulty_level: 3, order_index: 1160 },
  { id: 'KOK_GEN_ESSAY',   name: '随筆文',               category: '読解ジャンル', difficulty_level: 3, order_index: 1170 },
  { id: 'KOK_GEN_POEM',    name: '詩',                   category: '読解ジャンル', difficulty_level: 3, order_index: 1180 },
  { id: 'KOK_GEN_HAIKU',   name: '短歌・俳句',           category: '読解ジャンル', difficulty_level: 3, order_index: 1190 },
  { id: 'KOK_GEN_THESIS',  name: '論説文',               category: '読解ジャンル', difficulty_level: 4, order_index: 1200 },

  // 解答技術・記述 (6)
  { id: 'KOK_SKL_ELIM',    name: '消去法（選択肢）',     category: '解答技術・記述', difficulty_level: 2, order_index: 1210 },
  { id: 'KOK_SKL_EXTRACT', name: '抜き出し',             category: '解答技術・記述', difficulty_level: 2, order_index: 1220 },
  { id: 'KOK_SKL_SHORT',   name: '短文記述',             category: '解答技術・記述', difficulty_level: 3, order_index: 1230 },
  { id: 'KOK_SKL_LONG',    name: '中長文記述',           category: '解答技術・記述', difficulty_level: 4, order_index: 1240 },
  { id: 'KOK_SKL_SPEC',    name: '指定語句記述',         category: '解答技術・記述', difficulty_level: 4, order_index: 1250 },
  { id: 'KOK_SKL_SUMMARY', name: '要約・作文',           category: '解答技術・記述', difficulty_level: 5, order_index: 1260 },

  // 知識：漢字・語彙 (14)
  { id: 'KOK_KNJ_WRITE',    name: '漢字書き',            category: '知識：漢字・語彙', difficulty_level: 1, order_index: 1270 },
  { id: 'KOK_KNJ_READ',     name: '漢字読み',            category: '知識：漢字・語彙', difficulty_level: 1, order_index: 1280 },
  { id: 'KOK_KNJ_HOMO',     name: '同音異義・同訓異字',  category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1290 },
  { id: 'KOK_KNJ_RADICAL',  name: '部首・画数',          category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1300 },
  { id: 'KOK_KNJ_COMPOUND', name: '三字・四字熟語',      category: '知識：漢字・語彙', difficulty_level: 3, order_index: 1310 },
  { id: 'KOK_KNJ_SYNONYM',  name: '類義語・対義語',      category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1320 },
  { id: 'KOK_KNJ_PROVERB',  name: 'ことわざ・故事成語',  category: '知識：漢字・語彙', difficulty_level: 3, order_index: 1330 },
  { id: 'KOK_KNJ_IDIOM',    name: '慣用句',              category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1340 },
  { id: 'KOK_KNJ_KEIGO',    name: '敬語（知識）',        category: '知識：漢字・語彙', difficulty_level: 3, order_index: 1350 },
  { id: 'KOK_KNJ_KATA',     name: 'カタカナ語',          category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1360 },
  { id: 'KOK_KNJ_EMOTION',  name: '心情語',              category: '知識：漢字・語彙', difficulty_level: 3, order_index: 1370 },
  { id: 'KOK_KNJ_ABSTRACT', name: '抽象語・論理語',      category: '知識：漢字・語彙', difficulty_level: 3, order_index: 1380 },
  { id: 'KOK_KNJ_KIGO',     name: '季語',                category: '知識：漢字・語彙', difficulty_level: 2, order_index: 1390 },
  { id: 'KOK_KNJ_DIFFICULT',name: '難読漢字',            category: '知識：漢字・語彙', difficulty_level: 4, order_index: 1400 },

  // 知識：文法・きまり (6)
  { id: 'KOK_GRAM_STRUCT',   name: '文の構造（主述・修飾）', category: '知識：文法・きまり', difficulty_level: 2, order_index: 1410 },
  { id: 'KOK_GRAM_PARTS',    name: '品詞',                   category: '知識：文法・きまり', difficulty_level: 3, order_index: 1420 },
  { id: 'KOK_GRAM_VERB',     name: '動詞の活用',             category: '知識：文法・きまり', difficulty_level: 3, order_index: 1430 },
  { id: 'KOK_GRAM_PARTICLE', name: '助詞・助動詞',           category: '知識：文法・きまり', difficulty_level: 3, order_index: 1440 },
  { id: 'KOK_GRAM_KEIGO',    name: '敬語（文法）',           category: '知識：文法・きまり', difficulty_level: 4, order_index: 1450 },
  { id: 'KOK_GRAM_RHETORIC', name: '修辞技法（比喩等）',     category: '知識：文法・きまり', difficulty_level: 3, order_index: 1460 },

  // その他・発展 (4)
  { id: 'KOK_ADV_CLASSIC',    name: '古文・漢文（基礎）',   category: 'その他・発展', difficulty_level: 4, order_index: 1470 },
  { id: 'KOK_ADV_LITHISTORY', name: '文学史',               category: 'その他・発展', difficulty_level: 3, order_index: 1480 },
  { id: 'KOK_ADV_DATA',       name: '資料・図表読解',       category: 'その他・発展', difficulty_level: 3, order_index: 1490 },
  { id: 'KOK_ADV_MULTI',      name: '複数テキスト比較',     category: 'その他・発展', difficulty_level: 5, order_index: 1500 },
]
