import './TaskItem.css'

function TaskItem({ task, onToggle, onDelete }) {
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

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
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
            <span className="subject-badge">{task.subject}</span>
            <span
              className="difficulty-badge"
              style={{ backgroundColor: difficultyColors[task.difficulty] }}
            >
              {difficultyLabels[task.difficulty]}
            </span>
          </div>
        </div>
      </div>
      <button
        className="delete-btn"
        onClick={() => onDelete(task.id)}
        aria-label="削除"
      >
        🗑️
      </button>
    </div>
  )
}

export default TaskItem
