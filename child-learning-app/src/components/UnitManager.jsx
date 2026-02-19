import { useState } from 'react'
import './UnitManager.css'
import { subjects, grades } from '../utils/unitsDatabase'
import { subjectEmojis, subjectColors } from '../utils/constants'
import CustomUnitForm from './CustomUnitForm'
import { toast } from '../utils/toast'

function UnitManager({ customUnits = [], onAddCustomUnit, onUpdateUnit, onDeleteUnit }) {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [customUnitName, setCustomUnitName] = useState('')
  const [customUnitCategory, setCustomUnitCategory] = useState('過去問')

  // 選択された学年・科目のカスタム単元をフィルタリング
  const filteredCustomUnits = customUnits.filter(
    unit => unit.grade === selectedGrade && unit.subject === selectedSubject
  )

  // カスタム単元追加
  const handleAddCustomUnit = async () => {
    if (!customUnitName.trim()) {
      toast.error('単元名を入力してください')
      return
    }

    const unitData = {
      name: customUnitName,
      category: customUnitCategory,
      subject: selectedSubject,
      grade: selectedGrade,
    }

    if (onAddCustomUnit) {
      const result = await onAddCustomUnit(unitData)
      if (result.success) {
        setCustomUnitName('')
        setCustomUnitCategory('過去問')
        setShowAddForm(false)
      }
    }
  }

  // カスタム単元編集
  const handleEditUnit = (unit) => {
    setEditingUnit(unit)
    setCustomUnitName(unit.name)
    setCustomUnitCategory(unit.category)
    setShowAddForm(true)
  }

  // カスタム単元更新
  const handleUpdateCustomUnit = async () => {
    if (!customUnitName.trim()) {
      toast.error('単元名を入力してください')
      return
    }

    if (editingUnit && onUpdateUnit) {
      await onUpdateUnit(editingUnit.id, {
        name: customUnitName,
        category: customUnitCategory,
      })
      toast.success('カスタム単元を更新しました')
    }

    setEditingUnit(null)
    setCustomUnitName('')
    setCustomUnitCategory('過去問')
    setShowAddForm(false)
  }

  // カスタム単元削除
  const handleDeleteUnit = async (unit) => {
    if (!window.confirm(`「${unit.name}」を削除しますか？`)) {
      return
    }

    if (onDeleteUnit) {
      await onDeleteUnit(unit.id)
      toast.success('カスタム単元を削除しました')
    }
  }

  // フォームキャンセル
  const handleCancelForm = () => {
    setEditingUnit(null)
    setCustomUnitName('')
    setCustomUnitCategory('過去問')
    setShowAddForm(false)
  }

  return (
    <div className="unit-manager">
      {/* ヘッダー：学年・科目選択 */}
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

        <div className="subject-grid">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`dashboard-subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
                padding: '12px',
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="subject-emoji">{subjectEmojis[subject]}</span>
              <span>{subject}</span>
            </button>
          ))}
        </div>
      </div>

      {/* カスタム単元追加ボタン */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <button
          className="add-session-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ maxWidth: '400px' }}
        >
          {showAddForm ? '✕ キャンセル' : '➕ カスタム単元を追加'}
        </button>
      </div>

      {/* カスタム単元追加・編集フォーム */}
      {showAddForm && (
        <div style={{ marginBottom: '24px' }}>
          <CustomUnitForm
            customUnitName={customUnitName}
            setCustomUnitName={setCustomUnitName}
            customUnitCategory={customUnitCategory}
            setCustomUnitCategory={setCustomUnitCategory}
            onAdd={editingUnit ? handleUpdateCustomUnit : handleAddCustomUnit}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* カスタム単元一覧 */}
      <div className="units-grid">
        {filteredCustomUnits.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8',
            fontSize: '1rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
            <div>まだカスタム単元がありません</div>
            <div style={{ fontSize: '0.875rem', marginTop: '8px' }}>
              「カスタム単元を追加」ボタンから新しい単元を作成できます
            </div>
          </div>
        ) : (
          filteredCustomUnits.map((unit) => {
            const unitBackgroundColor = `${subjectColors[selectedSubject]}26`

            return (
              <div
                key={unit.id || unit.id}
                className="unit-card"
                style={{ backgroundColor: unitBackgroundColor }}
              >
                <div className="unit-header">
                  <div className="unit-title">
                    <span className="unit-name">{unit.name}</span>
                    <span className="unit-category">{unit.category}</span>
                  </div>
                  <div className="unit-badge">カスタム</div>
                </div>

                {/* 編集・削除ボタン */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '12px'
                }}>
                  <button
                    className="save-session-btn"
                    onClick={() => handleEditUnit(unit)}
                    style={{
                      flex: 1,
                      background: '#007AFF',
                      fontSize: '0.875rem'
                    }}
                  >
                    ✏️ 編集
                  </button>
                  <button
                    className="save-session-btn"
                    onClick={() => handleDeleteUnit(unit)}
                    style={{
                      flex: 1,
                      background: '#FF3B30',
                      fontSize: '0.875rem'
                    }}
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default UnitManager
