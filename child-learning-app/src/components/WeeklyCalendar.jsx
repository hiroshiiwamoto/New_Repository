import { useState } from 'react'
import './WeeklyCalendar.css'

function WeeklyCalendar({ tasks, onToggleTask, onDeleteTask }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()))

  function getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  function formatDate(date) {
    return date.toISOString().split('T')[0]
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

  function thisWeek() {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  function getTasksForDate(date) {
    const dateStr = formatDate(date)
    return tasks.filter(task => task.dueDate === dateStr)
  }

  const subjectEmojis = {
    '国語': '📖',
    '算数': '🔢',
    '理科': '🔬',
    '社会': '🌍',
    '英語': '🔤',
    '音楽': '🎵',
    '体育': '⚽',
    'その他': '📝',
  }

  const today = formatDate(new Date())

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <button onClick={previousWeek} className="nav-btn">◀</button>
        <div className="calendar-title">
          <h2>📅 週間カレンダー</h2>
          <button onClick={thisWeek} className="today-btn">今週</button>
        </div>
        <button onClick={nextWeek} className="nav-btn">▶</button>
      </div>

      <div className="calendar-grid">
        {days.map((day, index) => {
          const dateStr = formatDate(day)
          const dayTasks = getTasksForDate(day)
          const isToday = dateStr === today

          return (
            <div key={index} className={`calendar-day ${isToday ? 'today' : ''}`}>
              <div className="day-header">
                <div className="day-name">{weekDays[index]}</div>
                <div className="day-date">{day.getDate()}</div>
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
