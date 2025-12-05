import './SubjectView.css'
import { subjectColors } from '../utils/constants'

function SubjectView({ tasks, onToggleTask, onDeleteTask }) {
  const subjects = ['国語', '算数', '理科', '社会']

  const taskTypeLabels = {
    'daily': '📖 デイリー',
    'basic': '✏️ 基礎トレ',
    'test': '📝 テスト対策',
    'pastpaper': '📄 過去問',
    'weakness': '💪 弱点補強'
  }

  const priorityColors = {
    'A': '#ef4444',
    'B': '#f59e0b',
    'C': '#3b82f6'
  }

  function getTasksBySubject(subject) {
    return tasks.filter(task => task.subject === subject)
  }

  function groupByUnit(tasks) {
    const grouped = {}
    tasks.forEach(task => {
      const unit = task.unit || '未分類'
      if (!grouped[unit]) {
        grouped[unit] = []
      }
      grouped[unit].push(task)
    })
    return grouped
  }

  return (
    <div className="subject-view">
      {subjects.map(subject => {
        const subjectTasks = getTasksBySubject(subject)
        const groupedTasks = groupByUnit(subjectTasks)
        const completedCount = subjectTasks.filter(t => t.completed).length
        const totalCount = subjectTasks.length

        return (
          <div key={subject} className="subject-section">
            <div
              className="subject-header"
              style={{ backgroundColor: subjectColors[subject] }}
            >
              <h3>{subject}</h3>
              <div className="subject-stats">
                <span className="completion-rate">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </span>
                <span className="task-count">
                  {completedCount} / {totalCount}
                </span>
              </div>
            </div>

            <div className="subject-content">
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="no-tasks">タスクがありません</div>
              ) : (
                Object.entries(groupedTasks).map(([unit, unitTasks]) => (
                  <div key={unit} className="unit-group">
                    <h4 className="unit-title">{unit}</h4>
                    <div className="unit-tasks">
                      {unitTasks.map(task => (
                        <div
                          key={task.id}
                          className={`subject-task ${task.completed ? 'completed' : ''}`}
                        >
                          <div className="task-main">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => onToggleTask(task.id)}
                              className="task-checkbox"
                            />
                            <div className="task-info">
                              <div className="task-title">{task.title}</div>
                              <div className="task-meta">
                                <span className="task-type">
                                  {taskTypeLabels[task.taskType]}
                                </span>
                                {task.dueDate && (
                                  <span className="task-date">
                                    📅 {new Date(task.dueDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="task-actions">
                            <span
                              className="priority-badge"
                              style={{ backgroundColor: priorityColors[task.priority] }}
                            >
                              {task.priority}
                            </span>
                            <button
                              className="delete-btn"
                              onClick={() => onDeleteTask(task.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default SubjectView
