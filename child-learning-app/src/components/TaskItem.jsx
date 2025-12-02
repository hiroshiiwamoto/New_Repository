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
  const backgroundColor = task.subject && subjectColors[task.subject] ? `${subjectColor}33` : '#ffffff'

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      style={{
        borderLeftColor: subjectColor,
        backgroundColor: backgroundColor
      }}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="task-checkbox"
      />
      <span className="subject-emoji">{subjectEmojis[task.subject]}</span>
      <span
        className="subject-badge"
        style={{
          backgroundColor: task.subject ? `${subjectColor}20` : '#f3f4f6',
          color: task.subject ? subjectColor : '#6b7280',
          borderColor: subjectColor
        }}
      >{task.subject}</span>
      <span className="task-title">{task.title}</span>
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
