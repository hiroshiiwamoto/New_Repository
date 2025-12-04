import { useState, useEffect } from 'react'
import './TestScoreView.css'
import { grades } from '../utils/unitsDatabase'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  testTypes
} from '../utils/testScores'
import ScoreCard from './ScoreCard'

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [showForm, setShowForm] = useState(false)
  const [editingScore, setEditingScore] = useState(null)
  const [scoreForm, setScoreForm] = useState(getEmptyForm())

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

  // データ読み込み
  useEffect(() => {
    if (!user) return

    const loadScores = async () => {
      const result = await getAllTestScores(user.uid)
      if (result.success) {
        setScores(result.data)
      }
    }

    loadScores()
  }, [user])

  // フィルタリング
  const filteredScores = scores.filter(s => s.grade === selectedGrade)

  // フォームを開く
  const handleOpenForm = () => {
    setEditingScore(null)
    setScoreForm(getEmptyForm())
    setShowForm(true)
  }

  // 編集フォームを開く
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

  // 保存
  const handleSave = async () => {
    if (!user) {
      alert('❌ ログインが必要です')
      return
    }

    if (!scoreForm.testName || !scoreForm.testDate) {
      alert('❌ テスト名と実施日は必須です')
      return
    }

    const result = editingScore
      ? await updateTestScore(user.uid, editingScore.firestoreId, scoreForm)
      : await addTestScore(user.uid, scoreForm)

    if (result.success) {
      // データを再読み込み
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) {
        setScores(refreshResult.data)
      }
      setShowForm(false)
      alert(editingScore ? '✅ 更新しました' : '✅ 保存しました')
    } else {
      alert('❌ 保存に失敗しました: ' + result.error)
    }
  }

  // 削除
  const handleDelete = async (score) => {
    if (!window.confirm(`「${score.testName} (${score.testDate})」を削除しますか？`)) {
      return
    }

    const result = await deleteTestScore(user.uid, score.firestoreId)

    if (result.success) {
      setScores(scores.filter(s => s.firestoreId !== score.firestoreId))
      alert('✅ 削除しました')
    } else {
      alert('❌ 削除に失敗しました: ' + result.error)
    }
  }

  return (
    <div className="testscore-view">
      <div className="view-header">
        <h2>📊 テスト成績管理</h2>
        <p className="view-description">
          SAPIX各種テストの成績を記録・管理します
        </p>
      </div>

      {/* フィルター */}
      <div className="view-filters">
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

        <button className="add-score-btn" onClick={handleOpenForm}>
          + 成績を追加
        </button>
      </div>

      {/* 成績一覧 */}
      <div className="scores-content">
        {filteredScores.length === 0 ? (
          <div className="no-data">
            📝 この学年のテスト成績がありません
            <br />
            <small>「+ 成績を追加」ボタンから記録してください</small>
          </div>
        ) : (
          <div className="scores-list">
            {filteredScores.map(score => (
              <ScoreCard
                key={score.firestoreId}
                score={score}
                onEdit={handleEditScore}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* 成績入力フォーム */}
      {showForm && (
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
                      type="number"
                      placeholder="得点"
                      value={scoreForm.twoSubjects.score}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        twoSubjects: { ...scoreForm.twoSubjects, score: e.target.value }
                      })}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="満点"
                      value={scoreForm.twoSubjects.maxScore}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        twoSubjects: { ...scoreForm.twoSubjects, maxScore: e.target.value }
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
                    value={scoreForm.twoSubjects.deviation}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      twoSubjects: { ...scoreForm.twoSubjects, deviation: e.target.value }
                    })}
                  />
                </div>
                <div className="form-field">
                  <label>順位</label>
                  <div className="score-input-group">
                    <input
                      type="number"
                      placeholder="順位"
                      value={scoreForm.twoSubjects.rank}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        twoSubjects: { ...scoreForm.twoSubjects, rank: e.target.value }
                      })}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="受験者数"
                      value={scoreForm.twoSubjects.totalStudents}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        twoSubjects: { ...scoreForm.twoSubjects, totalStudents: e.target.value }
                      })}
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
                      type="number"
                      placeholder="得点"
                      value={scoreForm.fourSubjects.score}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        fourSubjects: { ...scoreForm.fourSubjects, score: e.target.value }
                      })}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="満点"
                      value={scoreForm.fourSubjects.maxScore}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        fourSubjects: { ...scoreForm.fourSubjects, maxScore: e.target.value }
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
                    value={scoreForm.fourSubjects.deviation}
                    onChange={(e) => setScoreForm({
                      ...scoreForm,
                      fourSubjects: { ...scoreForm.fourSubjects, deviation: e.target.value }
                    })}
                  />
                </div>
                <div className="form-field">
                  <label>順位</label>
                  <div className="score-input-group">
                    <input
                      type="number"
                      placeholder="順位"
                      value={scoreForm.fourSubjects.rank}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        fourSubjects: { ...scoreForm.fourSubjects, rank: e.target.value }
                      })}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      placeholder="受験者数"
                      value={scoreForm.fourSubjects.totalStudents}
                      onChange={(e) => setScoreForm({
                        ...scoreForm,
                        fourSubjects: { ...scoreForm.fourSubjects, totalStudents: e.target.value }
                      })}
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
                    type="text"
                    placeholder="例: α1"
                    value={scoreForm.course}
                    onChange={(e) => setScoreForm({ ...scoreForm, course: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>クラス</label>
                  <input
                    type="text"
                    placeholder="例: A組"
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
              <button
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
              >
                {editingScore ? '✓ 更新' : '✓ 保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestScoreView
