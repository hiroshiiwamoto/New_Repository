/**
 * 社会 マスター単元データ（50単元）
 * ID命名規則: SHA_分野略語_単元略語
 * difficulty_level: 1=基礎〜5=最難問
 * order_index: 3001〜3500（3000番台）
 */
export const SHAKAI_UNITS = [
  // 地理分野：地域・産業 (19)
  { id: 'SHA_GEO_MAP',       name: '地図の見方・記号',                   category: '地理分野：地域・産業', difficulty_level: 1, order_index: 3010 },
  { id: 'SHA_GEO_LAND',      name: '日本の国土と地形（山地・平野・川）', category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3020 },
  { id: 'SHA_GEO_CLIMATE',   name: '日本の気候と自然災害',               category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3030 },
  { id: 'SHA_GEO_CROP',      name: '農作物の栽培と地域',                 category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3040 },
  { id: 'SHA_GEO_LIVESTOCK', name: '畜産業と酪農',                       category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3050 },
  { id: 'SHA_GEO_FISHERY',   name: '水産業（漁法・漁港）',               category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3060 },
  { id: 'SHA_GEO_RESOURCE',  name: '資源とエネルギー',                   category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3070 },
  { id: 'SHA_GEO_INDUSTRY',  name: '工業地帯・地域の特色',               category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3080 },
  { id: 'SHA_GEO_CRAFT',     name: '伝統的工芸品',                       category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3090 },
  { id: 'SHA_GEO_TRADE',     name: '貿易と運輸（港・空港）',             category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3100 },
  { id: 'SHA_GEO_INFO',      name: '情報化社会と通信',                   category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3110 },
  { id: 'SHA_GEO_HOKKAIDO',  name: '北海道地方',                         category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3120 },
  { id: 'SHA_GEO_TOHOKU',    name: '東北地方',                           category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3130 },
  { id: 'SHA_GEO_KANTO',     name: '関東地方',                           category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3140 },
  { id: 'SHA_GEO_CHUBU',     name: '中部地方',                           category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3150 },
  { id: 'SHA_GEO_KINKI',     name: '近畿地方',                           category: '地理分野：地域・産業', difficulty_level: 3, order_index: 3160 },
  { id: 'SHA_GEO_CHUGOKU',   name: '中国・四国地方',                     category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3170 },
  { id: 'SHA_GEO_KYUSHU',    name: '九州・沖縄地方',                     category: '地理分野：地域・産業', difficulty_level: 2, order_index: 3180 },
  { id: 'SHA_GEO_PREF',      name: '都道府県と県庁所在地',               category: '地理分野：地域・産業', difficulty_level: 1, order_index: 3190 },

  // 歴史分野：古代〜近世 (10)
  { id: 'SHA_HIST_ANCIENT',   name: '旧石器・縄文・弥生時代',             category: '歴史分野：古代〜近世', difficulty_level: 2, order_index: 3200 },
  { id: 'SHA_HIST_ASUKA',     name: '古墳・飛鳥時代（聖徳太子）',         category: '歴史分野：古代〜近世', difficulty_level: 2, order_index: 3210 },
  { id: 'SHA_HIST_NARA',      name: '奈良時代（平城京）',                 category: '歴史分野：古代〜近世', difficulty_level: 2, order_index: 3220 },
  { id: 'SHA_HIST_HEIAN',     name: '平安時代（摂関政治・国風文化）',     category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3230 },
  { id: 'SHA_HIST_KAMAKURA',  name: '鎌倉時代（幕府の成立・蒙古襲来）',  category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3240 },
  { id: 'SHA_HIST_MUROMACHI', name: '室町時代（文化・戦国大名）',         category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3250 },
  { id: 'SHA_HIST_AZUCHI',    name: '安土桃山時代（織豊政権）',           category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3260 },
  { id: 'SHA_HIST_EDO1',      name: '江戸時代（幕藩体制・鎖国）',         category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3270 },
  { id: 'SHA_HIST_EDO2',      name: '江戸時代（産業・改革・学問）',       category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3280 },
  { id: 'SHA_HIST_BAKUMATSU', name: '幕末と開国',                         category: '歴史分野：古代〜近世', difficulty_level: 3, order_index: 3290 },

  // 歴史分野：近代〜現代 (8)
  { id: 'SHA_MOD_MEIJI',   name: '明治維新と富国強兵',             category: '歴史分野：近代〜現代', difficulty_level: 3, order_index: 3300 },
  { id: 'SHA_MOD_WAR',     name: '条約改正と日清・日露戦争',       category: '歴史分野：近代〜現代', difficulty_level: 3, order_index: 3310 },
  { id: 'SHA_MOD_TAISHO',  name: '大正デモクラシーと政党政治',     category: '歴史分野：近代〜現代', difficulty_level: 3, order_index: 3320 },
  { id: 'SHA_MOD_SHOWA',   name: '昭和（戦前・戦中）',             category: '歴史分野：近代〜現代', difficulty_level: 4, order_index: 3330 },
  { id: 'SHA_MOD_POSTWAR', name: '占領下の日本と戦後改革',         category: '歴史分野：近代〜現代', difficulty_level: 3, order_index: 3340 },
  { id: 'SHA_MOD_GROWTH',  name: '高度経済成長と現代の日本',       category: '歴史分野：近代〜現代', difficulty_level: 3, order_index: 3350 },
  { id: 'SHA_MOD_CULTURE', name: '日本の文化史（全時代）',         category: '歴史分野：近代〜現代', difficulty_level: 4, order_index: 3360 },
  { id: 'SHA_MOD_FOREIGN', name: '外交史（大陸との交流）',         category: '歴史分野：近代〜現代', difficulty_level: 4, order_index: 3370 },

  // 公民分野：憲法・政治 (9)
  { id: 'SHA_CIVIC_CONST',    name: '日本国憲法（三原則）',             category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3380 },
  { id: 'SHA_CIVIC_EMPEROR',  name: '天皇と平和主義',                   category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3390 },
  { id: 'SHA_CIVIC_RIGHTS',   name: '基本的人権の尊重',                 category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3400 },
  { id: 'SHA_CIVIC_DIET',     name: '国会（立法）',                     category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3410 },
  { id: 'SHA_CIVIC_CABINET',  name: '内閣（行政）',                     category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3420 },
  { id: 'SHA_CIVIC_COURT',    name: '裁判所（司法・三権分立）',         category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3430 },
  { id: 'SHA_CIVIC_LOCAL',    name: '地方自治',                         category: '公民分野：憲法・政治', difficulty_level: 2, order_index: 3440 },
  { id: 'SHA_CIVIC_ELECTION', name: '選挙と政党',                       category: '公民分野：憲法・政治', difficulty_level: 3, order_index: 3450 },
  { id: 'SHA_CIVIC_ECON',     name: '経済の仕組み・税金・社会保障',     category: '公民分野：憲法・政治', difficulty_level: 4, order_index: 3460 },

  // 時事・国際・環境 (4)
  { id: 'SHA_NEWS_UN',      name: '国際連合（UN）の働き',       category: '時事・国際・環境', difficulty_level: 3, order_index: 3470 },
  { id: 'SHA_NEWS_WORLD',   name: '世界の国々と日本',           category: '時事・国際・環境', difficulty_level: 2, order_index: 3480 },
  { id: 'SHA_NEWS_ENV',     name: '環境問題・SDGs',             category: '時事・国際・環境', difficulty_level: 3, order_index: 3490 },
  { id: 'SHA_NEWS_CURRENT', name: '時事問題（最新のニュース）', category: '時事・国際・環境', difficulty_level: 3, order_index: 3500 },
]
