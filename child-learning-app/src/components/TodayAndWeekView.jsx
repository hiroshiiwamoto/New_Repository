import { useState } from 'react'
import './TodayAndWeekView.css'

function TodayAndWeekView({ tasks, onToggleTask, onDeleteTask, onEditTask }) {
  const [expandedSection, setExpandedSection] = useState('today') // 'today' or 'week'

  // 日付フォーマット関数
  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 今日のタスクを取得
  function getTodayTasks() {
    const today = formatDate(new Date())
    return tasks.filter(task => task.dueDate === today)
  }

  // 今週のタスクを取得（今日を除く）
  function getWeekTasks() {
    const today = new Date()
    const todayStr = formatDate(today)
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // 日曜日
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6) // 土曜日

    return tasks.filter(task => {
      if (!task.dueDate || task.dueDate === todayStr) return false
      const taskDate = new Date(task.dueDate)
      return taskDate >= weekStart && taskDate <= weekEnd
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }

  const subjectEmojis = {
    '国語': '📖',
    '算数': '🔢',
    '理科': '🔬',
    '社会': '🌍',
  }

  const priorityColors = {
    'A': '#ef4444',
    'B': '#f59e0b',
    'C': '#3b82f6',
  }

  const todayTasks = getTodayTasks()
  const weekTasks = getWeekTasks()

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="today-week-view">
      {/* 今日のタスク */}
      <div className="priority-section today-section">
        <div
          className="section-header"
          onClick={() => toggleSection('today')}
        >
          <h2>
            🎯 今日のタスク
            <span className="task-count">
              {todayTasks.filter(t => !t.completed).length} / {todayTasks.length}
            </span>
          </h2>
          <span className="toggle-icon">{expandedSection === 'today' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'today' && (
          <div className="task-grid">
            {todayTasks.length === 0 ? (
              <div className="no-tasks-message">今日のタスクはありません</div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className={`priority-task ${task.completed ? 'completed' : ''}`}>
                  <div className="task-priority" style={{ background: priorityColors[task.priority] }}>
                    {task.priority}
                  </div>
                  <div className="task-content">
                    <div className="task-header-row">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="task-checkbox"
                      />
                      <span className="task-emoji">{subjectEmojis[task.subject]}</span>
                      <span className="task-subject">{task.subject}</span>
                      {task.unit && <span className="task-unit">/ {task.unit}</span>}
                    </div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="task-type">{task.taskType}</span>
                    </div>
                  </div>
                  <div className="task-actions">
                    {onEditTask && (
                      <button
                        className="edit-btn"
                        onClick={() => onEditTask(task)}
                        title="編集"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteTask(task.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 今週のタスク */}
      <div className="priority-section week-section">
        <div
          className="section-header"
          onClick={() => toggleSection('week')}
        >
          <h2>
            📅 今週のタスク
            <span className="task-count">
              {weekTasks.filter(t => !t.completed).length} / {weekTasks.length}
            </span>
          </h2>
          <span className="toggle-icon">{expandedSection === 'week' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'week' && (
          <div className="task-grid">
            {weekTasks.length === 0 ? (
              <div className="no-tasks-message">今週の他のタスクはありません</div>
            ) : (
              weekTasks.map(task => (
                <div key={task.id} className={`priority-task ${task.completed ? 'completed' : ''}`}>
                  <div className="task-priority" style={{ background: priorityColors[task.priority] }}>
                    {task.priority}
                  </div>
                  <div className="task-content">
                    <div className="task-header-row">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTask(task.id)}
                        className="task-checkbox"
                      />
                      <span className="task-emoji">{subjectEmojis[task.subject]}</span>
                      <span className="task-subject">{task.subject}</span>
                      {task.unit && <span className="task-unit">/ {task.unit}</span>}
                      <span className="task-date">
                        {new Date(task.dueDate).getMonth() + 1}/{new Date(task.dueDate).getDate()}
                      </span>
                    </div>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="task-type">{task.taskType}</span>
                    </div>
                  </div>
                  <div className="task-actions">
                    {onEditTask && (
                      <button
                        className="edit-btn"
                        onClick={() => onEditTask(task)}
                        title="編集"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteTask(task.id)}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TodayAndWeekView
