import { useState } from 'react'
import './WeeklyCalendar.css'
import { subjectEmojis, subjectColors, weekDayNames } from '../utils/constants'
import { getWeekStart, formatDate, addDays } from '../utils/dateUtils'
import TaskDetailModal from './TaskDetailModal'
import TextDetailModal from './TextDetailModal'

function WeeklyCalendar({ tasks, sapixTexts = [], onToggleTask, onDeleteTask, onEditTask, userId }) {
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
  const [detailTask, setDetailTask] = useState(null)
  const [detailText, setDetailText] = useState(null)

  const handleTaskClick = (task) => {
    if (userId) {
      setDetailTask(task)
    } else if (onEditTask) {
      onEditTask(task)
    }
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

  function goToToday() {
    const today = new Date()
    setCurrentWeekStart(getWeekStart(today))
    setCurrentMonth(today)
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

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  // 月間カレンダーの日付を取得
  function getMonthDays() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
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
    return tasks.filter(task => task.dueDate === dateStr)
  }

  function getLessonsForDate(date) {
    const dateStr = formatDate(date)
    return sapixTexts.filter(t => t.studyDate === dateStr)
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
                <button onClick={goToToday} className="today-btn">📆 今日</button>
                <button onClick={switchToMonthView} className="view-mode-btn">
                  月間表示
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>📅 {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
              <div className="calendar-controls">
                <button onClick={goToToday} className="today-btn">📆 今日</button>
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
            const dayLessons = getLessonsForDate(day)
            const isToday = dateStr === today
            const isEmpty = dayTasks.length === 0 && dayLessons.length === 0

            return (
              <div key={index} className={`calendar-day ${isToday ? 'today' : ''}`}>
                <div className="day-header">
                  <div className="day-name">{weekDayNames[index]}</div>
                  <div className="day-date">
                    {day.getMonth() + 1}/{day.getDate()}
                  </div>
                </div>

                <div className="day-tasks">
                  {dayLessons.map(lesson => (
                    <div
                      key={lesson.id}
                      className={`calendar-lesson ${userId ? 'clickable-row' : ''}`}
                      style={{ '--subject-color': subjectColors[lesson.subject] || '#3b82f6' }}
                      onClick={() => userId && setDetailText(lesson)}
                    >
                      <span className="lesson-icon">{subjectEmojis[lesson.subject] || '📘'}</span>
                      <span className="lesson-name">{lesson.textNumber ? `${lesson.textNumber} ` : ''}{lesson.textName}</span>
                    </div>
                  ))}
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={`calendar-task ${task.completed ? 'completed' : ''} ${userId ? 'clickable-row' : ''}`}
                      style={{ '--subject-color': subjectColors[task.subject] || '#3b82f6' }}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="task-header" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => onToggleTask(task.id)}
                          className="task-checkbox-small"
                        />
                        <span className="task-emoji">{subjectEmojis[task.subject]}</span>
                      </div>
                      <div className="task-title-small">
                        {task.title}
                      </div>
                      <button
                        className="delete-btn-small"
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {isEmpty && <div className="no-tasks">予定なし</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // 月間ビュー
        <div className="calendar-grid monthly-grid">
          <div className="month-weekdays">
            {weekDayNames.map((day, i) => (
              <div key={i} className="weekday-header">{day}</div>
            ))}
          </div>
          <div className="month-days">
            {getMonthDays().map((day, index) => {
              const dateStr = formatDate(day)
              const dayTasks = getTasksForDate(day)
              const dayLessons = getLessonsForDate(day)
              const isToday = dateStr === today
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth()

              return (
                <div
                  key={index}
                  className={`month-day ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                >
                  <div className="month-day-date">{day.getDate()}</div>
                  <div className="month-day-tasks">
                    {dayLessons.length > 0 && (
                      <div className="lesson-indicators">
                        {dayLessons.map(lesson => (
                          <div
                            key={lesson.id}
                            className={`lesson-dot ${userId ? 'clickable' : ''}`}
                            title={`${lesson.textNumber || ''} ${lesson.textName} (クリックして詳細表示)`}
                            onClick={() => userId && setDetailText(lesson)}
                          >
                            {subjectEmojis[lesson.subject] || '📘'}
                          </div>
                        ))}
                      </div>
                    )}
                    {dayTasks.length > 0 && (
                      <div className="task-indicators">
                        {dayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className={`task-dot ${task.completed ? 'completed' : ''} clickable`}
                            title={`${task.title} (クリックして詳細表示)`}
                            onClick={() => handleTaskClick(task)}
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
            <div
              key={task.id}
              className={`unscheduled-task ${task.completed ? 'completed' : ''} ${userId ? 'clickable-row' : ''}`}
              onClick={() => handleTaskClick(task)}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
                onClick={e => e.stopPropagation()}
                className="task-checkbox-small"
              />
              <span className="task-emoji">{subjectEmojis[task.subject]}</span>
              <span className="task-title-small">
                {task.title}
              </span>
              <button
                className="delete-btn-small"
                onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id) }}
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

      {/* タスク詳細モーダル */}
      {detailTask && userId && (
        <TaskDetailModal
          task={detailTask}
          userId={userId}
          onEdit={onEditTask}
          onClose={() => setDetailTask(null)}
        />
      )}

      {/* テキスト詳細モーダル */}
      {detailText && userId && (
        <TextDetailModal
          text={detailText}
          userId={userId}
          onClose={() => setDetailText(null)}
        />
      )}
    </div>
  )
}

export default WeeklyCalendar
