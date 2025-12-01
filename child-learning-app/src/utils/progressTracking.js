// 進捗履歴の記録と分析

const PROGRESS_HISTORY_KEY = 'progressHistory'
const MAX_HISTORY_DAYS = 90 // 90日間のデータを保持

// 今日の日付をYYYY-MM-DD形式で取得
export const getTodayKey = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// 進捗スナップショットを記録
export const recordProgressSnapshot = (tasks) => {
  if (!tasks || tasks.length === 0) return

  const dateKey = getTodayKey()
  const history = getProgressHistory()

  // 科目別の進捗を計算
  const subjects = ['国語', '算数', '理科', '社会']
  const subjectProgress = {}
  let totalStudyTime = 0

  subjects.forEach(subject => {
    const subjectTasks = tasks.filter(task => task.subject === subject)
    const completed = subjectTasks.filter(task => task.completed).length
    const total = subjectTasks.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    subjectProgress[subject] = {
      completed,
      total,
      percentage
    }
  })

  // 今日の学習時間を計算（学習セッションから）
  const studySessions = getStudySessionsForDate(dateKey)
  totalStudyTime = studySessions.reduce((sum, session) => sum + (session.duration || 0), 0)

  // 全体の進捗
  const allCompleted = tasks.filter(task => task.completed).length
  const allTotal = tasks.length
  const overallPercentage = allTotal > 0 ? Math.round((allCompleted / allTotal) * 100) : 0

  // スナップショットを作成
  const snapshot = {
    date: dateKey,
    timestamp: new Date().toISOString(),
    subjects: subjectProgress,
    overall: {
      completed: allCompleted,
      total: allTotal,
      percentage: overallPercentage
    },
    studyTime: totalStudyTime,
    taskCount: allTotal
  }

  // 既存の履歴に追加（同じ日付は上書き）
  history[dateKey] = snapshot

  // 古いデータを削除
  cleanupOldHistory(history)

  // 保存
  localStorage.setItem(PROGRESS_HISTORY_KEY, JSON.stringify(history))

  return snapshot
}

// 進捗履歴を取得
export const getProgressHistory = () => {
  const historyStr = localStorage.getItem(PROGRESS_HISTORY_KEY)
  if (!historyStr) return {}

  try {
    return JSON.parse(historyStr)
  } catch (e) {
    console.error('Failed to parse progress history:', e)
    return {}
  }
}

// 古い履歴データを削除
const cleanupOldHistory = (history) => {
  const today = new Date()
  const cutoffDate = new Date(today)
  cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS)
  const cutoffKey = cutoffDate.toISOString().split('T')[0]

  Object.keys(history).forEach(dateKey => {
    if (dateKey < cutoffKey) {
      delete history[dateKey]
    }
  })
}

// 指定期間の進捗データを取得
export const getProgressForPeriod = (days = 30) => {
  const history = getProgressHistory()
  const today = new Date()
  const data = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]

    if (history[dateKey]) {
      data.push(history[dateKey])
    } else {
      // データがない日は null として記録
      data.push({
        date: dateKey,
        subjects: {},
        overall: { percentage: null },
        studyTime: 0
      })
    }
  }

  return data
}

// 週次データを取得（過去N週間）
export const getWeeklyProgress = (weeks = 12) => {
  const history = getProgressHistory()
  const weeklyData = []
  const today = new Date()

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() - (i * 7))
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekStart.getDate() - 6)

    const weekStartKey = weekStart.toISOString().split('T')[0]
    const weekEndKey = weekEnd.toISOString().split('T')[0]

    // その週のデータを集計
    const weekData = {
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      totalStudyTime: 0,
      subjects: {
        '国語': { percentage: null, studyTime: 0 },
        '算数': { percentage: null, studyTime: 0 },
        '理科': { percentage: null, studyTime: 0 },
        '社会': { percentage: null, studyTime: 0 }
      },
      overall: { percentage: null }
    }

    let dayCount = 0
    const subjectTotals = { '国語': 0, '算数': 0, '理科': 0, '社会': 0 }
    let overallTotal = 0

    // 週の各日のデータを集計
    for (let d = 0; d < 7; d++) {
      const checkDate = new Date(weekStart)
      checkDate.setDate(checkDate.getDate() + d)
      const checkKey = checkDate.toISOString().split('T')[0]

      if (history[checkKey]) {
        dayCount++
        weekData.totalStudyTime += history[checkKey].studyTime || 0

        Object.keys(history[checkKey].subjects).forEach(subject => {
          subjectTotals[subject] += history[checkKey].subjects[subject].percentage || 0
        })

        overallTotal += history[checkKey].overall.percentage || 0
      }
    }

    // 平均を計算
    if (dayCount > 0) {
      Object.keys(subjectTotals).forEach(subject => {
        weekData.subjects[subject].percentage = Math.round(subjectTotals[subject] / dayCount)
      })
      weekData.overall.percentage = Math.round(overallTotal / dayCount)
    }

    weeklyData.push(weekData)
  }

  return weeklyData
}

// 指定日の学習セッションを取得（ダミー実装 - 実際は studySessions から取得）
const getStudySessionsForDate = (dateKey) => {
  // TODO: 実際の学習セッションデータと連携
  return []
}

// 統計情報を計算
export const calculateStatistics = (days = 30) => {
  const progressData = getProgressForPeriod(days)
  const validData = progressData.filter(d => d.overall.percentage !== null)

  if (validData.length === 0) {
    return {
      averageProgress: 0,
      totalStudyTime: 0,
      averageDailyStudyTime: 0,
      improvement: 0,
      bestSubject: null,
      weakestSubject: null
    }
  }

  // 平均達成率
  const averageProgress = Math.round(
    validData.reduce((sum, d) => sum + d.overall.percentage, 0) / validData.length
  )

  // 総学習時間
  const totalStudyTime = validData.reduce((sum, d) => sum + d.studyTime, 0)

  // 1日平均学習時間
  const averageDailyStudyTime = Math.round(totalStudyTime / validData.length)

  // 改善度（最初の週と最後の週の比較）
  let improvement = 0
  if (validData.length >= 7) {
    const firstWeek = validData.slice(0, 7)
    const lastWeek = validData.slice(-7)
    const firstAvg = firstWeek.reduce((sum, d) => sum + d.overall.percentage, 0) / firstWeek.length
    const lastAvg = lastWeek.reduce((sum, d) => sum + d.overall.percentage, 0) / lastWeek.length
    improvement = Math.round(lastAvg - firstAvg)
  }

  // 科目別の平均を計算
  const subjects = ['国語', '算数', '理科', '社会']
  const subjectAverages = {}
  subjects.forEach(subject => {
    const subjectData = validData
      .filter(d => d.subjects[subject] && d.subjects[subject].percentage !== null)
      .map(d => d.subjects[subject].percentage)

    if (subjectData.length > 0) {
      subjectAverages[subject] = Math.round(
        subjectData.reduce((sum, p) => sum + p, 0) / subjectData.length
      )
    }
  })

  // 最も得意/苦手な科目
  let bestSubject = null
  let weakestSubject = null
  let maxAvg = -1
  let minAvg = 101

  Object.entries(subjectAverages).forEach(([subject, avg]) => {
    if (avg > maxAvg) {
      maxAvg = avg
      bestSubject = subject
    }
    if (avg < minAvg) {
      minAvg = avg
      weakestSubject = subject
    }
  })

  return {
    averageProgress,
    totalStudyTime,
    averageDailyStudyTime,
    improvement,
    bestSubject,
    weakestSubject,
    subjectAverages
  }
}
