import { useState } from 'react'
import './UnitDashboard.css'
import { unitsDatabase, subjects, grades } from '../utils/unitsDatabase'
import {
  getSessionsByUnit,
  getUnitStats,
  getGradeProgress,
  addStudySession,
} from '../utils/studySessions'
import { subjectEmojis, subjectColors } from '../utils/constants'
import { getDaysSinceText } from '../utils/dateUtils'
import { getMasteryStars } from '../utils/displayUtils'

function UnitDashboard({ tasks, onEditTask, customUnits = [] }) {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [expandedUnit, setExpandedUnit] = useState(null) // 展開された単元のID
  const [showSessionForm, setShowSessionForm] = useState(false) // 学習記録フォームの表示
  const [sessionForm, setSessionForm] = useState({
    duration: 30,
    masteryLevel: 3,
    notes: '',
    needsReview: 'medium',
  })

  // デフォルト単元とカスタム単元を統合
  const defaultUnits = unitsDatabase[selectedSubject]?.[selectedGrade] || []
  const filteredCustomUnits = customUnits.filter(u => u.subject === selectedSubject && u.grade === selectedGrade)
  const currentUnits = [...defaultUnits, ...filteredCustomUnits]
  const progress = getGradeProgress(selectedSubject, selectedGrade, currentUnits)

  const handleAddSession = (unitId) => {
    addStudySession({
      unitId,
      ...sessionForm,
    })
    setShowSessionForm(false)
    setSessionForm({
      duration: 30,
      masteryLevel: 3,
      notes: '',
      needsReview: 'medium',
    })
    // Force re-render by updating state
    setSelectedGrade(selectedGrade)
  }

  const toggleUnitExpand = (unitId) => {
    if (expandedUnit === unitId) {
      setExpandedUnit(null)
      setShowSessionForm(false)
    } else {
      setExpandedUnit(unitId)
      setShowSessionForm(false)
    }
  }

  const getRelatedTasks = (unitId) => {
    if (!tasks) return []
    const relatedTasks = tasks.filter(task => task.unitId === unitId)
    return relatedTasks
  }

  return (
    <div className="unit-dashboard">
      {/* ヘッダー：学年・科目選択 */}
      <div className="dashboard-header">
        <div className="grade-selector">
          <label>学年:</label>
          {grades.map((grade) => (
            <button
              key={grade}
              className={`grade-btn ${selectedGrade === grade ? 'active' : ''}`}
              onClick={() => setSelectedGrade(grade)}
            >
              {grade}
            </button>
          ))}
        </div>

        <div className="subject-selector">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
              }}
            >
              <span className="subject-emoji">{subjectEmojis[subject]}</span>
              <span>{subject}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 進捗サマリー */}
      <div className="progress-summary">
        <div className="summary-card">
          <div className="summary-label">全単元数</div>
          <div className="summary-value">{progress.totalUnits}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">学習済み</div>
          <div className="summary-value" style={{ color: subjectColors[selectedSubject] }}>
            {progress.studiedCount}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">未着手</div>
          <div className="summary-value">{progress.unstudiedCount}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">達成率</div>
          <div className="summary-value">{progress.percentage}%</div>
        </div>
      </div>

      {/* 単元リスト */}
      <div className="units-grid">
        {currentUnits.map((unit) => {
          const stats = getUnitStats(unit.id)
          const sessions = getSessionsByUnit(unit.id)
          const isExpanded = expandedUnit === unit.id
          const unitBackgroundColor = `${subjectColors[selectedSubject]}26`
          const relatedTasks = getRelatedTasks(unit.id)

          return (
            <div
              key={unit.id}
              className={`unit-card ${stats.needsReview ? 'needs-review' : ''} ${stats.studyCount === 0 ? 'unstudied' : ''} ${isExpanded ? 'expanded' : ''}`}
              style={{ backgroundColor: unitBackgroundColor }}
            >
              {/* クリック可能なヘッダー */}
              <div
                className="unit-header clickable"
                onClick={() => toggleUnitExpand(unit.id)}
              >
                <div className="unit-title">
                  <span className="unit-name">{unit.name}</span>
                  <span className="unit-category">{unit.category}</span>
                </div>
                <div className="unit-header-right">
                  {stats.studyCount > 0 && (
                    <div className="unit-badge">
                      {stats.studyCount}回
                    </div>
                  )}
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {/* コンパクト表示：基本情報のみ */}
              {!isExpanded && (
                <div className="unit-compact">
                  {stats.studyCount > 0 ? (
                    <div className="compact-info">
                      <span className="compact-mastery">
                        {getMasteryStars(Math.round(stats.averageMastery))}
                      </span>
                      <span className="compact-last-study">
                        {getDaysSinceText(stats.daysSinceLastStudy)}
                      </span>
                      {stats.needsReview && <span className="compact-alert">⚠️</span>}
                    </div>
                  ) : (
                    <div className="unit-unstudied">📝 未学習</div>
                  )}
                </div>
              )}

              {/* 展開表示：詳細情報 */}
              {isExpanded && (
                <div className="unit-details">
                  {/* 詳細統計 */}
                  {stats.studyCount > 0 && (
                    <div className="unit-stats">
                      <div className="stat-row">
                        <span className="stat-label">理解度:</span>
                        <span className="stat-value mastery">
                          {getMasteryStars(Math.round(stats.averageMastery))}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">最終学習:</span>
                        <span className="stat-value">
                          {getDaysSinceText(stats.daysSinceLastStudy)}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">学習時間:</span>
                        <span className="stat-value">{stats.totalDuration}分</span>
                      </div>
                      {stats.needsReview && (
                        <div className="review-alert">
                          ⚠️ 復習推奨
                        </div>
                      )}
                    </div>
                  )}

                  {/* 学習記録ボタン */}
                  <button
                    className="add-session-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSessionForm(!showSessionForm)
                    }}
                  >
                    {showSessionForm ? '✕ キャンセル' : '+ 学習記録'}
                  </button>

                  {/* 学習記録フォーム */}
                  {showSessionForm && (
                <div className="session-form">
                  <div className="form-group">
                    <label>学習時間（分）:</label>
                    <input
                      type="number"
                      value={sessionForm.duration}
                      onChange={(e) => setSessionForm({ ...sessionForm, duration: parseInt(e.target.value) })}
                      min="0"
                      step="5"
                    />
                  </div>

                  <div className="form-group">
                    <label>理解度:</label>
                    <div className="mastery-buttons">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          className={`mastery-btn ${sessionForm.masteryLevel === level ? 'active' : ''}`}
                          onClick={() => setSessionForm({ ...sessionForm, masteryLevel: level })}
                        >
                          {getMasteryStars(level)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>メモ:</label>
                    <textarea
                      value={sessionForm.notes}
                      onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                      placeholder="気づき、間違えた問題など..."
                      rows="3"
                    />
                  </div>

                  <button
                    className="save-session-btn"
                    onClick={() => handleAddSession(unit.id)}
                  >
                    ✓ 記録する
                  </button>
                </div>
                  )}

                  {/* 過去の学習履歴 */}
                  {sessions.length > 0 && (
                    <div className="session-history">
                      <div className="history-header">学習履歴:</div>
                      {sessions.map((session) => (
                        <div key={session.id} className="session-item">
                          <span className="session-date">{session.date}</span>
                          <span className="session-mastery">{getMasteryStars(session.masteryLevel)}</span>
                          <span className="session-duration">{session.duration}分</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 関連タスク */}
                  {relatedTasks.length > 0 && (
                    <div className="related-tasks">
                      <div className="related-header">📋 関連タスク ({relatedTasks.length}件)</div>
                      {relatedTasks.map((task) => (
                        <div key={task.id} className="related-task-item">
                          <div className="related-task-info">
                            <span className={`task-status ${task.completed ? 'completed' : ''}`}>
                              {task.completed ? '✓' : '○'}
                            </span>
                            <span className="related-task-title">{task.title}</span>
                          </div>
                          {onEditTask && (
                            <button
                              className="edit-task-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditTask(task)
                              }}
                              title="編集"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UnitDashboard
