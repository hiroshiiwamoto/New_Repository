import { useState, useEffect } from 'react'
import './TestScoreView.css'
import {
  getAllTestScores,
  updateTestScore
} from '../utils/testScores'
import { getSapixTexts } from '../utils/sapixTexts'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { addTaskToFirestore } from '../utils/firestore'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { toast } from '../utils/toast'

const SUBJECTS = ['算数', '国語', '理科', '社会']

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedScore, setSelectedScore] = useState(null)
  const [showProblemForm, setShowProblemForm] = useState(false)
  const [problemForm, setProblemForm] = useState(getEmptyProblemForm())
  const [sapixTexts, setSapixTexts] = useState([])
  const [syncingUnits, setSyncingUnits] = useState(false)
  const [creatingTasks, setCreatingTasks] = useState(false)

  const masterUnits = getStaticMasterUnits()

  function getEmptyProblemForm() {
    return {
      subject: '算数',
      problemNumber: '',
      unitIds: [],
      correctRate: '',
      isCorrect: false,
      points: '',
    }
  }

  useEffect(() => {
    if (!user) return
    getAllTestScores(user.uid).then(result => {
      if (result.success) setScores(result.data)
    })
  }, [user])

  useEffect(() => {
    if (!user || !selectedScore) return
    getSapixTexts(user.uid).then(result => {
      if (result.success) setSapixTexts(result.data)
    })
  }, [user, selectedScore?.firestoreId])

  useEffect(() => {
    if (!selectedScore) return
    const updated = scores.find(s => s.firestoreId === selectedScore.firestoreId)
    if (updated) setSelectedScore(updated)
  }, [scores])

  // ============================================================
  // ヘルパー
  // ============================================================

  function getProblemLogs(score) {
    return score?.problemLogs || []
  }

  function getRevengeList(score) {
    return getProblemLogs(score)
      .filter(p => !p.isCorrect && parseFloat(p.correctRate) >= 50)
      .sort((a, b) => parseFloat(b.correctRate) - parseFloat(a.correctRate))
  }

  function getLinkedTexts(problem) {
    if (!problem.unitIds?.length) return []
    return sapixTexts.filter(t =>
      (t.unitIds || []).some(uid => problem.unitIds.includes(uid))
    )
  }

  function getUnitName(unitId) {
    const unit = masterUnits.find(u => u.id === unitId)
    return unit ? unit.name : unitId
  }

  function getUnitsForSubject(subject) {
    return masterUnits.filter(u => !u.subject || u.subject === subject)
  }

  function reviewStatusLabel(status) {
    if (status === 'done') return { label: '解き直し済', color: '#16a34a', bg: '#dcfce7' }
    if (status === 'retry') return { label: '要再挑戦', color: '#dc2626', bg: '#fee2e2' }
    return { label: '未完了', color: '#64748b', bg: '#f1f5f9' }
  }

  // ============================================================
  // 問題ログ CRUD
  // ============================================================

  const handleSaveProblem = async () => {
    if (!problemForm.problemNumber) {
      toast.error('問題番号を入力してください')
      return
    }
    const newProblem = {
      id: `problem_${Date.now()}`,
      subject: problemForm.subject,
      problemNumber: parseInt(problemForm.problemNumber),
      unitIds: problemForm.unitIds,
      correctRate: parseFloat(problemForm.correctRate) || 0,
      isCorrect: problemForm.isCorrect,
      reviewStatus: 'pending',
      points: parseInt(problemForm.points) || null,
    }
    const currentProblems = getProblemLogs(selectedScore)
    const result = await updateTestScore(user.uid, selectedScore.firestoreId, {
      problemLogs: [...currentProblems, newProblem]
    })
    if (result.success) {
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
      setProblemForm(getEmptyProblemForm())
      setShowProblemForm(false)
      toast.success('問題を追加しました')
    } else {
      toast.error('保存に失敗しました')
    }
  }

  const handleUpdateProblemStatus = async (problemId, reviewStatus) => {
    const updatedProblems = getProblemLogs(selectedScore).map(p =>
      p.id === problemId ? { ...p, reviewStatus } : p
    )
    await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
    const refreshResult = await getAllTestScores(user.uid)
    if (refreshResult.success) setScores(refreshResult.data)
  }

  const handleDeleteProblem = async (problemId) => {
    const updatedProblems = getProblemLogs(selectedScore).filter(p => p.id !== problemId)
    await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
    const refreshResult = await getAllTestScores(user.uid)
    if (refreshResult.success) setScores(refreshResult.data)
    toast.success('削除しました')
  }

  // ============================================================
  // マスター単元へ反映
  // ============================================================

  const handleSyncToMasterUnits = async () => {
    const wrongWithUnits = getProblemLogs(selectedScore).filter(p => !p.isCorrect && p.unitIds?.length > 0)
    if (wrongWithUnits.length === 0) {
      toast.error('単元タグが設定された不正解問題がありません')
      return
    }
    setSyncingUnits(true)
    try {
      for (const problem of wrongWithUnits) {
        await addLessonLogWithStats(user.uid, {
          unitIds: problem.unitIds,
          sourceType: 'testScore',
          sourceId: selectedScore.firestoreId,
          sourceName: `${selectedScore.testName} 第${problem.problemNumber}問`,
          date: selectedScore.testDate,
          performance: EVALUATION_SCORES.red,
          evaluationKey: 'red',
          grade: selectedScore.grade,
          notes: `正答率 ${problem.correctRate}%（テスト結果自動反映）`,
        })
      }
      toast.success(`${wrongWithUnits.length}問をマスター単元に反映しました（🔴 要復習）`)
    } catch {
      toast.error('反映に失敗しました')
    } finally {
      setSyncingUnits(false)
    }
  }

  // ============================================================
  // リベンジタスク作成
  // ============================================================

  const handleCreateRevengeTasks = async () => {
    const revengeList = getRevengeList(selectedScore)
    if (revengeList.length === 0) {
      toast.error('リベンジリストが空です（正答率50%以上の不正解問題がありません）')
      return
    }
    setCreatingTasks(true)
    try {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const dueDate = nextWeek.toISOString().split('T')[0]
      for (const problem of revengeList) {
        const unitNames = problem.unitIds.map(id => getUnitName(id)).join('・')
        await addTaskToFirestore(user.uid, {
          id: Date.now() + Math.random(),
          title: `【解き直し】${selectedScore.testName} 第${problem.problemNumber}問 (${problem.subject})`,
          subject: problem.subject,
          priority: 'A',
          dueDate,
          notes: `正答率 ${problem.correctRate}%${unitNames ? ` / ${unitNames}` : ''}`,
          taskType: 'review',
          completed: false,
          createdAt: new Date().toISOString(),
        })
      }
      toast.success(`${revengeList.length}件の解き直しタスクをスケジュールに追加しました`)
    } catch {
      toast.error('タスク作成に失敗しました')
    } finally {
      setCreatingTasks(false)
    }
  }

  // ============================================================
  // RENDER - テスト選択リスト
  // ============================================================

  if (!selectedScore) {
    const sortedScores = [...scores].sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
    return (
      <div className="testscore-view">
        <div className="test-selector-header">
          <h3 className="test-selector-title">テストを選択して問題を分析</h3>
          <p className="test-selector-desc">テスト名をタップすると、問題別記録とリベンジリストが表示されます</p>
        </div>

        {sortedScores.length === 0 ? (
          <div className="no-data">
            📋 テストデータがありません
            <small>「成績」タブから成績を追加してください</small>
          </div>
        ) : (
          <div className="test-select-list">
            {sortedScores.map(score => {
              const problems = getProblemLogs(score)
              const revengeCount = getRevengeList(score).length
              return (
                <button
                  key={score.firestoreId}
                  className="test-select-item"
                  onClick={() => setSelectedScore(score)}
                >
                  <div className="test-select-info">
                    <span className="test-select-name">{score.testName}</span>
                    <span className="test-select-date">{score.testDate}</span>
                    <span className="test-select-grade">{score.grade}</span>
                  </div>
                  <div className="test-select-badges">
                    {score.fourSubjects?.deviation && (
                      <span className="badge-deviation">偏差値 {score.fourSubjects.deviation}</span>
                    )}
                    {problems.length > 0 && (
                      <span className="badge-problems">{problems.length}問記録済</span>
                    )}
                    {revengeCount > 0 && (
                      <span className="badge-revenge">⚡ {revengeCount}問</span>
                    )}
                  </div>
                  <span className="test-select-arrow">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー
  // ============================================================

  const problemLogs = getProblemLogs(selectedScore)
  const revengeList = getRevengeList(selectedScore)
  const unitsForSubject = getUnitsForSubject(problemForm.subject)

  return (
    <div className="testscore-view">
      {/* 詳細ヘッダー */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => setSelectedScore(null)}>
          ← テスト一覧
        </button>
        <div className="detail-title-area">
          <h2 className="detail-test-name">{selectedScore.testName}</h2>
          <span className="detail-test-date">{selectedScore.testDate}</span>
          {selectedScore.fourSubjects?.deviation && (
            <span className="detail-deviation-badge">
              4科偏差値 {selectedScore.fourSubjects.deviation}
            </span>
          )}
        </div>
      </div>

      {/* アクションバー */}
      <div className="action-bar">
        <div className="action-bar-info">
          <span className="problem-count-badge">記録済み: {problemLogs.length}問</span>
          {revengeList.length > 0 && (
            <span className="revenge-count-badge">リベンジ対象: {revengeList.length}問</span>
          )}
        </div>
        <div className="action-bar-buttons">
          <button
            className="btn-sync-units"
            onClick={handleSyncToMasterUnits}
            disabled={syncingUnits}
          >
            {syncingUnits ? '反映中...' : '🔴 マスター単元へ反映'}
          </button>
          <button
            className="btn-create-tasks"
            onClick={handleCreateRevengeTasks}
            disabled={creatingTasks || revengeList.length === 0}
          >
            {creatingTasks ? '作成中...' : `📅 解き直しタスクを作成 (${revengeList.length}問)`}
          </button>
        </div>
      </div>

      {/* 問題別記録 */}
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">問題別記録</h3>
          <button
            className="btn-add-problem"
            onClick={() => { setProblemForm(getEmptyProblemForm()); setShowProblemForm(true) }}
          >
            ＋ 問題を追加
          </button>
        </div>

        {problemLogs.length === 0 ? (
          <div className="empty-problems">
            問題を追加して、正答率・単元・正誤を記録しましょう
          </div>
        ) : (
          <div className="problem-table-wrapper">
            <table className="problem-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>教科</th>
                  <th>単元</th>
                  <th>正答率</th>
                  <th>正誤</th>
                  <th>解き直し</th>
                  <th>教材リンク</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {problemLogs
                  .slice()
                  .sort((a, b) => a.problemNumber - b.problemNumber)
                  .map(problem => {
                    const linked = getLinkedTexts(problem)
                    const { color, bg } = reviewStatusLabel(problem.reviewStatus)
                    const correctRateNum = parseFloat(problem.correctRate)
                    const isRevenge = !problem.isCorrect && correctRateNum >= 50
                    return (
                      <tr
                        key={problem.id}
                        className={`problem-row ${!problem.isCorrect ? 'wrong-row' : ''} ${isRevenge ? 'revenge-row' : ''}`}
                      >
                        <td className="cell-num">
                          {problem.problemNumber}
                          {isRevenge && <span className="revenge-marker" title="リベンジ対象">⚡</span>}
                        </td>
                        <td className="cell-subject">
                          <span className={`subject-chip subject-${problem.subject}`}>
                            {problem.subject}
                          </span>
                        </td>
                        <td className="cell-units">
                          {problem.unitIds?.length > 0
                            ? problem.unitIds.map(id => (
                              <span key={id} className="unit-tag">{getUnitName(id)}</span>
                            ))
                            : <span className="no-unit">–</span>
                          }
                        </td>
                        <td className="cell-rate">
                          <span
                            className="correct-rate-badge"
                            style={{
                              background: correctRateNum >= 70 ? '#dcfce7' : correctRateNum >= 40 ? '#fef9c3' : '#fee2e2',
                              color: correctRateNum >= 70 ? '#16a34a' : correctRateNum >= 40 ? '#ca8a04' : '#dc2626',
                            }}
                          >
                            {problem.correctRate}%
                          </span>
                        </td>
                        <td className="cell-correct">
                          {problem.isCorrect
                            ? <span className="correct-mark">○</span>
                            : <span className="wrong-mark">✗</span>
                          }
                        </td>
                        <td className="cell-status">
                          <select
                            className="status-select"
                            value={problem.reviewStatus || 'pending'}
                            style={{ background: bg, color: color }}
                            onChange={(e) => handleUpdateProblemStatus(problem.id, e.target.value)}
                          >
                            <option value="pending">未完了</option>
                            <option value="done">解き直し済</option>
                            <option value="retry">要再挑戦</option>
                          </select>
                        </td>
                        <td className="cell-links">
                          {linked.length > 0
                            ? linked.map(text => (
                              <a
                                key={text.firestoreId || text.id}
                                href={text.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sapix-text-link"
                                title={text.textName}
                              >
                                📄 {text.textNumber || text.textName}
                              </a>
                            ))
                            : <span className="no-link">–</span>
                          }
                        </td>
                        <td className="cell-delete">
                          <button
                            className="btn-delete-problem"
                            onClick={() => handleDeleteProblem(problem.id)}
                            title="削除"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* リベンジリスト */}
      <div className="section-card revenge-section">
        <div className="section-header">
          <h3 className="section-title">
            ⚡ リベンジリスト
            <span className="revenge-subtitle">正答率 50%以上なのに失点した問題</span>
          </h3>
        </div>

        {revengeList.length === 0 ? (
          <div className="empty-problems">
            リベンジ対象の問題はありません（問題を追加してください）
          </div>
        ) : (
          <div className="revenge-list">
            {revengeList.map((problem, idx) => {
              const linked = getLinkedTexts(problem)
              const unitNames = problem.unitIds?.map(id => getUnitName(id)).join('・') || '単元なし'
              return (
                <div key={problem.id} className="revenge-item">
                  <div className="revenge-rank">#{idx + 1}</div>
                  <div className="revenge-info">
                    <div className="revenge-title">
                      第{problem.problemNumber}問
                      <span className={`subject-chip subject-${problem.subject}`}>{problem.subject}</span>
                    </div>
                    <div className="revenge-meta">
                      <span className="revenge-rate">正答率 <strong>{problem.correctRate}%</strong></span>
                      <span className="revenge-units">{unitNames}</span>
                    </div>
                    {linked.length > 0 && (
                      <div className="revenge-links">
                        {linked.map(text => (
                          <a
                            key={text.firestoreId || text.id}
                            href={text.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sapix-text-link"
                          >
                            📄 {text.textNumber || text.textName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="revenge-status">
                    <select
                      className="status-select"
                      value={problem.reviewStatus || 'pending'}
                      onChange={(e) => handleUpdateProblemStatus(problem.id, e.target.value)}
                    >
                      <option value="pending">未完了</option>
                      <option value="done">解き直し済</option>
                      <option value="retry">要再挑戦</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 問題追加フォーム */}
      {showProblemForm && (
        <div className="form-overlay" onClick={() => setShowProblemForm(false)}>
          <div className="form-container problem-form-container" onClick={e => e.stopPropagation()}>
            <h3>問題を追加</h3>

            <div className="form-row">
              <div className="form-field">
                <label>教科</label>
                <select
                  value={problemForm.subject}
                  onChange={(e) => setProblemForm({ ...problemForm, subject: e.target.value, unitIds: [] })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>問題番号 *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="例: 5"
                  value={problemForm.problemNumber}
                  onChange={(e) => setProblemForm({ ...problemForm, problemNumber: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>配点（任意）</label>
                <input
                  type="number"
                  min="0"
                  placeholder="例: 6"
                  value={problemForm.points}
                  onChange={(e) => setProblemForm({ ...problemForm, points: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>全体正答率（%）</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="例: 72"
                  value={problemForm.correctRate}
                  onChange={(e) => setProblemForm({ ...problemForm, correctRate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>ハルキの正誤</label>
                <div className="correct-radio-group">
                  <label className={`radio-btn radio-correct ${problemForm.isCorrect ? 'active' : ''}`}>
                    <input
                      type="radio"
                      checked={problemForm.isCorrect === true}
                      onChange={() => setProblemForm({ ...problemForm, isCorrect: true })}
                    />
                    ○ 正解
                  </label>
                  <label className={`radio-btn radio-wrong ${!problemForm.isCorrect ? 'active' : ''}`}>
                    <input
                      type="radio"
                      checked={problemForm.isCorrect === false}
                      onChange={() => setProblemForm({ ...problemForm, isCorrect: false })}
                    />
                    ✗ 不正解
                  </label>
                </div>
              </div>
            </div>

            {unitsForSubject.length > 0 && (
              <div className="form-field">
                <label>単元タグ（複数選択可）</label>
                <div className="unit-checkbox-grid">
                  {unitsForSubject.map(unit => (
                    <label key={unit.id} className={`unit-checkbox-label ${problemForm.unitIds.includes(unit.id) ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={problemForm.unitIds.includes(unit.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...problemForm.unitIds, unit.id]
                            : problemForm.unitIds.filter(id => id !== unit.id)
                          setProblemForm({ ...problemForm, unitIds: newIds })
                        }}
                      />
                      <span>{unit.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowProblemForm(false)}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleSaveProblem}>
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestScoreView
