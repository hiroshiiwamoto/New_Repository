import { useState } from 'react'
import './UnitManager.css'
import { unitsDatabase, subjects, grades } from '../utils/unitsDatabase'
import { subjectEmojis, subjectColors } from '../utils/constants'

function UnitManager({ customUnits, onUpdateUnit, onDeleteUnit }) {
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [editingUnit, setEditingUnit] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', category: '' })

  // デフォルト単元とカスタム単元を統合
  const defaultUnits = unitsDatabase[selectedSubject]?.[selectedGrade] || []
  const filteredCustomUnits = customUnits.filter(
    u => u.subject === selectedSubject && u.grade === selectedGrade
  )

  const handleEditClick = (unit) => {
    setEditingUnit(unit)
    setEditForm({ name: unit.name, category: unit.category })
  }

  const handleCancelEdit = () => {
    setEditingUnit(null)
    setEditForm({ name: '', category: '' })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      alert('単元名を入力してください')
      return
    }

    const result = await onUpdateUnit(editingUnit.firestoreId, {
      name: editForm.name.trim(),
      category: editForm.category,
    })

    if (result.success) {
      alert('✅ 単元を更新しました')
      setEditingUnit(null)
      setEditForm({ name: '', category: '' })
    } else {
      alert('❌ 更新に失敗しました: ' + result.error)
    }
  }

  const handleDelete = async (unit) => {
    if (!window.confirm(`「${unit.name}」を削除しますか？\n\nこの操作は取り消せません。`)) {
      return
    }

    const result = await onDeleteUnit(unit.firestoreId)

    if (result.success) {
      alert('✅ 単元を削除しました')
    } else {
      alert('❌ 削除に失敗しました: ' + result.error)
    }
  }

  return (
    <div className="unit-manager">
      {/* フィルター */}
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

      {/* デフォルト単元セクション */}
      <div className="units-section">
        <h3 className="section-title">
          📋 標準単元 <span className="unit-count">({defaultUnits.length}件)</span>
        </h3>
        {defaultUnits.length === 0 ? (
          <div className="no-units">標準単元がありません</div>
        ) : (
          <div className="units-grid">
            {defaultUnits.map((unit) => (
              <div key={unit.id} className="unit-card">
                <div className="unit-title">
                  <span className="unit-name">{unit.name}</span>
                  <span className="unit-category">{unit.category}</span>
                </div>
                <div className="unit-actions">
                  <span className="default-badge">標準</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* カスタム単元セクション */}
      <div className="units-section">
        <h3 className="section-title">
          ➕ カスタム単元 <span className="unit-count">({filteredCustomUnits.length}件)</span>
        </h3>
        {filteredCustomUnits.length === 0 ? (
          <div className="no-units">
            カスタム単元がありません
            <br />
            <small>タスク追加画面の「➕」ボタンから追加できます</small>
          </div>
        ) : (
          <div className="units-grid">
            {filteredCustomUnits.map((unit) => (
              <div key={unit.id} className="unit-card custom">
                {editingUnit && editingUnit.id === unit.id ? (
                  // 編集モード
                  <div className="unit-edit-form">
                    <div className="edit-fields">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="単元名"
                        className="edit-input"
                      />
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="edit-select"
                      >
                        <option value="過去問">過去問</option>
                        <option value="弱点対策">弱点対策</option>
                        <option value="発展">発展</option>
                        <option value="特訓">特訓</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>
                    <div className="edit-actions">
                      <button className="save-btn" onClick={handleSaveEdit}>
                        ✓ 保存
                      </button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        ✕ キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <>
                    <div className="unit-title">
                      <span className="unit-name">{unit.name}</span>
                      <span className="unit-category">{unit.category}</span>
                    </div>
                    <div className="unit-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(unit)}
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(unit)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UnitManager
