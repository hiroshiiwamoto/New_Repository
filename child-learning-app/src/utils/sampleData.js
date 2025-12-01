// SAPIX新四年生 1月～3月 学習スケジュールデータ（単元ID対応版）

export const generateSAPIXSchedule = () => {
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
