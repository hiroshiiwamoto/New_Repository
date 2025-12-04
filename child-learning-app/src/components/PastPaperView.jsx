import { useState, useEffect } from 'react'
import './PastPaperView.css'
import { subjects, grades } from '../utils/unitsDatabase'
import {
  getSessionsByTaskId,
  addPastPaperSession,
  getNextAttemptNumber
} from '../utils/pastPaperSessions'

function PastPaperView({ tasks, user, customUnits = [] }) {
  const [viewMode, setViewMode] = useState('school') // 'school' or 'unit'
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [sessions, setSessions] = useState({}) // taskId -> sessions[]
  const [showSessionForm, setShowSessionForm] = useState(null) // taskId
  const [sessionForm, setSessionForm] = useState({
    studiedAt: new Date().toISOString().split('T')[0],
    score: '',
    totalScore: '',
    timeSpent: '',
    notes: ''
  })

  const subjectColors = {
    '国語': '#10b981',
    '算数': '#ef4444',
    '理科': '#3b82f6',
    '社会': '#f59e0b',
  }

  // 過去問タスクのみフィルタリング
  const pastPaperTasks = tasks.filter(
    t => t.taskType === 'pastpaper' &&
         t.subject === selectedSubject &&
         t.grade === selectedGrade
  )

  // セッションデータを読み込み
  useEffect(() => {
    if (!user) return

    const loadSessions = async () => {
      const sessionData = {}
      for (const task of pastPaperTasks) {
        const result = await getSessionsByTaskId(user.uid, task.id)
        if (result.success) {
          sessionData[task.id] = result.data
        }
      }
      setSessions(sessionData)
    }

    loadSessions()
  }, [user, pastPaperTasks.length, selectedSubject, selectedGrade])

  // 学校別にグループ化
  const groupBySchool = () => {
    const grouped = {}
    pastPaperTasks.forEach(task => {
      const school = task.schoolName || '学校名未設定'
      if (!grouped[school]) {
        grouped[school] = []
      }
      grouped[school].push(task)
    })
    return grouped
  }

  // 単元別にグループ化
  const groupByUnit = () => {
    const grouped = {}
    pastPaperTasks.forEach(task => {
      if (task.relatedUnits && task.relatedUnits.length > 0) {
        task.relatedUnits.forEach(unitId => {
          if (!grouped[unitId]) {
            grouped[unitId] = []
          }
          grouped[unitId].push(task)
        })
      } else {
        if (!grouped['未分類']) {
          grouped['未分類'] = []
        }
        grouped['未分類'].push(task)
      }
    })
    return grouped
  }

  // 単元IDから単元名を取得
  const getUnitName = (unitId) => {
    // customUnitsから検索
    const customUnit = customUnits.find(u => u.id === unitId)
    if (customUnit) return customUnit.name
    return unitId
  }

  // セッション記録フォームを開く
  const handleOpenSessionForm = (taskId) => {
    setShowSessionForm(taskId)
    setSessionForm({
      studiedAt: new Date().toISOString().split('T')[0],
      score: '',
      totalScore: '',
      timeSpent: '',
      notes: ''
    })
  }

  // セッション記録を保存
  const handleSaveSession = async (taskId) => {
    if (!user) {
      alert('❌ ログインが必要です')
      return
    }

    const attemptNumber = await getNextAttemptNumber(user.uid, taskId)

    const result = await addPastPaperSession(user.uid, taskId, {
      ...sessionForm,
      attemptNumber,
      score: sessionForm.score ? parseInt(sessionForm.score) : null,
      totalScore: sessionForm.totalScore ? parseInt(sessionForm.totalScore) : null,
      timeSpent: sessionForm.timeSpent ? parseInt(sessionForm.timeSpent) : null,
    })

    if (result.success) {
      // セッションデータを更新
      setSessions({
        ...sessions,
        [taskId]: [...(sessions[taskId] || []), result.data]
      })
      setShowSessionForm(null)
      alert('✅ 学習記録を保存しました')
    } else {
      alert('❌ 保存に失敗しました: ' + result.error)
    }
  }

  // 得点率を計算
  const getScorePercentage = (session) => {
    if (session.score !== null && session.totalScore && session.totalScore > 0) {
      return Math.round((session.score / session.totalScore) * 100)
    }
    return null
  }

  const groupedData = viewMode === 'school' ? groupBySchool() : groupByUnit()

  return (
    <div className="pastpaper-view">
      <div className="view-header">
        <h2>📄 過去問管理</h2>
        <p className="view-description">
          過去問の学習記録を管理します。同じ過去問を何度でも演習できます。
        </p>
      </div>

      {/* フィルター */}
      <div className="view-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>表示モード:</label>
            <div className="mode-buttons">
              <button
                className={`mode-btn ${viewMode === 'school' ? 'active' : ''}`}
                onClick={() => setViewMode('school')}
              >
                🏫 学校別
              </button>
              <button
                className={`mode-btn ${viewMode === 'unit' ? 'active' : ''}`}
                onClick={() => setViewMode('unit')}
              >
                📚 単元別
              </button>
            </div>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>学年:</label>
            <div className="grade-buttons">
              {grades.map((grade) => (
                <button
                  key={grade}
                  className={`filter-btn ${selectedGrade === grade ? 'active' : ''}`}
                  onClick={() => setSelectedGrade(grade)}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>科目:</label>
            <div className="subject-buttons">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  className={`filter-btn subject ${selectedSubject === subject ? 'active' : ''}`}
                  onClick={() => setSelectedSubject(subject)}
                  style={{
                    borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                    background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
                  }}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* タスク一覧 */}
      <div className="pastpaper-content">
        {Object.keys(groupedData).length === 0 ? (
          <div className="no-data">
            📝 この条件の過去問タスクがありません
            <br />
            <small>タスク追加画面で「📄 過去問」タイプのタスクを作成してください</small>
          </div>
        ) : (
          Object.entries(groupedData).map(([key, taskList]) => (
            <div key={key} className="pastpaper-group">
              <h3 className="group-title">
                {viewMode === 'school' ? `🏫 ${key}` : `📚 ${getUnitName(key)}`}
                <span className="task-count">({taskList.length}問)</span>
              </h3>

              <div className="task-cards">
                {taskList.map(task => {
                  const taskSessions = sessions[task.id] || []
                  const lastSession = taskSessions[taskSessions.length - 1]

                  return (
                    <div key={task.id} className="pastpaper-card">
                      <div className="card-header">
                        <div className="task-title">
                          <span className="task-name">{task.title}</span>
                          <span className="task-details">
                            {task.schoolName} {task.year} {task.round}
                          </span>
                        </div>
                        <div className="attempt-count">
                          {taskSessions.length}回演習済み
                        </div>
                      </div>

                      {/* 最新の学習記録 */}
                      {lastSession && (
                        <div className="last-session">
                          <span className="session-label">最新:</span>
                          <span className="session-date">
                            {new Date(lastSession.studiedAt).toLocaleDateString('ja-JP')}
                          </span>
                          {getScorePercentage(lastSession) !== null && (
                            <span className="session-score">
                              {getScorePercentage(lastSession)}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* セッション一覧 */}
                      {taskSessions.length > 0 && (
                        <div className="sessions-list">
                          {taskSessions.map(session => (
                            <div key={session.firestoreId} className="session-item">
                              <span className="session-attempt">{session.attemptNumber}回目</span>
                              <span className="session-date">
                                {new Date(session.studiedAt).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              {session.score !== null && session.totalScore && (
                                <span className="session-score">
                                  {session.score}/{session.totalScore} ({getScorePercentage(session)}%)
                                </span>
                              )}
                              {session.timeSpent && (
                                <span className="session-time">{session.timeSpent}分</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* セッション記録フォーム */}
                      {showSessionForm === task.id ? (
                        <div className="session-form">
                          <h4>📝 学習記録を追加</h4>
                          <div className="form-grid">
                            <div className="form-field">
                              <label>実施日:</label>
                              <input
                                type="date"
                                value={sessionForm.studiedAt}
                                onChange={(e) => setSessionForm({ ...sessionForm, studiedAt: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>得点:</label>
                              <div className="score-inputs">
                                <input
                                  type="number"
                                  placeholder="得点"
                                  value={sessionForm.score}
                                  onChange={(e) => setSessionForm({ ...sessionForm, score: e.target.value })}
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  placeholder="満点"
                                  value={sessionForm.totalScore}
                                  onChange={(e) => setSessionForm({ ...sessionForm, totalScore: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="form-field">
                              <label>所要時間（分）:</label>
                              <input
                                type="number"
                                placeholder="分"
                                value={sessionForm.timeSpent}
                                onChange={(e) => setSessionForm({ ...sessionForm, timeSpent: e.target.value })}
                              />
                            </div>
                            <div className="form-field full">
                              <label>メモ:</label>
                              <textarea
                                placeholder="間違えた問題、気づきなど..."
                                value={sessionForm.notes}
                                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                rows="3"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => setShowSessionForm(null)}
                            >
                              キャンセル
                            </button>
                            <button
                              className="btn-primary"
                              onClick={() => handleSaveSession(task.id)}
                            >
                              ✓ 記録する
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="add-session-btn"
                          onClick={() => handleOpenSessionForm(task.id)}
                        >
                          + 学習記録を追加
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PastPaperView
