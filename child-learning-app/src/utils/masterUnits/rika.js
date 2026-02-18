/**
 * 理科 マスター単元データ（50単元）
 * ID命名規則: RIK_分野略語_単元略語
 * difficulty_level: 1=基礎〜5=最難問
 * order_index: 2001〜2500（2000番台）
 */
export const RIKA_UNITS = [
  // 生物分野 (14)
  { id: 'RIK_BIO_INSECT',       name: '昆虫の育ちと体',         category: '生物分野', difficulty_level: 2, order_index: 2010 },
  { id: 'RIK_BIO_INSECT_SEAS',  name: '昆虫の冬越し・季節',     category: '生物分野', difficulty_level: 2, order_index: 2020 },
  { id: 'RIK_BIO_PLANT_GROW',   name: '植物の発芽と成長',       category: '生物分野', difficulty_level: 2, order_index: 2030 },
  { id: 'RIK_BIO_FLOWER',       name: '花のつくりと受粉',       category: '生物分野', difficulty_level: 3, order_index: 2040 },
  { id: 'RIK_BIO_PLANT_PART',   name: '根・茎・葉のつくり',     category: '生物分野', difficulty_level: 3, order_index: 2050 },
  { id: 'RIK_BIO_PHOTO',        name: '植物の光合成・呼吸',     category: '生物分野', difficulty_level: 4, order_index: 2060 },
  { id: 'RIK_BIO_PLANT_CLASS',  name: '植物の分類と季節',       category: '生物分野', difficulty_level: 2, order_index: 2070 },
  { id: 'RIK_BIO_FISH',         name: 'メダカ・魚の育ち',       category: '生物分野', difficulty_level: 2, order_index: 2080 },
  { id: 'RIK_BIO_BODY_BONE',    name: 'ヒトの体（骨・筋肉）',   category: '生物分野', difficulty_level: 2, order_index: 2090 },
  { id: 'RIK_BIO_DIGEST',       name: 'ヒトの体（消化・吸収）', category: '生物分野', difficulty_level: 3, order_index: 2100 },
  { id: 'RIK_BIO_BREATH',       name: 'ヒトの体（呼吸・循環）', category: '生物分野', difficulty_level: 3, order_index: 2110 },
  { id: 'RIK_BIO_BIRTH',        name: 'ヒトの体（誕生・変化）', category: '生物分野', difficulty_level: 3, order_index: 2120 },
  { id: 'RIK_BIO_ANIMAL',       name: '動物の分類と生活',       category: '生物分野', difficulty_level: 3, order_index: 2130 },
  { id: 'RIK_BIO_ECOLOGY',      name: '生態系と環境',           category: '生物分野', difficulty_level: 4, order_index: 2140 },

  // 地学分野 (12)
  { id: 'RIK_GEO_SUN_DAY',  name: '太陽の動き（日周運動）', category: '地学分野', difficulty_level: 3, order_index: 2150 },
  { id: 'RIK_GEO_SUN_YEAR', name: '太陽の動き（年周運動）', category: '地学分野', difficulty_level: 4, order_index: 2160 },
  { id: 'RIK_GEO_MOON',     name: '月の満ち欠けと動き',     category: '地学分野', difficulty_level: 3, order_index: 2170 },
  { id: 'RIK_GEO_STAR',     name: '星の動きと星座',         category: '地学分野', difficulty_level: 3, order_index: 2180 },
  { id: 'RIK_GEO_PLANET',   name: '惑星と太陽系',           category: '地学分野', difficulty_level: 3, order_index: 2190 },
  { id: 'RIK_GEO_RIVER',    name: '流れる水の働き',         category: '地学分野', difficulty_level: 3, order_index: 2200 },
  { id: 'RIK_GEO_LAYER',    name: '地層の重なりと化石',     category: '地学分野', difficulty_level: 3, order_index: 2210 },
  { id: 'RIK_GEO_VOLCANO',  name: '火山と岩石',             category: '地学分野', difficulty_level: 3, order_index: 2220 },
  { id: 'RIK_GEO_QUAKE',    name: '地震の伝わり方',         category: '地学分野', difficulty_level: 3, order_index: 2230 },
  { id: 'RIK_GEO_WEATHER',  name: '天気の変化・雲',         category: '地学分野', difficulty_level: 3, order_index: 2240 },
  { id: 'RIK_GEO_CLIMATE',  name: '日本の気候と気象',       category: '地学分野', difficulty_level: 3, order_index: 2250 },
  { id: 'RIK_GEO_ENV',      name: '環境問題（温暖化等）',   category: '地学分野', difficulty_level: 3, order_index: 2260 },

  // 物理分野 (14)
  { id: 'RIK_PHY_MIRROR',       name: '鏡と光の進み方',           category: '物理分野', difficulty_level: 2, order_index: 2270 },
  { id: 'RIK_PHY_LENS',         name: '凸レンズと光',             category: '物理分野', difficulty_level: 3, order_index: 2280 },
  { id: 'RIK_PHY_SOUND',        name: '音の性質と伝わり方',       category: '物理分野', difficulty_level: 2, order_index: 2290 },
  { id: 'RIK_PHY_HEAT',         name: '熱の伝わり方',             category: '物理分野', difficulty_level: 2, order_index: 2300 },
  { id: 'RIK_PHY_EXPAND',       name: '物質の膨張と温度',         category: '物理分野', difficulty_level: 3, order_index: 2310 },
  { id: 'RIK_PHY_CIRCUIT_BASIC',name: '豆電球と乾電池',           category: '物理分野', difficulty_level: 2, order_index: 2320 },
  { id: 'RIK_PHY_MAGNET',       name: '電流と磁石（電磁石）',     category: '物理分野', difficulty_level: 3, order_index: 2330 },
  { id: 'RIK_PHY_CIRCUIT',      name: '回路と抵抗',               category: '物理分野', difficulty_level: 4, order_index: 2340 },
  { id: 'RIK_PHY_SCALE',        name: '上皿天秤・バネばかり',     category: '物理分野', difficulty_level: 2, order_index: 2350 },
  { id: 'RIK_PHY_LEVER',        name: 'てこの原理',               category: '物理分野', difficulty_level: 4, order_index: 2360 },
  { id: 'RIK_PHY_PULLEY',       name: 'かっ車・輪軸',             category: '物理分野', difficulty_level: 4, order_index: 2370 },
  { id: 'RIK_PHY_SLOPE',        name: '斜面・ねじ・仕事',         category: '物理分野', difficulty_level: 4, order_index: 2380 },
  { id: 'RIK_PHY_PENDULUM',     name: '振り子の運動',             category: '物理分野', difficulty_level: 3, order_index: 2390 },
  { id: 'RIK_PHY_MOTION',       name: '物体の運動（衝突等）',     category: '物理分野', difficulty_level: 4, order_index: 2400 },

  // 化学分野 (10)
  { id: 'RIK_CHE_DISSOLVE',  name: '物の溶け方（溶解度）',           category: '化学分野', difficulty_level: 3, order_index: 2410 },
  { id: 'RIK_CHE_ACID',      name: '水溶液の性質（酸・アルカリ）',   category: '化学分野', difficulty_level: 4, order_index: 2420 },
  { id: 'RIK_CHE_NEUTRAL',   name: '水溶液の中和反応',               category: '化学分野', difficulty_level: 5, order_index: 2430 },
  { id: 'RIK_CHE_METAL',     name: '金属と水溶液の反応',             category: '化学分野', difficulty_level: 4, order_index: 2440 },
  { id: 'RIK_CHE_GAS_BASIC', name: '気体の発生（酸素・二酸化炭素）', category: '化学分野', difficulty_level: 3, order_index: 2450 },
  { id: 'RIK_CHE_GAS_TYPE',  name: '気体の性質（水素・アンモニア等）',category: '化学分野', difficulty_level: 3, order_index: 2460 },
  { id: 'RIK_CHE_BURN',      name: '燃焼の仕組み',                   category: '化学分野', difficulty_level: 4, order_index: 2470 },
  { id: 'RIK_CHE_STATE',     name: '状態変化（氷・水・水蒸気）',     category: '化学分野', difficulty_level: 2, order_index: 2480 },
  { id: 'RIK_CHE_SEPARATE',  name: '分離の工夫（ろ過・蒸留）',       category: '化学分野', difficulty_level: 3, order_index: 2490 },
  { id: 'RIK_CHE_TOOLS',     name: '化学器具の使い方',               category: '化学分野', difficulty_level: 2, order_index: 2500 },
]
