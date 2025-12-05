import './TaskItem.css'
import { subjectEmojis, subjectColors } from '../utils/constants'

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const subjectColor = subjectColors[task.subject] || '#007AFF'

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      style={{
        borderColor: subjectColor,
        backgroundColor: `${subjectColor}15`,
        boxShadow: `0 2px 8px ${subjectColor}25`
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
          color: subjectColor
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
