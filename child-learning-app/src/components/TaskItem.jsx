import './TaskItem.css'

function TaskItem({ task, onToggle, onDelete, onEdit }) {
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

  const subjectColors = {
    '国語': '#10b981',
    '算数': '#ef4444',
    '理科': '#3b82f6',
    '社会': '#f59e0b',
  }

  const difficultyColors = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171',
  }

  const difficultyLabels = {
    easy: 'かんたん',
    medium: 'ふつう',
    hard: 'むずかしい',
  }

  const subjectColor = task.subject ? (subjectColors[task.subject] || '#ffffff') : '#ffffff'

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      style={{ borderLeftColor: subjectColor }}
    >
      <div className="task-content">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="task-checkbox"
        />
        <div className="task-info">
          <div className="task-title">
            <span className="subject-emoji">{subjectEmojis[task.subject]}</span>
            <span>{task.title}</span>
          </div>
          <div className="task-meta">
            <span
              className="subject-badge"
              style={{
                backgroundColor: task.subject ? `${subjectColor}20` : '#f3f4f6',
                color: task.subject ? subjectColor : '#6b7280',
                borderColor: subjectColor
              }}
            >{task.subject}</span>
            <span
              className="difficulty-badge"
              style={{ backgroundColor: difficultyColors[task.difficulty] }}
            >
              {difficultyLabels[task.difficulty]}
            </span>
          </div>
        </div>
      </div>
      <div className="task-actions">
        {onEdit && (
          <button
            className="edit-btn"
            onClick={() => onEdit(task)}
            aria-label="編集"
          >
            ✏️
          </button>
        )}
        <button
          className="delete-btn"
          onClick={() => onDelete(task.id)}
          aria-label="削除"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

export default TaskItem
