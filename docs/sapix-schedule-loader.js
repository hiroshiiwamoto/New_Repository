// SAPIX新四年生 1月～3月 学習スケジュール自動入力スクリプト
// ブラウザのコンソールで実行してください

const generateSAPIXSchedule = () => {
  const tasks = [];
  let taskId = Date.now();

  // 日付ヘルパー関数
  const getDate = (month, day) => {
    return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 1月（新4年準備期間）のスケジュール
  // Week 1: 1/6-1/12
  tasks.push(
    { id: taskId++, title: '3年生算数総復習 計算ドリル', subject: '算数', unit: '計算', taskType: 'basic', priority: 'B', dueDate: getDate(1, 6), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '3年生国語総復習 漢字200字', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'B', dueDate: getDate(1, 7), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '冬期講習の復習 算数', subject: '算数', unit: '文章題', taskType: 'daily', priority: 'A', dueDate: getDate(1, 8), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '読解問題集 物語文', subject: '国語', unit: '読解', taskType: 'daily', priority: 'B', dueDate: getDate(1, 9), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 2: 1/13-1/19
  tasks.push(
    { id: taskId++, title: '新4年準備 計算テクニック', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(1, 13), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '漢字先取り学習 4年生範囲', subject: '国語', unit: '漢字', taskType: 'daily', priority: 'A', dueDate: getDate(1, 14), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '都道府県の位置 暗記', subject: '社会', unit: '地理', taskType: 'daily', priority: 'B', dueDate: getDate(1, 15), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '植物の基礎 予習', subject: '理科', unit: '生物', taskType: 'daily', priority: 'B', dueDate: getDate(1, 16), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 3: 1/20-1/26
  tasks.push(
    { id: taskId++, title: '基礎トレ 1月分総復習', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(1, 20), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '語彙力強化 ことわざ・慣用句', subject: '国語', unit: '語彙', taskType: 'daily', priority: 'B', dueDate: getDate(1, 22), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '新4年スタートに向けた学習計画', subject: '算数', unit: '', taskType: 'daily', priority: 'A', dueDate: getDate(1, 25), completed: false, createdAt: new Date().toISOString() },
  );

  // 2月（新4年生スタート）のスケジュール
  // Week 1: 2/3-2/9（新学年開始）
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.1 植木算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.1 説明文読解', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.1 春の植物', subject: '理科', unit: '生物', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.1 地図記号', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(2, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 2/4', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(2, 4), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '4年生漢字 No.1', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'A', dueDate: getDate(2, 5), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '算数復習 植木算の問題演習', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 6), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '理科 植物の観察日記', subject: '理科', unit: '生物', taskType: 'daily', priority: 'B', dueDate: getDate(2, 7), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 2: 2/10-2/16
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.2 方陣算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.2 物語文読解', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.2 昆虫の体', subject: '理科', unit: '生物', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.2 都道府県', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(2, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 2/11', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(2, 11), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '前回の復習 植木算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'B', dueDate: getDate(2, 12), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '4年生漢字 No.2', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'A', dueDate: getDate(2, 13), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '都道府県庁所在地 暗記', subject: '社会', unit: '地理', taskType: 'daily', priority: 'B', dueDate: getDate(2, 14), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 3: 2/17-2/23
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.3 周期算', subject: '算数', unit: '規則性', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.3 説明文', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.3 太陽の動き', subject: '理科', unit: '地学', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.3 地形図', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(2, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 2/18', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(2, 18), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '弱点補強 方陣算の復習', subject: '算数', unit: '特殊算', taskType: 'weakness', priority: 'A', dueDate: getDate(2, 19), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '4年生漢字 No.3', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'A', dueDate: getDate(2, 20), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 4: 2/24-3/2（マンスリーテスト準備）
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.4 復習', subject: '算数', unit: '文章題', taskType: 'daily', priority: 'A', dueDate: getDate(2, 24), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'マンスリーテスト対策 算数総復習', subject: '算数', unit: '特殊算', taskType: 'test', priority: 'A', dueDate: getDate(2, 26), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'マンスリーテスト対策 国語総復習', subject: '国語', unit: '読解', taskType: 'test', priority: 'A', dueDate: getDate(2, 27), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'マンスリーテスト対策 理科総復習', subject: '理科', unit: '生物', taskType: 'test', priority: 'A', dueDate: getDate(2, 28), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'マンスリーテスト対策 社会総復習', subject: '社会', unit: '地理', taskType: 'test', priority: 'A', dueDate: getDate(3, 1), completed: false, createdAt: new Date().toISOString() },
  );

  // 3月のスケジュール
  // Week 1: 3/3-3/9
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.5 和差算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.5 詩の読解', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.5 水溶液', subject: '理科', unit: '化学', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.5 日本の山地', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(3, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 3/4', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(3, 4), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '4年生漢字 No.5', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'A', dueDate: getDate(3, 6), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 2: 3/10-3/16
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.6 分配算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.6 物語文', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.6 磁石', subject: '理科', unit: '物理', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.6 日本の川', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(3, 10), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 3/11', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(3, 11), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '和差算の弱点補強', subject: '算数', unit: '特殊算', taskType: 'weakness', priority: 'B', dueDate: getDate(3, 13), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 3: 3/17-3/23
  tasks.push(
    { id: taskId++, title: 'デイリーサピックス No.7 つるかめ算', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.7 論説文', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.7 月の満ち欠け', subject: '理科', unit: '地学', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: 'デイリーサピックス No.7 平野と盆地', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(3, 17), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '基礎トレ 3/18', subject: '算数', unit: '計算', taskType: 'basic', priority: 'A', dueDate: getDate(3, 18), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '4年生漢字 No.7', subject: '国語', unit: '漢字', taskType: 'basic', priority: 'A', dueDate: getDate(3, 20), completed: false, createdAt: new Date().toISOString() },
  );

  // Week 4: 3/24-3/30（春期講習準備）
  tasks.push(
    { id: taskId++, title: '春期講習準備 算数総復習', subject: '算数', unit: '特殊算', taskType: 'daily', priority: 'A', dueDate: getDate(3, 24), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '春期講習準備 国語総復習', subject: '国語', unit: '読解', taskType: 'daily', priority: 'A', dueDate: getDate(3, 25), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '春期講習準備 理科総復習', subject: '理科', unit: '', taskType: 'daily', priority: 'A', dueDate: getDate(3, 26), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '春期講習準備 社会総復習', subject: '社会', unit: '地理', taskType: 'daily', priority: 'A', dueDate: getDate(3, 27), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '2-3月の総復習テスト', subject: '算数', unit: '', taskType: 'test', priority: 'A', dueDate: getDate(3, 29), completed: false, createdAt: new Date().toISOString() },
  );

  // 4月初週
  tasks.push(
    { id: taskId++, title: '春期講習の復習', subject: '算数', unit: '図形', taskType: 'daily', priority: 'A', dueDate: getDate(4, 3), completed: false, createdAt: new Date().toISOString() },
    { id: taskId++, title: '新学期スタート準備', subject: '国語', unit: '', taskType: 'daily', priority: 'B', dueDate: getDate(4, 5), completed: false, createdAt: new Date().toISOString() },
  );

  return tasks;
};

// LocalStorageに保存
const saveTasks = () => {
  const tasks = generateSAPIXSchedule();
  localStorage.setItem('sapixTasks', JSON.stringify(tasks));
  console.log(`✅ ${tasks.length}個のタスクを保存しました！`);
  console.log('🔄 ページをリロードしてください。');

  // タスクの内訳を表示
  const breakdown = {
    '国語': tasks.filter(t => t.subject === '国語').length,
    '算数': tasks.filter(t => t.subject === '算数').length,
    '理科': tasks.filter(t => t.subject === '理科').length,
    '社会': tasks.filter(t => t.subject === '社会').length,
  };
  console.log('📊 科目別タスク数:', breakdown);
};

// 実行
saveTasks();
