import { useState } from 'react'
import './TodayAndWeekView.css'
import { subjectEmojis, subjectColors } from '../utils/constants'
import TaskDetailModal from './TaskDetailModal'

function TodayAndWeekView({ tasks, onToggleTask, onDeleteTask, onEditTask, userId }) {
  const [expandedSection, setExpandedSection] = useState('today') // 'today' or 'week'
  const [detailTask, setDetailTask] = useState(null)

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

  const todayTasks = getTodayTasks()

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleTaskClick = (task) => {
    if (userId) {
      setDetailTask(task)
    } else if (onEditTask) {
      onEditTask(task)
    }
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
              todayTasks.map(task => {
                const subjectColor = subjectColors[task.subject] || '#64748b'
                return (
                  <div
                    key={task.id}
                    className={`priority-task ${task.completed ? 'completed' : ''}`}
                    style={{
                      borderColor: subjectColor,
                      backgroundColor: `${subjectColor}15`,
                      boxShadow: `0 2px 8px ${subjectColor}25`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      className="task-checkbox"
                    />
                    <span className="subject-emoji">{subjectEmojis[task.subject]}</span>
                    <span
                      className="subject-badge"
                      style={{
                        color: subjectColor
                      }}
                    >{task.subject}</span>
                    <span
                      className="task-title clickable"
                      onClick={() => handleTaskClick(task)}
                      title="クリックして詳細表示"
                    >{task.title}</span>
                    {task.priority && (
                      <span className="task-priority-badge">{task.priority}</span>
                    )}
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
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
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
    </div>
  )
}

export default TodayAndWeekView
