// SAPIX家庭学習スケジュール自動生成
//
// 授業曜日: 水曜（算数・理科）、金曜（国語・社会）
// 各教科の家庭学習優先順位（SAPIXカリキュラム共通）を
// 授業翌日〜次回授業前日に自動配分する

// 授業スケジュール（曜日 → 教科リスト）
// 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
export const CLASS_SCHEDULE = {
  3: ['算数', '理科'],  // 水曜
  5: ['国語', '社会'],  // 金曜
}

// 教科別の家庭学習テンプレート（優先順位順）
// dayOffset: 授業日を0として、何日後にやるか（配列で複数日指定可）
const HOMEWORK_TEMPLATES = {
  '算数': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'Bテキスト 復習（白丸ページ）',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 練習しよう ステップ①②',
      dayOffsets: [1],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 練習しよう ステップ③④',
      dayOffsets: [2],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 練習しよう ステップ⑤',
      dayOffsets: [3],
      priority: 'B',
    },
    {
      studyPriority: 3,
      studyCategory: 'basic-training',
      title: '基礎力トレーニング',
      dayOffsets: [0, 1, 2, 3, 4, 5, 6],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'a-review',
      title: 'Aテキスト 復習',
      dayOffsets: [4],
      priority: 'B',
    },
    {
      studyPriority: 5,
      studyCategory: 'basic-test',
      title: '基礎力定着テスト対策',
      dayOffsets: [5, 6],
      priority: 'C',
    },
  ],
  '国語': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'Bテキスト 復習',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'Bテキスト 言葉ナビ・漢字練習',
      dayOffsets: [1, 2],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'a-review',
      title: 'Aテキスト 復習',
      dayOffsets: [3],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'kanji',
      title: '漢字の要・コトノハ',
      dayOffsets: [1, 2, 3, 4],
      priority: 'B',
    },
    {
      studyPriority: 5,
      studyCategory: 'basic-test',
      title: 'デイリーチェック対策',
      dayOffsets: [4],
      priority: 'C',
    },
  ],
  '理科': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'テキスト 復習（ポイントチェック）',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'デイリーステップ①②',
      dayOffsets: [1],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'b-practice',
      title: 'デイリーステップ③〜',
      dayOffsets: [2],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'basic-test',
      title: 'コアプラス確認',
      dayOffsets: [3, 4],
      priority: 'C',
    },
  ],
  '社会': [
    {
      studyPriority: 1,
      studyCategory: 'b-review',
      title: 'テキスト 復習（ポイントチェック）',
      dayOffsets: [0],
      priority: 'A',
    },
    {
      studyPriority: 2,
      studyCategory: 'b-practice',
      title: 'デイリーステップ①②',
      dayOffsets: [1],
      priority: 'A',
    },
    {
      studyPriority: 3,
      studyCategory: 'b-practice',
      title: 'デイリーステップ③〜',
      dayOffsets: [2],
      priority: 'B',
    },
    {
      studyPriority: 4,
      studyCategory: 'knowledge',
      title: 'コアプラス・白地図',
      dayOffsets: [3, 4],
      priority: 'C',
    },
  ],
}

// 日付ヘルパー
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// 指定日の曜日(0-6)を返す
function getDayOfWeek(date) {
  return date.getDay()
}

// 直近の授業日（過去方向）を探す
function findLastClassDay(fromDate, classDayOfWeek) {
  const d = new Date(fromDate)
  while (getDayOfWeek(d) !== classDayOfWeek) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

/**
 * 今週の家庭学習スケジュールを生成
 * @param {Date} today - 基準日（デフォルト: 今日）
 * @returns {Array} 日付ごとの学習タスク配列
 *   [{
 *     id: string,
 *     subject: string,
 *     title: string,
 *     dueDate: 'YYYY-MM-DD',
 *     studyPriority: 1-5,
 *     studyCategory: string,
 *     priority: 'A' | 'B' | 'C',
 *     classDate: 'YYYY-MM-DD',
 *     isHomework: true,
 *   }]
 */
export function generateWeeklyHomework(today = new Date()) {
  const allTasks = []

  for (const [dayStr, subjects] of Object.entries(CLASS_SCHEDULE)) {
    const classDayOfWeek = parseInt(dayStr, 10)

    // 直近の授業日を取得
    const classDate = findLastClassDay(today, classDayOfWeek)
    const classDayStr = formatDate(classDate)

    // この授業日から生成するタスクの期間チェック:
    // 授業日が7日以上前なら、来週分は生成しない
    const daysSinceClass = Math.floor((today - classDate) / (1000 * 60 * 60 * 24))
    if (daysSinceClass > 6) continue

    for (const subject of subjects) {
      const templates = HOMEWORK_TEMPLATES[subject]
      if (!templates) continue

      for (const template of templates) {
        for (const offset of template.dayOffsets) {
          const dueDate = addDays(classDate, offset)
          const dueDateStr = formatDate(dueDate)

          allTasks.push({
            id: `hw-${subject}-${template.studyCategory}-${dueDateStr}`,
            subject,
            title: template.title,
            dueDate: dueDateStr,
            studyPriority: template.studyPriority,
            studyCategory: template.studyCategory,
            priority: template.priority,
            classDate: classDayStr,
            isHomework: true,
          })
        }
      }
    }
  }

  // 日付順 → 優先順位順でソート
  allTasks.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return a.studyPriority - b.studyPriority
  })

  return allTasks
}

/**
 * 特定の日の家庭学習タスクを取得
 * @param {Date} date - 対象日
 * @returns {Array} その日のタスク（優先順位順）
 */
export function getHomeworkForDate(date = new Date()) {
  const dateStr = formatDate(date)
  const all = generateWeeklyHomework(date)
  return all.filter(t => t.dueDate === dateStr)
}

/**
 * 今日〜指定日数分の家庭学習タスクを日付別にグループ化
 * @param {Date} today - 基準日
 * @param {number} days - 日数（デフォルト7）
 * @returns {Object} { 'YYYY-MM-DD': Task[] }
 */
export function getHomeworkByDate(today = new Date(), days = 7) {
  const all = generateWeeklyHomework(today)
  const result = {}

  for (let i = 0; i < days; i++) {
    const d = addDays(today, i)
    const dateStr = formatDate(d)
    result[dateStr] = all.filter(t => t.dueDate === dateStr)
  }

  return result
}
