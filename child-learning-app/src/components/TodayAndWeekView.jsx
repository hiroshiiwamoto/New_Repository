import { useState, useMemo } from 'react'
import './TodayAndWeekView.css'
import { subjectEmojis, subjectColors, weekDayNames } from '../utils/constants'
import { getHomeworkForDate, getHomeworkByDate } from '../utils/sapixHomework'
import TaskDetailModal from './TaskDetailModal'

// 優先度のラベルと色
const priorityStyles = {
  A: { label: 'A', color: '#ef4444' },
  B: { label: 'B', color: '#f59e0b' },
  C: { label: 'C', color: '#3b82f6' },
}

// おすすめ復習の優先度スタイル
const suggestedPriorityStyles = {
  high:   { label: '高', color: '#ef4444', bg: '#fef2f2' },
  medium: { label: '中', color: '#f59e0b', bg: '#fffbeb' },
  low:    { label: '低', color: '#3b82f6', bg: '#eff6ff' },
}

// タスクタイプの表示情報
const taskTypeInfo = {
  test_prep: { label: 'テスト対策', icon: '📝' },
  weakness:  { label: '弱点克服',   icon: '💪' },
  sr_review: { label: '忘却防止',   icon: '🔄' },
  review:    { label: '復習',       icon: '📖' },
}

