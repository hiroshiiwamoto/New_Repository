import { useState, useEffect, useMemo } from 'react'
import './TestScoreView.css'
import { grades } from '../utils/unitsDatabase'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  testTypes
} from '../utils/testScores'
import { getSapixTexts } from '../utils/sapixTexts'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { addTaskToFirestore } from '../utils/firestore'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import ScoreCard from './ScoreCard'
import DeviationChart from './DeviationChart'
import { toast } from '../utils/toast'

const SUBJECTS = ['算数', '国語', '理科', '社会']

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [showForm, setShowForm] = useState(false)
  const [editingScore, setEditingScore] = useState(null)
  const [scoreForm, setScoreForm] = useState(getEmptyForm())

  // 詳細ビュー
  const [selectedScore, setSelectedScore] = useState(null)
  const [showProblemForm, setShowProblemForm] = useState(false)
  const [problemForm, setProblemForm] = useState(getEmptyProblemForm())
  const [sapixTexts, setSapixTexts] = useState([])
  const [syncingUnits, setSyncingUnits] = useState(false)
  const [creatingTasks, setCreatingTasks] = useState(false)

  const masterUnits = getStaticMasterUnits()

  function getEmptyForm() {
    return {
      testName: '',
      testDate: new Date().toISOString().split('T')[0],
      grade: '4年生',
      scores: { kokugo: '', sansu: '', rika: '', shakai: '' },
      maxScores: { kokugo: '', sansu: '', rika: '', shakai: '' },
      twoSubjects: { score: '', maxScore: '', deviation: '', rank: '', totalStudents: '' },
      fourSubjects: { score: '', maxScore: '', deviation: '', rank: '', totalStudents: '' },
      deviations: { kokugo: '', sansu: '', rika: '', shakai: '' },
      course: '',
      className: '',
      notes: ''
    }
  }

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

  // データ読み込み
  useEffect(() => {
    if (!user) return
    const loadScores = async () => {
      const result = await getAllTestScores(user.uid)
      if (result.success) setScores(result.data)
    }
    loadScores()
  }, [user])

  // 詳細ビューを開いたときSAPIXテキストを読み込む
  useEffect(() => {
    if (!user || !selectedScore) return
    getSapixTexts(user.uid).then(result => {
      if (result.success) setSapixTexts(result.data)
    })
  }, [user, selectedScore?.firestoreId])

  // selectedScoreをscores配列と同期
  useEffect(() => {
    if (!selectedScore) return
    const updated = scores.find(s => s.firestoreId === selectedScore.firestoreId)
    if (updated) setSelectedScore(updated)
  }, [scores])

  // フィルタリング
  const filteredScores = scores.filter(s => s.grade === selectedGrade)

  // 偏差値推移データ（日付順）
  const chartData = useMemo(() => {
    return [...filteredScores]
      .filter(s => s.fourSubjects?.deviation || s.twoSubjects?.deviation)
      .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))
  }, [filteredScores])

  // ============================================================
  // 問題ログ ヘルパー
  // ============================================================

  function getProblemLogs(score) {
    return score?.problemLogs || []
  }

  /** 正答率 >= 50% かつ 不正解 → リベンジリスト（正答率降順） */
  function getRevengeList(score) {
    return getProblemLogs(score)
      .filter(p => !p.isCorrect && parseFloat(p.correctRate) >= 50)
      .sort((a, b) => parseFloat(b.correctRate) - parseFloat(a.correctRate))
  }

  /** 問題に紐づくSAPIXテキストを取得 */
  function getLinkedTexts(problem) {
    if (!problem.unitIds?.length) return []
    return sapixTexts.filter(t =>
      (t.unitIds || []).some(uid => problem.unitIds.includes(uid))
    )
  }

  /** unitId → 単元名 */
  function getUnitName(unitId) {
    const unit = masterUnits.find(u => u.id === unitId)
    return unit ? unit.name : unitId
  }

  /** 選択教科のマスター単元（単元タグ選択用） */
  function getUnitsForSubject(subject) {
    return masterUnits.filter(u => !u.subject || u.subject === subject)
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
    const updatedProblems = [...currentProblems, newProblem]

    const result = await updateTestScore(user.uid, selectedScore.firestoreId, {
      problemLogs: updatedProblems
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
    const currentProblems = getProblemLogs(selectedScore)
    const updatedProblems = currentProblems.map(p =>
      p.id === problemId ? { ...p, reviewStatus } : p
    )
    await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
    const refreshResult = await getAllTestScores(user.uid)
    if (refreshResult.success) setScores(refreshResult.data)
  }

  const handleDeleteProblem = async (problemId) => {
    const currentProblems = getProblemLogs(selectedScore)
    const updatedProblems = currentProblems.filter(p => p.id !== problemId)
    await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
    const refreshResult = await getAllTestScores(user.uid)
    if (refreshResult.success) setScores(refreshResult.data)
    toast.success('削除しました')
  }

  // ============================================================
  // マスター単元へ反映（不正解問題 → 🔴 lessonLog）
  // ============================================================

  const handleSyncToMasterUnits = async () => {
    const problems = getProblemLogs(selectedScore)
    const wrongWithUnits = problems.filter(p => !p.isCorrect && p.unitIds?.length > 0)

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
  // リベンジタスク作成（翌週スケジュールへ）
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
        const newTask = {
          id: Date.now() + Math.random(),
          title: `【解き直し】${selectedScore.testName} 第${problem.problemNumber}問 (${problem.subject})`,
          subject: problem.subject,
          priority: 'A',
          dueDate: dueDate,
          notes: `正答率 ${problem.correctRate}%${unitNames ? ` / ${unitNames}` : ''}`,
          taskType: 'review',
          completed: false,
          createdAt: new Date().toISOString(),
        }
        await addTaskToFirestore(user.uid, newTask)
      }

      toast.success(`${revengeList.length}件の解き直しタスクをスケジュールに追加しました`)
    } catch {
      toast.error('タスク作成に失敗しました')
    } finally {
      setCreatingTasks(false)
    }
  }

  // ============================================================
  // スコア CRUD（既存）
  // ============================================================

  const handleOpenDetail = (score) => {
    setSelectedScore(score)
    setShowProblemForm(false)
  }

  const handleOpenForm = () => {
    setEditingScore(null)
    setScoreForm(getEmptyForm())
    setShowForm(true)
  }

  const handleEditScore = (score) => {
    setEditingScore(score)
    setScoreForm({
      testName: score.testName || '',
      testDate: score.testDate || '',
      grade: score.grade || '4年生',
      scores: score.scores || { kokugo: '', sansu: '', rika: '', shakai: '' },
      maxScores: score.maxScores || { kokugo: '', sansu: '', rika: '', shakai: '' },
      twoSubjects: score.twoSubjects || { score: '', maxScore: '', deviation: '', rank: '', totalStudents: '' },
      fourSubjects: score.fourSubjects || { score: '', maxScore: '', deviation: '', rank: '', totalStudents: '' },
      deviations: score.deviations || { kokugo: '', sansu: '', rika: '', shakai: '' },
      course: score.course || '',
      className: score.className || '',
      notes: score.notes || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!user) { toast.error('ログインが必要です'); return }
    if (!scoreForm.testName || !scoreForm.testDate) {
      toast.error('テスト名と実施日は必須です')
      return
    }

    const result = editingScore
      ? await updateTestScore(user.uid, editingScore.firestoreId, scoreForm)
      : await addTestScore(user.uid, scoreForm)

    if (result.success) {
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
      setShowForm(false)
      toast.success(editingScore ? '更新しました' : '保存しました')
    } else {
      toast.error('保存に失敗しました: ' + result.error)
    }
  }

  const handleDelete = async (score) => {
    if (!window.confirm(`「${score.testName} (${score.testDate})」を削除しますか？`)) return
    const result = await deleteTestScore(user.uid, score.firestoreId)
    if (result.success) {
      setScores(scores.filter(s => s.firestoreId !== score.firestoreId))
      if (selectedScore?.firestoreId === score.firestoreId) setSelectedScore(null)
      toast.success('削除しました')
    } else {
      toast.error('削除に失敗しました')
    }
  }

  // ============================================================
  // レビューステータスラベル
  // ============================================================

  function reviewStatusLabel(status) {
    if (status === 'done') return { label: '解き直し済', color: '#16a34a', bg: '#dcfce7' }
    if (status === 'retry') return { label: '要再挑戦', color: '#dc2626', bg: '#fee2e2' }
    return { label: '未完了', color: '#64748b', bg: '#f1f5f9' }
  }

  // ============================================================
  // RENDER - 詳細ビュー
  // ============================================================

  if (selectedScore) {
    const problemLogs = getProblemLogs(selectedScore)
    const revengeList = getRevengeList(selectedScore)
    const unitsForSubject = getUnitsForSubject(problemForm.subject)

    return (
      <div className="testscore-view">
        {/* 詳細ヘッダー */}
        <div className="detail-header">
          <button className="back-btn" onClick={() => setSelectedScore(null)}>
            ← 一覧へ戻る
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
          <div className="detail-header-actions">
            <button className="btn-edit-score" onClick={() => handleEditScore(selectedScore)}>
              ✏️ 成績編集
            </button>
          </div>
        </div>

        {/* アクションバー */}
        <div className="action-bar">
          <div className="action-bar-info">
            <span className="problem-count-badge">
              記録済み問題: {problemLogs.length}問
            </span>
            {revengeList.length > 0 && (
              <span className="revenge-count-badge">
                リベンジ対象: {revengeList.length}問
              </span>
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

        {/* ============ 問題別記録 ============ */}
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
                      const { label, color, bg } = reviewStatusLabel(problem.reviewStatus)
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

        {/* ============ リベンジリスト ============ */}
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
                        <span className="revenge-rate">
                          正答率 <strong>{problem.correctRate}%</strong>
                        </span>
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

        {/* ============ 問題追加フォーム（モーダル）============ */}
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
                    <label className={`radio-btn ${problemForm.isCorrect ? 'radio-correct active' : 'radio-correct'}`}>
                      <input
                        type="radio"
                        checked={problemForm.isCorrect === true}
                        onChange={() => setProblemForm({ ...problemForm, isCorrect: true })}
                      />
                      ○ 正解
                    </label>
                    <label className={`radio-btn ${!problemForm.isCorrect ? 'radio-wrong active' : 'radio-wrong'}`}>
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

              {/* 単元タグ選択 */}
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

        {/* 成績編集フォーム */}
        {showForm && renderScoreForm()}
      </div>
    )
  }

  // ============================================================
  // RENDER - サマリービュー（一覧）
  // ============================================================

  function renderScoreForm() {
    return (
      <div className="form-overlay" onClick={() => setShowForm(false)}>
        <div className="form-container" onClick={(e) => e.stopPropagation()}>
          <h3>{editingScore ? '✏️ 成績を編集' : '➕ 成績を追加'}</h3>

          <div className="form-section">
            <h4>基本情報</h4>
            <div className="form-row">
              <div className="form-field">
                <label>テスト名 *</label>
                <select
                  value={scoreForm.testName}
                  onChange={(e) => setScoreForm({ ...scoreForm, testName: e.target.value })}
                >
                  <option value="">選択してください</option>
                  {testTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>実施日 *</label>
                <input
                  type="date"
                  value={scoreForm.testDate}
                  onChange={(e) => setScoreForm({ ...scoreForm, testDate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>学年</label>
                <select
                  value={scoreForm.grade}
                  onChange={(e) => setScoreForm({ ...scoreForm, grade: e.target.value })}
                >
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>科目別得点</h4>
            {[
              { key: 'kokugo', label: '国語' },
              { key: 'sansu', label: '算数' },
              { key: 'rika', label: '理科' },
              { key: 'shakai', label: '社会' }
            ].map(({ key, label }) => (
              <div key={key} className="form-row subject-row">
                <div className="form-field">
                  <label>{label}</label>
                  <div className="score-input-group">
                    <input
                      type="number"
                      placeholder="得点"
                      value={scoreForm.scores[key]}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        scores: { ...scoreForm.scores, [key]: e.target.value }
                      })}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="満点"
                      value={scoreForm.maxScores[key]}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        maxScores: { ...scoreForm.maxScores, [key]: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label>偏差値</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="偏差値"
                    value={scoreForm.deviations[key]}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      deviations: { ...scoreForm.deviations, [key]: e.target.value }
                    })}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="form-section">
            <h4>2科目（国語+算数）</h4>
            <div className="form-row summary-row">
              <div className="form-field">
                <label>得点</label>
                <div className="score-input-group">
                  <input
                    type="number" placeholder="得点"
                    value={scoreForm.twoSubjects.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, score: e.target.value } })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="満点"
                    value={scoreForm.twoSubjects.maxScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, maxScore: e.target.value } })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>偏差値</label>
                <input
                  type="number" step="0.1" placeholder="偏差値"
                  value={scoreForm.twoSubjects.deviation}
                  onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, deviation: e.target.value } })}
                />
              </div>
              <div className="form-field">
                <label>順位</label>
                <div className="score-input-group">
                  <input
                    type="number" placeholder="順位"
                    value={scoreForm.twoSubjects.rank}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, rank: e.target.value } })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="受験者数"
                    value={scoreForm.twoSubjects.totalStudents}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, totalStudents: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>4科目合計</h4>
            <div className="form-row summary-row">
              <div className="form-field">
                <label>得点</label>
                <div className="score-input-group">
                  <input
                    type="number" placeholder="得点"
                    value={scoreForm.fourSubjects.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, score: e.target.value } })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="満点"
                    value={scoreForm.fourSubjects.maxScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, maxScore: e.target.value } })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>偏差値</label>
                <input
                  type="number" step="0.1" placeholder="偏差値"
                  value={scoreForm.fourSubjects.deviation}
                  onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, deviation: e.target.value } })}
                />
              </div>
              <div className="form-field">
                <label>順位</label>
                <div className="score-input-group">
                  <input
                    type="number" placeholder="順位"
                    value={scoreForm.fourSubjects.rank}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, rank: e.target.value } })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="受験者数"
                    value={scoreForm.fourSubjects.totalStudents}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, totalStudents: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>その他</h4>
            <div className="form-row">
              <div className="form-field">
                <label>コース</label>
                <input
                  type="text" placeholder="例: α1"
                  value={scoreForm.course}
                  onChange={(e) => setScoreForm({ ...scoreForm, course: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>クラス</label>
                <input
                  type="text" placeholder="例: A組"
                  value={scoreForm.className}
                  onChange={(e) => setScoreForm({ ...scoreForm, className: e.target.value })}
                />
              </div>
            </div>
            <div className="form-field full">
              <label>メモ</label>
              <textarea
                rows="3"
                placeholder="反省点、次回の目標など..."
                value={scoreForm.notes}
                onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              キャンセル
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {editingScore ? '✓ 更新' : '✓ 保存'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="testscore-view">
      {/* ヘッダー */}
      <div className="dashboard-header">
        <div className="selection-area">
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
      </div>

      {/* 成績追加ボタン */}
      <button className="add-score-btn" onClick={handleOpenForm}>
        + 成績を追加
      </button>

      {/* 偏差値推移グラフ */}
      {chartData.length >= 2 && (
        <DeviationChart data={chartData} />
      )}

      {/* 成績カード一覧（クリックで詳細へ） */}
      <div className="scores-content">
        {filteredScores.length === 0 ? (
          <div className="no-data">
            📊 この学年のテスト成績がありません
            <small>上の「+ 成績を追加」ボタンから記録を追加してください</small>
          </div>
        ) : (
          <div className="scores-list">
            {filteredScores.map(score => (
              <div key={score.firestoreId} className="score-card-wrapper">
                <ScoreCard
                  score={score}
                  onEdit={handleEditScore}
                  onDelete={handleDelete}
                />
                <button
                  className="btn-open-detail"
                  onClick={() => handleOpenDetail(score)}
                >
                  問題別分析・リベンジリスト →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 成績入力フォーム */}
      {showForm && renderScoreForm()}
    </div>
  )
}

export default TestScoreView
