import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { getAllMasterUnits } from '../utils/weaknessAnalysisApi'
import { getLessonLogs, computeAllProficiencies, getProficiencyLevel, addLessonLog } from '../utils/lessonLogs'
import './MasterUnitDashboard.css'

const CATEGORY_ORDER = ['計算', '数の性質', '規則性', '特殊算', '速さ', '割合', '比', '平面図形', '立体図形', '場合の数', 'グラフ・論理']

function MasterUnitDashboard() {
  const [loading, setLoading] = useState(true)
  const [masterUnits, setMasterUnits] = useState([])
  const [proficiencies, setProficiencies] = useState({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [practiceModal, setPracticeModal] = useState(null)
  const [practiceForm, setPracticeForm] = useState({ performance: '', isCorrect: null, notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const auth = getAuth()
      const userId = auth.currentUser?.uid
      if (!userId) return

      const [units, logsResult] = await Promise.all([
        getAllMasterUnits(),
        getLessonLogs(userId)
      ])

      setMasterUnits(units)

      if (logsResult.success) {
        setProficiencies(computeAllProficiencies(logsResult.data))
      }
    } catch (err) {
      console.error('データ取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPractice = (unit) => {
    setPracticeModal(unit)
    setPracticeForm({ performance: '', isCorrect: null, notes: '' })
  }

  const handleSavePractice = async () => {
    if (practiceForm.isCorrect === null && practiceForm.performance === '') {
      alert('結果を入力してください')
      return
    }

    const auth = getAuth()
    const userId = auth.currentUser?.uid
    if (!userId) return

    setSaving(true)
    try {
      const performance = practiceForm.performance !== ''
        ? parseInt(practiceForm.performance)
        : practiceForm.isCorrect ? 100 : 0

      await addLessonLog(userId, {
        unitIds: [practiceModal.id],
        sourceType: 'practice',
        sourceName: practiceModal.name,
        date: new Date(),
        performance,
        isCorrect: practiceForm.isCorrect,
        notes: practiceForm.notes,
      })

      setPracticeModal(null)
      await loadData()
    } catch (err) {
      console.error('練習記録エラー:', err)
      alert('記録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const categories = ['all', ...CATEGORY_ORDER]

  const filteredUnits = selectedCategory === 'all'
    ? masterUnits
    : masterUnits.filter(u => u.category === selectedCategory)

  // カテゴリ順でグループ化
  const groupedUnits = CATEGORY_ORDER.reduce((acc, cat) => {
    const units = filteredUnits.filter(u => u.category === cat)
    if (units.length > 0) acc[cat] = units
    return acc
  }, {})

  // 全体統計
  const totalUnits = masterUnits.length
  const studiedUnits = Object.keys(proficiencies).length
  const avgScore = studiedUnits > 0
    ? Math.round(
        Object.values(proficiencies).reduce((s, p) => s + Math.max(0, p.score), 0) / studiedUnits
      )
    : 0

  const levelCounts = [0, 1, 2, 3, 4, 5].map(lv =>
    Object.values(proficiencies).filter(p => p.level === lv).length
  )

  if (loading) {
    return <div className="mud-loading">📊 単元データを読み込み中...</div>
  }

  return (
    <div className="master-unit-dashboard">
      {/* 全体サマリー */}
      <div className="mud-summary">
        <div className="mud-summary-card">
          <div className="mud-summary-value">{studiedUnits}<span className="mud-summary-total">/{totalUnits}</span></div>
          <div className="mud-summary-label">学習済み単元</div>
        </div>
        <div className="mud-summary-card">
          <div className="mud-summary-value">{avgScore}</div>
          <div className="mud-summary-label">平均習熟度</div>
        </div>
        <div className="mud-level-bar">
          {[
            { lv: 5, label: '得意', color: '#16a34a' },
            { lv: 4, label: '良好', color: '#2563eb' },
            { lv: 3, label: '普通', color: '#ca8a04' },
            { lv: 2, label: '要復習', color: '#ea580c' },
            { lv: 1, label: '苦手', color: '#dc2626' },
          ].map(({ lv, label, color }) => (
            <div key={lv} className="mud-level-item">
              <div className="mud-level-dot" style={{ background: color }} />
              <span>{label}: {levelCounts[lv]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="mud-category-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`mud-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? '全て' : cat}
          </button>
        ))}
      </div>

      {/* 単元グリッド（カテゴリ別） */}
      <div className="mud-categories">
        {Object.entries(groupedUnits).map(([cat, units]) => (
          <div key={cat} className="mud-category-section">
            <h3 className="mud-cat-title">{cat}</h3>
            <div className="mud-unit-grid">
              {units.map(unit => {
                const prof = proficiencies[unit.id]
                const level = prof ? getProficiencyLevel(prof.score) : getProficiencyLevel(-1)
                return (
                  <button
                    key={unit.id}
                    className="mud-unit-cell"
                    style={{ '--prof-color': level.color }}
                    onClick={() => handleOpenPractice(unit)}
                    title={`${unit.name}\n難易度: ${'★'.repeat(unit.difficultyLevel || 1)}\n${prof ? `習熟度: ${prof.score}点 (${level.label})` : '未学習'}`}
                  >
                    <div className="mud-unit-indicator" style={{ background: level.color }} />
                    <div className="mud-unit-name">{unit.name}</div>
                    {prof && (
                      <div className="mud-unit-score">{prof.score}点</div>
                    )}
                    <div className="mud-unit-level" style={{ color: level.color }}>{level.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 練習記録モーダル */}
      {practiceModal && (
        <div className="mud-modal-overlay" onClick={() => setPracticeModal(null)}>
          <div className="mud-modal" onClick={e => e.stopPropagation()}>
            <h3>✏️ 練習を記録</h3>
            <p className="mud-modal-unit">{practiceModal.name}</p>
            <p className="mud-modal-cat">{practiceModal.category} / 難易度 {'★'.repeat(practiceModal.difficultyLevel || 1)}</p>

            <div className="mud-form">
              <div className="mud-form-group">
                <label>結果</label>
                <div className="mud-result-btns">
                  <button
                    className={`mud-result-btn correct ${practiceForm.isCorrect === true ? 'selected' : ''}`}
                    onClick={() => setPracticeForm(f => ({ ...f, isCorrect: true, performance: '' }))}
                  >⭕ 正解</button>
                  <button
                    className={`mud-result-btn incorrect ${practiceForm.isCorrect === false ? 'selected' : ''}`}
                    onClick={() => setPracticeForm(f => ({ ...f, isCorrect: false, performance: '' }))}
                  >❌ 不正解</button>
                </div>
              </div>

              <div className="mud-form-group">
                <label>得点率 (0-100、任意)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="例: 75"
                  value={practiceForm.performance}
                  onChange={e => setPracticeForm(f => ({ ...f, performance: e.target.value, isCorrect: null }))}
                  className="mud-input"
                />
              </div>

              <div className="mud-form-group">
                <label>メモ</label>
                <textarea
                  placeholder="気づいたことや次回へのコメント..."
                  value={practiceForm.notes}
                  onChange={e => setPracticeForm(f => ({ ...f, notes: e.target.value }))}
                  className="mud-textarea"
                  rows={2}
                />
              </div>
            </div>

            <div className="mud-modal-actions">
              <button className="mud-btn-cancel" onClick={() => setPracticeModal(null)} disabled={saving}>
                キャンセル
              </button>
              <button
                className="mud-btn-save"
                onClick={handleSavePractice}
                disabled={saving || (practiceForm.isCorrect === null && practiceForm.performance === '')}
              >
                {saving ? '記録中...' : '記録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MasterUnitDashboard