function TodayAndWeekView({ tasks, suggestedTasks = [], suggestedLoading = false, homeworkDone, onToggleTask, onDeleteTask, onEditTask, onToggleHomework, userId }) {
  const [expandedSection, setExpandedSection] = useState('today') // 'today', 'homework', 'week'
  const [detailTask, setDetailTask] = useState(null)
  const [expandedSuggested, setExpandedSuggested] = useState(null) // 展開中のsuggestedTask ID

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

  // 今日の家庭学習タスク
  const todayHomework = useMemo(() => getHomeworkForDate(new Date()), [])

  // 今週の家庭学習（7日分）
  const weekHomework = useMemo(() => getHomeworkByDate(new Date(), 7), [])

  // 家庭学習の完了チェック
  const isHomeworkDone = (hwId) => {
    return homeworkDone && homeworkDone[hwId] === true
  }

  const todayHomeworkCount = todayHomework.length
  const todayHomeworkDoneCount = todayHomework.filter(hw => isHomeworkDone(hw.id)).length

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
      {/* おすすめ復習 */}
      {(suggestedTasks.length > 0 || suggestedLoading) && (
        <div className="priority-section suggested-section">
          <div
            className="section-header"
            onClick={() => toggleSection('suggested')}
          >
            <h2>
              おすすめ復習
              {suggestedTasks.length > 0 && (
                <span className="task-count">{suggestedTasks.length}件</span>
              )}
            </h2>
            <span className="toggle-icon">{expandedSection === 'suggested' ? '▼' : '▶'}</span>
          </div>

          {expandedSection === 'suggested' && (
            <div className="suggested-tasks-list">
              {suggestedLoading ? (
                <div className="no-tasks-message">読み込み中...</div>
              ) : (
                suggestedTasks.map(st => {
                  const subjectColor = subjectColors[st.subject] || '#64748b'
                  const pStyle = suggestedPriorityStyles[st.priority] || suggestedPriorityStyles.low
                  const typeInfo = taskTypeInfo[st.taskType] || taskTypeInfo.review
                  const isExpanded = expandedSuggested === st.id

                  return (
                    <div
                      key={st.id}
                      className="suggested-task-card"
                      style={{
                        borderLeftColor: subjectColor,
                      }}
                      onClick={() => setExpandedSuggested(isExpanded ? null : st.id)}
                    >
                      <div className="suggested-task-header">
                        <span className="suggested-task-subject" style={{ color: subjectColor }}>
                          {subjectEmojis[st.subject]} {st.subject}
                        </span>
                        <span className="suggested-task-type">
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span
                          className="suggested-priority-badge"
                          style={{ color: pStyle.color, backgroundColor: pStyle.bg }}
                        >
                          {pStyle.label}
                        </span>
                      </div>
                      <div className="suggested-task-unit">{st.unitName}</div>
                      <div className="suggested-task-reason">{st.reason}</div>
                      <div className="suggested-task-action">{st.suggestedAction}</div>

                      {/* 展開: 関連する間違い問題 */}
                      {isExpanded && st.linkedProblems && st.linkedProblems.length > 0 && (
                        <div className="suggested-task-problems">
                          <div className="suggested-problems-title">関連する間違い問題:</div>
                          {st.linkedProblems.map((p, i) => (
                            <div key={i} className="suggested-problem-item">
                              <span className="suggested-problem-num">{p.problemNumber}</span>
                              {p.correctRate != null && (
                                <span className="suggested-problem-rate">
                                  正答率{p.correctRate}%
                                </span>
                              )}
                              {p.missType && (
                                <span className="suggested-problem-miss">
                                  {p.missType === 'understanding' ? '理解不足' : p.missType === 'careless' ? 'ケアレス' : '未習'}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 今日の家庭学習 */}
      <div className="priority-section homework-section">
        <div
          className="section-header"
          onClick={() => toggleSection('today')}
        >
          <h2>
            今日の家庭学習
            <span className="task-count">
              {todayHomeworkDoneCount} / {todayHomeworkCount}
            </span>
          </h2>
          <span className="toggle-icon">{expandedSection === 'today' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'today' && (
          <div className="task-grid">
            {todayHomework.length === 0 ? (
              <div className="no-tasks-message">今日の家庭学習はありません</div>
            ) : (
              todayHomework.map(hw => {
                const subjectColor = subjectColors[hw.subject] || '#64748b'
                const done = isHomeworkDone(hw.id)
                const pStyle = priorityStyles[hw.priority]
                return (
                  <div
                    key={hw.id}
                    className={`priority-task ${done ? 'completed' : ''}`}
                    style={{
                      borderColor: subjectColor,
                      backgroundColor: `${subjectColor}15`,
                      boxShadow: `0 2px 8px ${subjectColor}25`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleHomework && onToggleHomework(hw.id)}
                      className="task-checkbox"
                    />
                    <span className="hw-priority-num" style={{ color: pStyle.color }}>
                      {hw.studyPriority}
                    </span>
                    <span className="subject-emoji">{subjectEmojis[hw.subject]}</span>
                    <span
                      className="subject-badge"
                      style={{ color: subjectColor }}
                    >{hw.subject}</span>
                    <span className="task-title">{hw.title}</span>
                    {pStyle && (
                      <span
                        className="task-priority-badge"
                        style={{ color: pStyle.color, borderColor: `${pStyle.color}40` }}
                      >{pStyle.label}</span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* 今週の家庭学習スケジュール */}
      <div className="priority-section week-homework-section">
        <div
          className="section-header"
          onClick={() => toggleSection('homework')}
        >
          <h2>
            今週の学習スケジュール
          </h2>
          <span className="toggle-icon">{expandedSection === 'homework' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'homework' && (
          <div className="week-homework-grid">
            {Object.entries(weekHomework).map(([dateStr, hwTasks]) => {
              const d = new Date(dateStr + 'T00:00:00')
              const dayName = weekDayNames[d.getDay()]
              const isToday = dateStr === formatDate(new Date())
              const doneCount = hwTasks.filter(hw => isHomeworkDone(hw.id)).length

              return (
                <div key={dateStr} className={`week-day-block ${isToday ? 'is-today' : ''}`}>
                  <div className="week-day-header">
                    <span className="week-day-label">
                      {d.getMonth() + 1}/{d.getDate()}({dayName})
                      {isToday && <span className="today-badge">TODAY</span>}
                    </span>
                    {hwTasks.length > 0 && (
                      <span className="week-day-count">{doneCount}/{hwTasks.length}</span>
                    )}
                  </div>
                  {hwTasks.length === 0 ? (
                    <div className="week-day-empty">-</div>
                  ) : (
                    <div className="week-day-tasks">
                      {hwTasks.map(hw => {
                        const subjectColor = subjectColors[hw.subject] || '#64748b'
                        const done = isHomeworkDone(hw.id)
                        return (
                          <div
                            key={hw.id}
                            className={`week-hw-item ${done ? 'completed' : ''}`}
                            onClick={() => onToggleHomework && onToggleHomework(hw.id)}
                          >
                            <span className="week-hw-check">{done ? '✓' : '○'}</span>
                            <span className="week-hw-priority">{hw.studyPriority}</span>
                            <span
                              className="week-hw-subject"
                              style={{ color: subjectColor }}
                            >{subjectEmojis[hw.subject]}</span>
                            <span className="week-hw-title">{hw.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 手動タスク */}
      {todayTasks.length > 0 && (
        <div className="priority-section today-section">
          <div
            className="section-header"
            onClick={() => toggleSection('manual')}
          >
            <h2>
              その他のタスク
              <span className="task-count">
                {todayTasks.filter(t => !t.completed).length} / {todayTasks.length}
              </span>
            </h2>
            <span className="toggle-icon">{expandedSection === 'manual' ? '▼' : '▶'}</span>
          </div>

          {expandedSection === 'manual' && (
            <div className="task-grid">
              {todayTasks.map(task => {
                const subjectColor = subjectColors[task.subject] || '#64748b'
                return (
                  <div
                    key={task.id}
                    className={`priority-task ${task.completed ? 'completed' : ''} ${userId ? 'clickable-row' : ''}`}
                    style={{
                      borderColor: subjectColor,
                      backgroundColor: `${subjectColor}15`,
                      boxShadow: `0 2px 8px ${subjectColor}25`
                    }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={e => e.stopPropagation()}
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
                    {task.priority && (
                      <span className="task-priority-badge">{task.priority}</span>
                    )}
                    <div className="task-actions" onClick={e => e.stopPropagation()}>
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
              })}
            </div>
          )}
        </div>
      )}

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
