import { useState } from 'react'
import './WeeklyCalendar.css'

function WeeklyCalendar({ tasks, onToggleTask, onDeleteTask }) {
  // サンプルデータが2025年2月なので、初期表示を2月に設定
  const getInitialDate = () => {
    if (tasks.length > 0) {
      const tasksWithDates = tasks.filter(t => t.dueDate)
      if (tasksWithDates.length > 0) {
        // 最初のタスクの日付を使用
        const firstDate = new Date(tasksWithDates[0].dueDate)
        return firstDate
      }
    }
    return new Date()
  }

  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(getInitialDate()))
  const [viewMode, setViewMode] = useState('week') // 'week' or 'month'
  const [currentMonth, setCurrentMonth] = useState(getInitialDate())

  function getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // ローカル時間を使用した日付フォーマット（タイムゾーンの問題を修正）
  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  function previousWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, -7))
  }

  function nextWeek() {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  function previousMonth() {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  function nextMonth() {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  function thisWeek() {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  function thisMonth() {
    setCurrentMonth(new Date())
  }

  // ビュー切り替え時に日付を同期
  function switchToMonthView() {
    // 週間表示の日付から月を取得
    setCurrentMonth(new Date(currentWeekStart))
    setViewMode('month')
  }

  function switchToWeekView() {
    // 月間表示の日付から週の開始日を取得
    setCurrentWeekStart(getWeekStart(currentMonth))
    setViewMode('week')
  }

  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  // 月間カレンダーの日付を取得
  function getMonthDays() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = new Date(firstDay)
    startDay.setDate(startDay.getDate() - startDay.getDay())

    const monthDays = []
    let currentDay = new Date(startDay)

    while (monthDays.length < 42) { // 6週間分
      monthDays.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return monthDays
  }

  function getTasksForDate(date) {
    const dateStr = formatDate(date)
    const filtered = tasks.filter(task => task.dueDate === dateStr)

    // デバッグ用ログ
    if (dateStr === '2025-02-03' || dateStr === '2025-02-04') {
      console.log('🔍 Debug for date:', dateStr)
      console.log('Total tasks:', tasks.length)
      console.log('Tasks with dueDate:', tasks.filter(t => t.dueDate).length)
      console.log('Sample task dueDates:', tasks.slice(0, 5).map(t => t.dueDate))
      console.log('Filtered tasks:', filtered.length)
    }

    return filtered
  }

  const subjectEmojis = {
    '国語': '📖',
    '算数': '🔢',
    '理科': '🔬',
    '社会': '🌍',
  }

  const today = formatDate(new Date())

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <button
          onClick={viewMode === 'week' ? previousWeek : previousMonth}
          className="nav-btn"
        >
          ◀
        </button>
        <div className="calendar-title">
          {viewMode === 'week' ? (
            <>
              <h2>📅 {days[0].getMonth() + 1}月 週間カレンダー</h2>
              <div className="calendar-controls">
                <button onClick={thisWeek} className="today-btn">今週</button>
                <button onClick={switchToMonthView} className="view-mode-btn">
                  月間表示
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>📅 {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
              <div className="calendar-controls">
                <button onClick={thisMonth} className="today-btn">今月</button>
                <button onClick={switchToWeekView} className="view-mode-btn">
                  週間表示
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={viewMode === 'week' ? nextWeek : nextMonth}
          className="nav-btn"
        >
          ▶
        </button>
      </div>

      {viewMode === 'week' ? (
        // 週間ビュー
        <div className="calendar-grid weekly-grid">
          {days.map((day, index) => {
            const dateStr = formatDate(day)
            const dayTasks = getTasksForDate(day)
            const isToday = dateStr === today

            return (
              <div key={index} className={`calendar-day ${isToday ? 'today' : ''}`}>
                <div className="day-header">
                  <div className="day-name">{weekDays[index]}</div>
                  <div className="day-date">
                    {day.getMonth() + 1}/{day.getDate()}
                  </div>
                </div>

                <div className="day-tasks">
                  {dayTasks.length === 0 ? (
                    <div className="no-tasks">予定なし</div>
                  ) : (
                    dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`calendar-task ${task.completed ? 'completed' : ''}`}
                      >
                        <div className="task-header">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => onToggleTask(task.id)}
                            className="task-checkbox-small"
                          />
                          <span className="task-emoji">{subjectEmojis[task.subject]}</span>
                        </div>
                        <div className="task-title-small">{task.title}</div>
                        <button
                          className="delete-btn-small"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // 月間ビュー
        <div className="calendar-grid monthly-grid">
          <div className="month-weekdays">
            {weekDays.map((day, i) => (
              <div key={i} className="weekday-header">{day}</div>
            ))}
          </div>
          <div className="month-days">
            {getMonthDays().map((day, index) => {
              const dateStr = formatDate(day)
              const dayTasks = getTasksForDate(day)
              const isToday = dateStr === today
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth()

              return (
                <div
                  key={index}
                  className={`month-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                >
                  <div className="month-day-date">{day.getDate()}</div>
                  <div className="month-day-tasks">
                    {dayTasks.length > 0 && (
                      <div className="task-indicators">
                        {dayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className={`task-dot ${task.completed ? 'completed' : ''}`}
                            title={task.title}
                          >
                            {subjectEmojis[task.subject]}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="more-tasks">+{dayTasks.length - 3}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="unscheduled-tasks">
        <h3>📝 日付未設定のタスク</h3>
        <div className="unscheduled-list">
          {tasks.filter(task => !task.dueDate).map(task => (
            <div key={task.id} className={`unscheduled-task ${task.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
                className="task-checkbox-small"
              />
              <span className="task-emoji">{subjectEmojis[task.subject]}</span>
              <span className="task-title-small">{task.title}</span>
              <button
                className="delete-btn-small"
                onClick={() => onDeleteTask(task.id)}
              >
                🗑️
              </button>
            </div>
          ))}
          {tasks.filter(task => !task.dueDate).length === 0 && (
            <div className="no-tasks">すべてのタスクに日付が設定されています</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WeeklyCalendar
