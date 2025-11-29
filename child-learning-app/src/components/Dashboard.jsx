import './Dashboard.css'

function Dashboard({ tasks }) {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.completed).length
  const activeTasks = totalTasks - completedTasks
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const getProgressEmoji = (percentage) => {
    if (percentage === 100) return '🌟'
    if (percentage >= 75) return '🎉'
    if (percentage >= 50) return '💪'
    if (percentage >= 25) return '📚'
    return '🚀'
  }

  const getEncouragementMessage = (percentage) => {
    if (percentage === 100) return 'すごい！全部できたね！'
    if (percentage >= 75) return 'もう少しでゴール！がんばって！'
    if (percentage >= 50) return '半分以上できたね！すごいよ！'
    if (percentage >= 25) return 'いい調子！続けよう！'
    return 'さあ、がんばろう！'
  }

  return (
    <div className="dashboard">
      <div className="stats-container">
        <div className="stat-card total">
          <div className="stat-number">{totalTasks}</div>
          <div className="stat-label">全タスク</div>
        </div>
        <div className="stat-card active">
          <div className="stat-number">{activeTasks}</div>
          <div className="stat-label">未完了</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-number">{completedTasks}</div>
          <div className="stat-label">完了</div>
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-emoji">{getProgressEmoji(progress)}</span>
          <span className="progress-text">{progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="encouragement">{getEncouragementMessage(progress)}</p>
      </div>
    </div>
  )
}

export default Dashboard
