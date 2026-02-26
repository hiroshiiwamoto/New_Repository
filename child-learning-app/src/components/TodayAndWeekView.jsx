import { useState, useMemo } from 'react'
import './TodayAndWeekView.css'
import { subjectEmojis, subjectColors, weekDayNames } from '../utils/constants'
import { getHomeworkForDate, getHomeworkByDate } from '../utils/sapixHomework'
import { missTypeLabel } from '../utils/problems'
import TaskDetailModal from './TaskDetailModal'

// 優先度のラベルと色
const priorityStyles = {
  A: { label: 'A', color: '#ef4444' },
  B: { label: 'B', color: '#f59e0b' },
  C: { label: 'C', color: '#3b82f6' },
}

function TodayAndWeekView({ tasks, homeworkDone, onToggleTask, onDeleteTask, onEditTask, onToggleHomework, onCompleteHomework, pendingProblems = [], onResolveProblem, userId }) {
  const [expandedSection, setExpandedSection] = useState('today')
  const [detailTask, setDetailTask] = useState(null)
  const [completingHwId, setCompletingHwId] = useState(null) // 完了フロー中のhwId
  const [stuckMode, setStuckMode] = useState(false) // 問題番号入力モード
  const [problemInput, setProblemInput] = useState('')

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

  // 解き直し待ちを教科別にグループ化
  const pendingBySubject = useMemo(() => {
    const groups = {}
    for (const p of pendingProblems) {
      const subj = p.subject || '不明'
      if (!groups[subj]) groups[subj] = []
      groups[subj].push(p)
    }
    return groups
  }, [pendingProblems])

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

  // 完了フロー: チェックボックスクリック時
  const handleHomeworkCheck = (hw) => {
    const done = isHomeworkDone(hw.id)
    if (done) {
      // 完了済み → トグルで解除
      onToggleHomework && onToggleHomework(hw.id)
    } else {
      // 未完了 → 完了フロー開始
      setCompletingHwId(hw.id)
      setStuckMode(false)
      setProblemInput('')
    }
  }

  // 「全部できた」
  const handleAllOk = (hw) => {
    onCompleteHomework && onCompleteHomework(hw.id, null)
    setCompletingHwId(null)
    setStuckMode(false)
    setProblemInput('')
  }

  // 「止まった問題があった」→入力モードへ
  const handleStuck = () => {
    setStuckMode(true)
  }

  // 問題番号を記録して完了
  const handleSaveStuck = (hw) => {
    const numbers = problemInput
      .split(/[,、\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
    if (numbers.length === 0) {
      // 入力なしなら通常完了
      handleAllOk(hw)
      return
    }
    onCompleteHomework && onCompleteHomework(hw.id, {
      textCode: hw.textCode,
      subject: hw.subject,
      unitIds: hw.unitIds || [],
      problemNumbers: numbers,
    })
    setCompletingHwId(null)
    setStuckMode(false)
    setProblemInput('')
  }

  // キャンセル
  const handleCancelComplete = () => {
    setCompletingHwId(null)
    setStuckMode(false)
    setProblemInput('')
  }

  return (
    <div className="today-week-view">
      {/* 解き直し待ち */}
      {pendingProblems.length > 0 && (
        <div className="priority-section pending-section">
          <div
            className="section-header"
            onClick={() => toggleSection('pending')}
          >
            <h2>
              解き直し待ち
              <span className="task-count">{pendingProblems.length}</span>
            </h2>
            <span className="toggle-icon">{expandedSection === 'pending' ? '▼' : '▶'}</span>
          </div>

          {expandedSection === 'pending' && (
            <div className="pending-list">
              {Object.entries(pendingBySubject).map(([subject, problems]) => {
                const subjectColor = subjectColors[subject] || '#64748b'
                return (
                  <div key={subject} className="pending-subject-group">
                    <div className="pending-subject-header">
                      <span className="subject-emoji">{subjectEmojis[subject]}</span>
                      <span style={{ color: subjectColor, fontWeight: 600 }}>{subject}</span>
                      <span className="pending-subject-count">{problems.length}</span>
                    </div>
                    {problems.map(p => (
                      <div key={p.id} className="pending-problem-row">
                        <span className="pending-problem-num">{p.problemNumber}</span>
                        {p.missType && (
                          <span className="pending-miss-type">{missTypeLabel(p.missType)}</span>
                        )}
                        {p.correctRate != null && (
                          <span className="pending-correct-rate">正答率{p.correctRate}%</span>
                        )}
                        <button
                          className="pending-resolve-btn"
                          onClick={() => onResolveProblem && onResolveProblem(p.id)}
                        >
                          できた
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
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
                const isCompleting = completingHwId === hw.id
                return (
                  <div key={hw.id}>
                    <div
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
                        onChange={() => handleHomeworkCheck(hw)}
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
                    {/* 完了フロー（インライン展開） */}
                    {isCompleting && !stuckMode && (
                      <div className="hw-complete-flow">
                        <button className="hw-btn-ok" onClick={() => handleAllOk(hw)}>
                          全部できた
                        </button>
                        <button className="hw-btn-stuck" onClick={handleStuck}>
                          止まった問題があった
                        </button>
                        <button className="hw-btn-cancel" onClick={handleCancelComplete}>
                          キャンセル
                        </button>
                      </div>
                    )}
                    {isCompleting && stuckMode && (
                      <div className="hw-complete-flow">
                        <input
                          type="text"
                          className="hw-problem-input"
                          placeholder="問題番号（例: 問3, 問5）"
                          value={problemInput}
                          onChange={e => setProblemInput(e.target.value)}
                          autoFocus
                        />
                        <div className="hw-complete-flow-buttons">
                          <button className="hw-btn-save" onClick={() => handleSaveStuck(hw)}>
                            記録して完了
                          </button>
                          <button className="hw-btn-cancel" onClick={handleCancelComplete}>
                            キャンセル
                          </button>
                        </div>
                      </div>
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
                        // 完了済みかつ未解決問題がある場合のバッジ
                        const stuckCount = done
                          ? pendingProblems.filter(p =>
                              p.subject === hw.subject &&
                              p.sourceId === hw.textCode &&
                              p.reviewStatus !== 'done'
                            ).length
                          : 0
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
                            {stuckCount > 0 && (
                              <span className="hw-stuck-badge">{stuckCount}</span>
                            )}
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
