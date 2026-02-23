import { useState, useMemo } from 'react'
import './TestScoreView.css'
import { getTodayString } from '../utils/dateUtils'
import { grades } from '../utils/unitsDatabase'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  testTypes
} from '../utils/testScores'
import ScoreCard from './ScoreCard'
import DeviationChart from './DeviationChart'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import EmptyState from './EmptyState'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'

function GradesView({ user }) {
  const { data: scores, reload: reloadScores } = useFirestoreQuery(
    () => user ? getAllTestScores(user.uid) : null,
    [user]
  )
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [showForm, setShowForm] = useState(false)
  const [editingScore, setEditingScore] = useState(null)
  const [scoreForm, setScoreForm] = useState(getEmptyForm())
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  function getEmptyForm() {
    return {
      testName: '',
      testDate: getTodayString(),
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

  const filteredScores = (scores || []).filter(s => s.grade === selectedGrade && s.status !== 'scheduled')

  const chartData = useMemo(() => {
    return [...filteredScores]
      .filter(s => s.fourSubjects?.deviation || s.twoSubjects?.deviation)
      .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))
  }, [filteredScores])

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
    if (!user) { toast.error(TOAST.LOGIN_REQUIRED); return }
    if (!scoreForm.testName || !scoreForm.testDate) {
      toast.error('テスト名と実施日は必須です')
      return
    }
    const result = editingScore
      ? await updateTestScore(user.uid, editingScore.id, scoreForm)
      : await addTestScore(user.uid, scoreForm)
    if (result.success) {
      await reloadScores()
      setShowForm(false)
      toast.success(editingScore ? TOAST.UPDATE_SUCCESS : TOAST.SAVE_SUCCESS)
    } else {
      toast.error(TOAST.SAVE_FAILED + ': ' + result.error)
    }
  }

  const handleDeleteRequest = (scoreId) => setPendingDeleteId(scoreId)
  const handleDeleteCancel = () => setPendingDeleteId(null)
  const handleDeleteConfirm = async (score) => {
    setPendingDeleteId(null)
    const result = await deleteTestScore(user.uid, score.id)
    if (result.success) {
      await reloadScores()
      toast.success(TOAST.DELETE_SUCCESS)
    } else {
      toast.error(TOAST.DELETE_FAILED)
    }
  }

  function renderScoreForm() {
    return (
      <div className="modal-overlay-common" onClick={() => setShowForm(false)}>
        <div className="form-container" onClick={(e) => e.stopPropagation()}>
          <h3>{editingScore ? '✏️ 成績を編集' : '➕ 成績を追加'}</h3>

          <div className="form-section">
            <h4>基本情報</h4>
            <div className="form-row">
              <div className="form-field">
                <label>テスト名 *</label>
                <input
                  type="text"
                  list="grade-test-type-list"
                  placeholder="例: 組分けテスト"
                  value={scoreForm.testName}
                  onChange={(e) => setScoreForm({ ...scoreForm, testName: e.target.value })}
                />
                <datalist id="grade-test-type-list">
                  {testTypes.map(t => <option key={t} value={t} />)}
                </datalist>
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
                  <input type="number" placeholder="得点"
                    value={scoreForm.twoSubjects.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, score: e.target.value } })}
                  />
                  <span>/</span>
                  <input type="number" placeholder="満点"
                    value={scoreForm.twoSubjects.maxScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, maxScore: e.target.value } })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>偏差値</label>
                <input type="number" step="0.1" placeholder="偏差値"
                  value={scoreForm.twoSubjects.deviation}
                  onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, deviation: e.target.value } })}
                />
              </div>
              <div className="form-field">
                <label>順位</label>
                <div className="score-input-group">
                  <input type="number" placeholder="順位"
                    value={scoreForm.twoSubjects.rank}
                    onChange={(e) => setScoreForm({ ...scoreForm, twoSubjects: { ...scoreForm.twoSubjects, rank: e.target.value } })}
                  />
                  <span>/</span>
                  <input type="number" placeholder="受験者数"
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
                  <input type="number" placeholder="得点"
                    value={scoreForm.fourSubjects.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, score: e.target.value } })}
                  />
                  <span>/</span>
                  <input type="number" placeholder="満点"
                    value={scoreForm.fourSubjects.maxScore}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, maxScore: e.target.value } })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>偏差値</label>
                <input type="number" step="0.1" placeholder="偏差値"
                  value={scoreForm.fourSubjects.deviation}
                  onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, deviation: e.target.value } })}
                />
              </div>
              <div className="form-field">
                <label>順位</label>
                <div className="score-input-group">
                  <input type="number" placeholder="順位"
                    value={scoreForm.fourSubjects.rank}
                    onChange={(e) => setScoreForm({ ...scoreForm, fourSubjects: { ...scoreForm.fourSubjects, rank: e.target.value } })}
                  />
                  <span>/</span>
                  <input type="number" placeholder="受験者数"
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
                <input type="text" placeholder="例: α1"
                  value={scoreForm.course}
                  onChange={(e) => setScoreForm({ ...scoreForm, course: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>クラス</label>
                <input type="text" placeholder="例: A組"
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
              {LABELS.CANCEL}
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

      <button className="add-score-btn" onClick={handleOpenForm}>
        + 成績を追加
      </button>

      {chartData.length >= 2 && (
        <DeviationChart data={chartData} />
      )}

      <div className="scores-content">
        {filteredScores.length === 0 ? (
          <EmptyState
            icon="📊"
            message="この学年のテスト成績がありません"
            hint="上の「+ 成績を追加」ボタンから記録を追加してください"
          />
        ) : (
          <div className="scores-list">
            {filteredScores.map(score => (
              <ScoreCard
                key={score.id}
                score={score}
                onEdit={handleEditScore}
                onDelete={handleDeleteConfirm}
                onDeleteRequest={handleDeleteRequest}
                onDeleteCancel={handleDeleteCancel}
                isPendingDelete={pendingDeleteId === score.id}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && renderScoreForm()}
    </div>
  )
}

export default GradesView
