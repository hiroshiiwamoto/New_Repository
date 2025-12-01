import { useState } from 'react'
import './UnitDashboard.css'
import { unitsDatabase, subjects, grades } from '../utils/unitsDatabase'
import {
  getSessionsByUnit,
  getUnitStats,
  getGradeProgress,
  addStudySession,
  deleteStudySession,
} from '../utils/studySessions'

function UnitDashboard() {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [showSessionForm, setShowSessionForm] = useState(null) // unitId or null
  const [sessionForm, setSessionForm] = useState({
    duration: 30,
    masteryLevel: 3,
    notes: '',
    needsReview: 'medium',
  })

  const subjectEmojis = {
    '国語': '📖',
    '算数': '🔢',
    '理科': '🔬',
    '社会': '🌍',
  }

  const subjectColors = {
    '国語': '#8b5cf6',
    '算数': '#3b82f6',
    '理科': '#10b981',
    '社会': '#f59e0b',
  }

  const currentUnits = unitsDatabase[selectedSubject]?.[selectedGrade] || []
  const progress = getGradeProgress(selectedSubject, selectedGrade, currentUnits)

  const handleAddSession = (unitId) => {
    addStudySession({
      unitId,
      ...sessionForm,
    })
    setShowSessionForm(null)
    setSessionForm({
      duration: 30,
      masteryLevel: 3,
      notes: '',
      needsReview: 'medium',
    })
    // Force re-render by updating state
    setSelectedGrade(selectedGrade)
  }

  const getMasteryStars = (level) => {
    return '★'.repeat(level) + '☆'.repeat(5 - level)
  }

  const getDaysSinceText = (days) => {
    if (days === 0) return '今日'
    if (days === 1) return '昨日'
    if (days < 7) return `${days}日前`
    if (days < 30) return `${Math.floor(days / 7)}週間前`
    return `${Math.floor(days / 30)}ヶ月前`
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
          const isExpanded = showSessionForm === unit.id

          return (
            <div
              key={unit.id}
              className={`unit-card ${stats.needsReview ? 'needs-review' : ''} ${stats.studyCount === 0 ? 'unstudied' : ''}`}
            >
              <div className="unit-header">
                <div className="unit-title">
                  <span className="unit-name">{unit.name}</span>
                  <span className="unit-category">{unit.category}</span>
                </div>
                {stats.studyCount > 0 && (
                  <div className="unit-badge">
                    {stats.studyCount}回
                  </div>
                )}
              </div>

              {stats.studyCount > 0 ? (
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
              ) : (
                <div className="unit-unstudied">
                  📝 未学習
                </div>
              )}

              {/* 学習記録ボタン */}
              <button
                className="add-session-btn"
                onClick={() => setShowSessionForm(isExpanded ? null : unit.id)}
              >
                {isExpanded ? '✕ キャンセル' : '+ 学習記録'}
              </button>

              {/* 学習記録フォーム */}
              {isExpanded && (
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
              {sessions.length > 0 && !isExpanded && (
                <div className="session-history">
                  <div className="history-header">学習履歴:</div>
                  {sessions.slice(0, 3).map((session) => (
                    <div key={session.id} className="session-item">
                      <span className="session-date">{session.date}</span>
                      <span className="session-mastery">{getMasteryStars(session.masteryLevel)}</span>
                      <span className="session-duration">{session.duration}分</span>
                    </div>
                  ))}
                  {sessions.length > 3 && (
                    <div className="more-sessions">他 {sessions.length - 3}件</div>
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
