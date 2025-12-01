import TaskItem from './TaskItem'
import './TaskList.css'

function TaskList({ tasks, onToggleTask, onDeleteTask, onEditTask }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>📝 まだ学習タスクがありません</p>
        <p>上から新しい学習を追加してね！</p>
      </div>
    )
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggleTask}
          onDelete={onDeleteTask}
          onEdit={onEditTask}
        />
      ))}
    </div>
  )
}

export default TaskList
