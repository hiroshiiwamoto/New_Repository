import './Dashboard.css'
import { subjectEmojis, subjectColors } from '../utils/constants'

function Dashboard({ tasks }) {
  const subjects = ['国語', '算数', '理科', '社会']

  const getSubjectProgress = (subject) => {
    const subjectTasks = tasks.filter(task => task.subject === subject)
    const completed = subjectTasks.filter(task => task.completed).length
    const total = subjectTasks.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percentage }
  }

  return (
    <div className="dashboard">
      <h3 className="dashboard-title">📊 科目別達成率</h3>
      <div className="subject-progress-grid">
        {subjects.map(subject => {
          const { completed, total, percentage } = getSubjectProgress(subject)
          return (
            <div key={subject} className="subject-progress-card">
              <div className="subject-header">
                <span className="subject-emoji">{subjectEmojis[subject]}</span>
                <span className="subject-name">{subject}</span>
              </div>
              <div className="progress-info">
                <div className="progress-percentage" style={{ color: subjectColors[subject] }}>
                  {percentage}%
                </div>
                <div className="progress-count">
                  {completed} / {total}
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${percentage}%`,
                    background: subjectColors[subject]
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard
