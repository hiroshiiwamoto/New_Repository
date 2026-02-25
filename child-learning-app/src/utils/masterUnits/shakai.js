/**
 * 社会 マスター単元データ（50単元）
 * ID命名規則: SHA_分野略語_単元略語
 * difficulty_level: 1=基礎〜5=最難問
 * order_index: 3001〜3500（3000番台）
 */
export const SHAKAI_UNITS = [
  // 生活と産業 (9)
  { id: 'SHA_LIFE_PAPER',      name: '紙と生活',                             category: '生活と産業', difficulty_level: 1, order_index: 3010 },
  { id: 'SHA_LIFE_HOUSE',      name: '日本の住居',                           category: '生活と産業', difficulty_level: 1, order_index: 3020 },
  { id: 'SHA_LIFE_CLOTHES',    name: '日本の衣服',                           category: '生活と産業', difficulty_level: 1, order_index: 3030 },
  { id: 'SHA_LIFE_ENERGY',     name: '電気エネルギー',                       category: '生活と産業', difficulty_level: 2, order_index: 3040 },
  { id: 'SHA_LIFE_CAR',        name: '自動車産業',                           category: '生活と産業', difficulty_level: 2, order_index: 3050 },
  { id: 'SHA_LIFE_SHOP',       name: '商店と流通',                           category: '生活と産業', difficulty_level: 2, order_index: 3060 },
  { id: 'SHA_LIFE_RICEVEG',    name: '米と野菜',                             category: '生活と産業', difficulty_level: 1, order_index: 3070 },
  { id: 'SHA_LIFE_FISHMEAT',   name: '魚と肉',                               category: '生活と産業', difficulty_level: 1, order_index: 3080 },
  { id: 'SHA_LIFE_PROCESSED',  name: '加工食品',                             category: '生活と産業', difficulty_level: 2, order_index: 3090 },

  // 日本の地理 (4)
  { id: 'SHA_GEO_LAND',        name: '日本の国土',                           category: '日本の地理', difficulty_level: 2, order_index: 3100 },
  { id: 'SHA_GEO_CLIMATE',     name: '日本の気候',                           category: '日本の地理', difficulty_level: 2, order_index: 3110 },
  { id: 'SHA_GEO_MAP1',        name: '地図の見方①',                         category: '日本の地理', difficulty_level: 1, order_index: 3120 },
  { id: 'SHA_GEO_MAP2',        name: '地図の見方②',                         category: '日本の地理', difficulty_level: 2, order_index: 3130 },

  // 地方 (9)
  { id: 'SHA_REG_HOKKAIDO',    name: '北海道地方',                           category: '地方', difficulty_level: 2, order_index: 3140 },
  { id: 'SHA_REG_TOHOKU',      name: '東北地方',                             category: '地方', difficulty_level: 2, order_index: 3150 },
  { id: 'SHA_REG_KANTO',       name: '関東地方',                             category: '地方', difficulty_level: 2, order_index: 3160 },
  { id: 'SHA_REG_CHUBU1',      name: '中部地方①',                           category: '地方', difficulty_level: 2, order_index: 3170 },
  { id: 'SHA_REG_CHUBU2',      name: '中部地方②',                           category: '地方', difficulty_level: 2, order_index: 3180 },
  { id: 'SHA_REG_KINKI',       name: '近畿地方',                             category: '地方', difficulty_level: 2, order_index: 3190 },
  { id: 'SHA_REG_CHUSHIKO',    name: '中国・四国地方',                       category: '地方', difficulty_level: 2, order_index: 3200 },
  { id: 'SHA_REG_KYUSHU',      name: '九州地方',                             category: '地方', difficulty_level: 2, order_index: 3210 },
  { id: 'SHA_REG_WORLD',       name: '世界の中の日本',                       category: '地方', difficulty_level: 3, order_index: 3220 },

  // 地方の旅 (8)
  { id: 'SHA_TRIP_HOKKAIDO',   name: '北海道の旅',                           category: '地方の旅', difficulty_level: 2, order_index: 3230 },
  { id: 'SHA_TRIP_TOHOKU',     name: '東北地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3240 },
  { id: 'SHA_TRIP_KANTO',      name: '関東地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3250 },
  { id: 'SHA_TRIP_CHUBU',      name: '中部地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3260 },
  { id: 'SHA_TRIP_KINKI',      name: '近畿地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3270 },
  { id: 'SHA_TRIP_CHUGOKU',    name: '中国地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3280 },
  { id: 'SHA_TRIP_SHIKOKU',    name: '四国地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3290 },
  { id: 'SHA_TRIP_KYUSHU',     name: '九州地方の旅',                         category: '地方の旅', difficulty_level: 2, order_index: 3300 },

  // 農業 (8)
  { id: 'SHA_AGRI_RICEJP',     name: 'お米の国・日本',                       category: '農業', difficulty_level: 2, order_index: 3310 },
  { id: 'SHA_AGRI_RICETIP',    name: '米作のいろいろな工夫',                 category: '農業', difficulty_level: 2, order_index: 3320 },
  { id: 'SHA_AGRI_RICEPROB',   name: '日本の米作の問題点',                   category: '農業', difficulty_level: 3, order_index: 3330 },
  { id: 'SHA_AGRI_VEG',        name: 'いろいろな野菜作り',                   category: '農業', difficulty_level: 2, order_index: 3340 },
  { id: 'SHA_AGRI_FRUIT',      name: 'いろいろな果物作り',                   category: '農業', difficulty_level: 2, order_index: 3350 },
  { id: 'SHA_AGRI_CROPS',      name: '麦・豆・いも類と工芸作物',             category: '農業', difficulty_level: 2, order_index: 3360 },
  { id: 'SHA_AGRI_LIVESTOCK',  name: '日本の畜産業',                         category: '農業', difficulty_level: 2, order_index: 3370 },
  { id: 'SHA_AGRI_FEATURE',    name: '日本の農業の特徴',                     category: '農業', difficulty_level: 3, order_index: 3380 },

  // 水産業・林業・防災 (5)
  { id: 'SHA_FISH_BASIC',      name: '日本の水産業①日本と漁業',             category: '水産業・林業・防災', difficulty_level: 2, order_index: 3390 },
  { id: 'SHA_FISH_TYPES',      name: '日本の水産業②いろいろな漁業',         category: '水産業・林業・防災', difficulty_level: 2, order_index: 3400 },
  { id: 'SHA_FISH_AQUA',       name: '日本の水産業③魚を「育てる漁業」',     category: '水産業・林業・防災', difficulty_level: 3, order_index: 3410 },
  { id: 'SHA_FOREST_WOOD',     name: '日本の森林と林業',                     category: '水産業・林業・防災', difficulty_level: 2, order_index: 3420 },
  { id: 'SHA_DISASTER_PREV',   name: '自然災害と防災へのとりくみ',           category: '水産業・林業・防災', difficulty_level: 3, order_index: 3430 },

  // 工業 (6)
  { id: 'SHA_IND_TYPES',       name: '工業の種類',                           category: '工業', difficulty_level: 2, order_index: 3440 },
  { id: 'SHA_IND_METAL',       name: '金属工業と石油化学工業',               category: '工業', difficulty_level: 3, order_index: 3450 },
  { id: 'SHA_IND_MACHINE',     name: '機械工業',                             category: '工業', difficulty_level: 3, order_index: 3460 },
  { id: 'SHA_IND_OTHER',       name: 'その他の工業',                         category: '工業', difficulty_level: 2, order_index: 3470 },
  { id: 'SHA_IND_TEXTILE',     name: '織物・染物・和紙・文具',               category: '工業', difficulty_level: 2, order_index: 3480 },
  { id: 'SHA_IND_CERAMIC',     name: '陶磁器・漆器・その他',                 category: '工業', difficulty_level: 2, order_index: 3490 },

  // まとめ (1)
  { id: 'SHA_SUMMARY_4TH',     name: '４年生のまとめ',                       category: 'まとめ', difficulty_level: 2, order_index: 3500 },
]
