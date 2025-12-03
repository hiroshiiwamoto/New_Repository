// SAPIX 学習スケジュールデータ（単元ID対応版）

// 新三年生 1月～3月 サンプルスケジュール
export const generateGrade3Schedule = () => {
  const tasks = [];
  let taskId = Date.now();

  // 日付ヘルパー関数
  const getDate = (month, day) => {
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 1月（準備期間）
  tasks.push(
    { id: taskId++, title: '2年生算数復習 計算ドリル', subject: '算数', grade: '3年生', unitId: 'math3_01', unit: '計算の基礎（足し算・引き算）', taskType: 'basic', priority: 'A', dueDate: getDate(1, 6), completed: false },
    { id: taskId++, title: '2年生国語復習 漢字100字', subject: '国語', grade: '3年生', unitId: 'lang3_01', unit: '漢字（3年配当）', taskType: 'basic', priority: 'A', dueDate: getDate(1, 7), completed: false },
    { id: taskId++, title: '身の回りの生き物を観察しよう', subject: '理科', grade: '3年生', unitId: 'sci3_01', unit: '身の回りの生き物', taskType: 'daily', priority: 'B', dueDate: getDate(1, 8), completed: false },
    { id: taskId++, title: 'まちたんけんの準備', subject: '社会', grade: '3年生', unitId: 'soc3_02', unit: 'まちたんけん', taskType: 'daily', priority: 'B', dueDate: getDate(1, 9), completed: false },

    { id: taskId++, title: '掛け算の練習', subject: '算数', grade: '3年生', unitId: 'math3_02', unit: '計算の基礎（掛け算・割り算）', taskType: 'basic', priority: 'A', dueDate: getDate(1, 13), completed: false },
    { id: taskId++, title: '物語文を読もう', subject: '国語', grade: '3年生', unitId: 'lang3_03', unit: '物語文の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(1, 14), completed: false },
    { id: taskId++, title: '植物の観察日記', subject: '理科', grade: '3年生', unitId: 'sci3_02', unit: '植物の観察', taskType: 'daily', priority: 'B', dueDate: getDate(1, 15), completed: false },
    { id: taskId++, title: '身近な地域について', subject: '社会', grade: '3年生', unitId: 'soc3_01', unit: '身近な地域', taskType: 'daily', priority: 'B', dueDate: getDate(1, 16), completed: false },

    { id: taskId++, title: '時刻と時間の問題', subject: '算数', grade: '3年生', unitId: 'math3_03', unit: '時刻と時間', taskType: 'daily', priority: 'A', dueDate: getDate(1, 20), completed: false },
    { id: taskId++, title: '語彙を増やそう', subject: '国語', grade: '3年生', unitId: 'lang3_02', unit: '語彙の基礎', taskType: 'daily', priority: 'B', dueDate: getDate(1, 22), completed: false },
  );

  // 2月（新学年スタート）
  tasks.push(
    { id: taskId++, title: '長さの単位', subject: '算数', grade: '3年生', unitId: 'math3_04', unit: '長さ・重さ', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: '説明文を読もう', subject: '国語', grade: '3年生', unitId: 'lang3_04', unit: '説明文の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: '磁石の実験', subject: '理科', grade: '3年生', unitId: 'sci3_03', unit: '磁石の性質', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: 'お店の仕事を調べよう', subject: '社会', grade: '3年生', unitId: 'soc3_03', unit: '買い物と仕事', taskType: 'daily', priority: 'B', dueDate: getDate(2, 3), completed: false },

    { id: taskId++, title: '重さの単位', subject: '算数', grade: '3年生', unitId: 'math3_04', unit: '長さ・重さ', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: '音読の練習', subject: '国語', grade: '3年生', unitId: 'lang3_05', unit: '音読・暗唱', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: '電気の回路', subject: '理科', grade: '3年生', unitId: 'sci3_04', unit: '電気の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: '昔の道具を調べる', subject: '社会', grade: '3年生', unitId: 'soc3_04', unit: '昔の道具', taskType: 'daily', priority: 'B', dueDate: getDate(2, 10), completed: false },

    { id: taskId++, title: 'かさの単位', subject: '算数', grade: '3年生', unitId: 'math3_05', unit: 'かさ', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false },
    { id: taskId++, title: '主語と述語', subject: '国語', grade: '3年生', unitId: 'lang3_07', unit: '主語と述語', taskType: 'daily', priority: 'B', dueDate: getDate(2, 18), completed: false },
    { id: taskId++, title: '太陽の動きを観察', subject: '理科', grade: '3年生', unitId: 'sci3_05', unit: '太陽の動き', taskType: 'daily', priority: 'A', dueDate: getDate(2, 19), completed: false },
    { id: taskId++, title: '季節の行事', subject: '社会', grade: '3年生', unitId: 'soc3_05', unit: '季節の行事', taskType: 'daily', priority: 'B', dueDate: getDate(2, 20), completed: false },

    { id: taskId++, title: '図形の基礎', subject: '算数', grade: '3年生', unitId: 'math3_06', unit: '図形の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(2, 24), completed: false },
    { id: taskId++, title: '短い文章を書く練習', subject: '国語', grade: '3年生', unitId: 'lang3_08', unit: '短い文章を書こう', taskType: 'daily', priority: 'A', dueDate: getDate(2, 25), completed: false },
  );

  // 3月
  tasks.push(
    { id: taskId++, title: '三角形と四角形', subject: '算数', grade: '3年生', unitId: 'math3_07', unit: '三角形と四角形の基本', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false },
    { id: taskId++, title: 'かたかなことば', subject: '国語', grade: '3年生', unitId: 'lang3_06', unit: 'かたかなことば', taskType: 'daily', priority: 'B', dueDate: getDate(3, 4), completed: false },
    { id: taskId++, title: 'かげと太陽', subject: '理科', grade: '3年生', unitId: 'sci3_06', unit: 'かげと太陽', taskType: 'daily', priority: 'A', dueDate: getDate(3, 5), completed: false },
    { id: taskId++, title: '市の様子を調べる', subject: '社会', grade: '3年生', unitId: 'soc3_06', unit: '市の様子', taskType: 'daily', priority: 'B', dueDate: getDate(3, 6), completed: false },

    { id: taskId++, title: '表とグラフの読み方', subject: '算数', grade: '3年生', unitId: 'math3_08', unit: '表とグラフの読み方', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false },
    { id: taskId++, title: '漢字のまとめ', subject: '国語', grade: '3年生', unitId: 'lang3_01', unit: '漢字（3年配当）', taskType: 'test', priority: 'A', dueDate: getDate(3, 11), completed: false },
    { id: taskId++, title: '風やゴムの力', subject: '理科', grade: '3年生', unitId: 'sci3_07', unit: '風やゴムの力', taskType: 'daily', priority: 'A', dueDate: getDate(3, 12), completed: false },

    { id: taskId++, title: '大きい数', subject: '算数', grade: '3年生', unitId: 'math3_09', unit: '大きい数', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false },
    { id: taskId++, title: '物語文の感想文', subject: '国語', grade: '3年生', unitId: 'lang3_03', unit: '物語文の基礎', taskType: 'daily', priority: 'B', dueDate: getDate(3, 18), completed: false },
    { id: taskId++, title: '光の性質', subject: '理科', grade: '3年生', unitId: 'sci3_08', unit: '光の性質', taskType: 'daily', priority: 'A', dueDate: getDate(3, 19), completed: false },

    { id: taskId++, title: '文章題に挑戦', subject: '算数', grade: '3年生', unitId: 'math3_10', unit: '文章題入門', taskType: 'daily', priority: 'A', dueDate: getDate(3, 24), completed: false },
    { id: taskId++, title: '単位の換算', subject: '算数', grade: '3年生', unitId: 'math3_11', unit: '単位の換算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 26), completed: false },
    { id: taskId++, title: 'きまりを見つけよう', subject: '算数', grade: '3年生', unitId: 'math3_12', unit: 'きまりを見つけよう', taskType: 'daily', priority: 'B', dueDate: getDate(3, 27), completed: false },

    { id: taskId++, title: '3月総復習テスト', subject: '算数', grade: '3年生', unitId: 'math3_01', unit: '計算の基礎（足し算・引き算）', taskType: 'test', priority: 'A', dueDate: getDate(3, 31), completed: false },
  );

  return tasks.map(task => ({
    ...task,
    createdAt: new Date().toISOString()
  }));
};

// 新四年生 1月～3月 サンプルスケジュール
export const generateGrade4Schedule = () => {
  const tasks = [];
  let taskId = Date.now();

  // 日付ヘルパー関数
  const getDate = (month, day) => {
    return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 1月（準備期間）
  tasks.push(
    { id: taskId++, title: '3年生算数総復習 計算ドリル', subject: '算数', grade: '4年生', unitId: 'math4_01', unit: '四則計算の基礎', taskType: 'basic', priority: 'B', dueDate: getDate(1, 6), completed: false },
    { id: taskId++, title: '3年生国語総復習 漢字200字', subject: '国語', grade: '4年生', unitId: 'lang4_01', unit: '漢字（4年配当）', taskType: 'basic', priority: 'B', dueDate: getDate(1, 7), completed: false },
    { id: taskId++, title: '冬期講習の復習 算数', subject: '算数', grade: '4年生', unitId: 'math4_07', unit: '周期算', taskType: 'daily', priority: 'A', dueDate: getDate(1, 8), completed: false },
    { id: taskId++, title: '読解問題集 物語文', subject: '国語', grade: '4年生', unitId: 'lang4_05', unit: '物語文の読解', taskType: 'daily', priority: 'B', dueDate: getDate(1, 9), completed: false },

    { id: taskId++, title: '新4年準備 計算テクニック', subject: '算数', grade: '4年生', unitId: 'math4_01', unit: '四則計算の基礎', taskType: 'basic', priority: 'A', dueDate: getDate(1, 13), completed: false },
    { id: taskId++, title: '漢字先取り学習 4年生範囲', subject: '国語', grade: '4年生', unitId: 'lang4_01', unit: '漢字（4年配当）', taskType: 'daily', priority: 'A', dueDate: getDate(1, 14), completed: false },
    { id: taskId++, title: '都道府県の位置 暗記', subject: '社会', grade: '4年生', unitId: 'soc4_01', unit: '都道府県', taskType: 'daily', priority: 'B', dueDate: getDate(1, 15), completed: false },
    { id: taskId++, title: '植物の基礎 予習', subject: '理科', grade: '4年生', unitId: 'sci4_01', unit: '植物のつくり', taskType: 'daily', priority: 'B', dueDate: getDate(1, 16), completed: false },

    { id: taskId++, title: '基礎トレ 1月分総復習', subject: '算数', grade: '4年生', unitId: 'math4_14', unit: '小数の計算', taskType: 'basic', priority: 'A', dueDate: getDate(1, 20), completed: false },
    { id: taskId++, title: '語彙力強化 ことわざ・慣用句', subject: '国語', grade: '4年生', unitId: 'lang4_03', unit: 'ことわざ・慣用句', taskType: 'daily', priority: 'B', dueDate: getDate(1, 22), completed: false },
  );

  // 2月（新学年スタート）
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.1 植木算', subject: '算数', grade: '4年生', unitId: 'math4_02', unit: '植木算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.1 説明文読解', subject: '国語', grade: '4年生', unitId: 'lang4_04', unit: '説明文の読解', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.1 春の植物', subject: '理科', grade: '4年生', unitId: 'sci4_02', unit: '植物の成長', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.1 地図記号', subject: '社会', grade: '4年生', unitId: 'soc4_02', unit: '地図の見方', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false },
    { id: taskId++, title: '基礎トレ 2/4', subject: '算数', grade: '4年生', unitId: 'math4_01', unit: '四則計算の基礎', taskType: 'basic', priority: 'A', dueDate: getDate(2, 4), completed: false },
    { id: taskId++, title: '4年生漢字 No.1', subject: '国語', grade: '4年生', unitId: 'lang4_01', unit: '漢字（4年配当）', taskType: 'basic', priority: 'A', dueDate: getDate(2, 5), completed: false },
    { id: taskId++, title: '算数復習 植木算の問題演習', subject: '算数', grade: '4年生', unitId: 'math4_02', unit: '植木算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 6), completed: false },
    { id: taskId++, title: '理科 植物の観察日記', subject: '理科', grade: '4年生', unitId: 'sci4_02', unit: '植物の成長', taskType: 'daily', priority: 'B', dueDate: getDate(2, 7), completed: false },

    { id: taskId++, title: 'デイリーサピックス No.2 方陣算', subject: '算数', grade: '4年生', unitId: 'math4_03', unit: '方陣算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.2 物語文', subject: '国語', grade: '4年生', unitId: 'lang4_05', unit: '物語文の読解', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.2 昆虫', subject: '理科', grade: '4年生', unitId: 'sci4_04', unit: '昆虫', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: 'デイリーサピックス No.2 農業', subject: '社会', grade: '4年生', unitId: 'soc4_03', unit: '農業', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false },
    { id: taskId++, title: '基礎トレ 2/11', subject: '算数', grade: '4年生', unitId: 'math4_15', unit: '分数の計算', taskType: 'basic', priority: 'A', dueDate: getDate(2, 11), completed: false },
    { id: taskId++, title: '漢字テスト対策', subject: '国語', grade: '4年生', unitId: 'lang4_01', unit: '漢字（4年配当）', taskType: 'test', priority: 'A', dueDate: getDate(2, 12), completed: false },

    { id: taskId++, title: 'デイリーサピックス No.3 和差算', subject: '算数', grade: '4年生', unitId: 'math4_04', unit: '和差算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false },
    { id: taskId++, title: '詩の鑑賞', subject: '国語', grade: '4年生', unitId: 'lang4_06', unit: '詩の鑑賞', taskType: 'daily', priority: 'B', dueDate: getDate(2, 18), completed: false },
    { id: taskId++, title: '電気回路の実験', subject: '理科', grade: '4年生', unitId: 'sci4_09', unit: '電気回路', taskType: 'daily', priority: 'A', dueDate: getDate(2, 19), completed: false },
    { id: taskId++, title: '日本の地形', subject: '社会', grade: '4年生', unitId: 'soc4_07', unit: '日本の地形', taskType: 'daily', priority: 'B', dueDate: getDate(2, 20), completed: false },

    { id: taskId++, title: 'デイリーサピックス No.4 分配算', subject: '算数', grade: '4年生', unitId: 'math4_05', unit: '分配算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 24), completed: false },
    { id: taskId++, title: '記述問題の練習', subject: '国語', grade: '4年生', unitId: 'lang4_09', unit: '記述問題（基礎）', taskType: 'daily', priority: 'A', dueDate: getDate(2, 25), completed: false },
    { id: taskId++, title: '水産業について', subject: '社会', grade: '4年生', unitId: 'soc4_04', unit: '水産業', taskType: 'daily', priority: 'B', dueDate: getDate(2, 26), completed: false },
  );

  // 3月
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.5 つるかめ算', subject: '算数', grade: '4年生', unitId: 'math4_06', unit: 'つるかめ算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false },
    { id: taskId++, title: '短歌・俳句の学習', subject: '国語', grade: '4年生', unitId: 'lang4_07', unit: '短歌・俳句', taskType: 'daily', priority: 'B', dueDate: getDate(3, 4), completed: false },
    { id: taskId++, title: '太陽と月', subject: '理科', grade: '4年生', unitId: 'sci4_05', unit: '太陽と月', taskType: 'daily', priority: 'A', dueDate: getDate(3, 5), completed: false },
    { id: taskId++, title: '工業の種類', subject: '社会', grade: '4年生', unitId: 'soc4_05', unit: '工業', taskType: 'daily', priority: 'B', dueDate: getDate(3, 6), completed: false },

    { id: taskId++, title: '角度の基礎', subject: '算数', grade: '4年生', unitId: 'math4_09', unit: '角度の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false },
    { id: taskId++, title: '文法の基礎', subject: '国語', grade: '4年生', unitId: 'lang4_08', unit: '文法の基礎', taskType: 'daily', priority: 'B', dueDate: getDate(3, 11), completed: false },
    { id: taskId++, title: '星の動き', subject: '理科', grade: '4年生', unitId: 'sci4_06', unit: '星の動き', taskType: 'daily', priority: 'A', dueDate: getDate(3, 12), completed: false },
    { id: taskId++, title: '気候と産業', subject: '社会', grade: '4年生', unitId: 'soc4_08', unit: '日本の気候', taskType: 'daily', priority: 'B', dueDate: getDate(3, 13), completed: false },

    { id: taskId++, title: '三角形・四角形', subject: '算数', grade: '4年生', unitId: 'math4_10', unit: '三角形・四角形', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false },
    { id: taskId++, title: '要約の練習', subject: '国語', grade: '4年生', unitId: 'lang4_10', unit: '要約の練習', taskType: 'daily', priority: 'A', dueDate: getDate(3, 18), completed: false },
    { id: taskId++, title: '物の溶け方', subject: '理科', grade: '4年生', unitId: 'sci4_07', unit: '物の溶け方', taskType: 'daily', priority: 'A', dueDate: getDate(3, 19), completed: false },
    { id: taskId++, title: '貿易について', subject: '社会', grade: '4年生', unitId: 'soc4_06', unit: '貿易', taskType: 'daily', priority: 'B', dueDate: getDate(3, 20), completed: false },

    { id: taskId++, title: '面積の基礎', subject: '算数', grade: '4年生', unitId: 'math4_11', unit: '面積の基礎', taskType: 'daily', priority: 'A', dueDate: getDate(3, 24), completed: false },
    { id: taskId++, title: '漢字総復習', subject: '国語', grade: '4年生', unitId: 'lang4_01', unit: '漢字（4年配当）', taskType: 'test', priority: 'A', dueDate: getDate(3, 25), completed: false },
    { id: taskId++, title: 'てこ・滑車', subject: '理科', grade: '4年生', unitId: 'sci4_10', unit: 'てこ・滑車', taskType: 'daily', priority: 'A', dueDate: getDate(3, 26), completed: false },
    { id: taskId++, title: '各地方の特色', subject: '社会', grade: '4年生', unitId: 'soc4_09', unit: '各地方の特色', taskType: 'daily', priority: 'B', dueDate: getDate(3, 27), completed: false },

    { id: taskId++, title: '3月総復習テスト', subject: '算数', grade: '4年生', unitId: 'math4_13', unit: '場合の数（基礎）', taskType: 'test', priority: 'A', dueDate: getDate(3, 31), completed: false },
  );

  return tasks.map(task => ({
    ...task,
    createdAt: new Date().toISOString()
  }));
};

// 学年を指定してスケジュールを生成
export const generateSAPIXScheduleByGrade = (grade = '4年生') => {
  switch (grade) {
    case '3年生':
      return generateGrade3Schedule();
    case '4年生':
      return generateGrade4Schedule();
    default:
      return generateGrade4Schedule(); // デフォルトは4年生
  }
};

// 後方互換性のため、デフォルトエクスポートは4年生のスケジュール
export const generateSAPIXSchedule = generateGrade4Schedule;
