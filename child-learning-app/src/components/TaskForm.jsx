import { useState, useEffect } from 'react'
import './TaskForm.css'
import { unitsDatabase, grades } from '../utils/unitsDatabase'

function TaskForm({ onAddTask, onUpdateTask, editingTask, onCancelEdit, customUnits = [], onAddCustomUnit }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('算数')
  const [grade, setGrade] = useState('4年生')
  const [unitId, setUnitId] = useState('')
  const [taskType, setTaskType] = useState('daily')
  const [priority, setPriority] = useState('B')
  const [dueDate, setDueDate] = useState('')
  const [showCustomUnitForm, setShowCustomUnitForm] = useState(false)
  const [customUnitName, setCustomUnitName] = useState('')
  const [customUnitCategory, setCustomUnitCategory] = useState('過去問')
  const [lastAddedCustomUnit, setLastAddedCustomUnit] = useState(null) // 最近追加したカスタム単元を一時保存

  // 編集モードの場合、フォームに値を設定
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '')
      setSubject(editingTask.subject || '算数')
      setGrade(editingTask.grade || '4年生')
      setUnitId(editingTask.unitId || '')
      setTaskType(editingTask.taskType || 'daily')
      setPriority(editingTask.priority || 'B')
      setDueDate(editingTask.dueDate || '')
    }
  }, [editingTask])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      const unitName = getUnitName(unitId)
      const taskData = {
        title: title.trim(),
        subject,
        grade,
        unitId,
        unit: unitName,
        taskType,
        priority,
        dueDate: dueDate || null,
      }

      console.log('📝 タスク作成/更新:', taskData)

      if (editingTask) {
        onUpdateTask(editingTask.id, taskData)
      } else {
        onAddTask(taskData)
      }

      // フォームをリセット
      setTitle('')
      setUnitId('')
      setLastAddedCustomUnit(null) // 一時保存した単元情報をクリア
      if (editingTask && onCancelEdit) {
        onCancelEdit()
      }
    }
  }

  const getUnitName = (unitId) => {
    console.log('🔍 getUnitName呼び出し:', { unitId, subject, grade })
    if (!unitId) return ''

    // 最近追加したカスタム単元を優先的にチェック（状態更新が間に合わない場合の対策）
    if (lastAddedCustomUnit && lastAddedCustomUnit.id === unitId) {
      console.log('✅ 最近追加したカスタム単元を使用:', lastAddedCustomUnit.name)
      return lastAddedCustomUnit.name
    }

    // デフォルト単元から検索
    const defaultUnits = unitsDatabase[subject]?.[grade] || []
    const defaultUnit = defaultUnits.find(u => u.id === unitId)
    if (defaultUnit) {
      console.log('✅ デフォルト単元が見つかりました:', defaultUnit.name)
      return defaultUnit.name
    }

    // カスタム単元から検索
    console.log('🔍 カスタム単元から検索:', { customUnits, unitId })
    const customUnit = customUnits.find(u => u.id === unitId)
    if (customUnit) {
      console.log('✅ カスタム単元が見つかりました:', customUnit.name)
      return customUnit.name
    }
    console.log('❌ 単元が見つかりませんでした')
    return ''
  }

  const handleAddCustomUnit = async () => {
    if (!customUnitName.trim()) {
      alert('単元名を入力してください')
      return
    }

    if (!onAddCustomUnit) {
      alert('カスタム単元の追加機能が利用できません')
      return
    }

    const { generateCustomUnitId } = await import('../utils/customUnits')
    const unitId = generateCustomUnitId(subject, grade, customUnitName)

    const unitData = {
      id: unitId,
      subject,
      grade,
      name: customUnitName.trim(),
      category: customUnitCategory,
    }

    console.log('➕ カスタム単元を追加:', unitData)

    const result = await onAddCustomUnit(unitData)

    console.log('✅ 追加結果:', result)

    if (result.success) {
      // 最近追加したカスタム単元として保存（状態更新が間に合わない場合の対策）
      const addedUnitName = customUnitName.trim()
      setLastAddedCustomUnit({ id: result.data.id, name: addedUnitName })

      // フォームをリセット
      setCustomUnitName('')
      setCustomUnitCategory('過去問')
      setShowCustomUnitForm(false)
      // 追加した単元を選択
      setUnitId(result.data.id)
      alert(`✅ 単元「${addedUnitName}」を追加しました`)
    } else {
      alert(`❌ カスタム単元の追加に失敗しました: ${result.error || '不明なエラー'}`)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setUnitId('')
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  const taskTypes = [
    { value: 'daily', label: 'デイリー復習', emoji: '📖' },
    { value: 'basic', label: '基礎トレ', emoji: '✏️' },
    { value: 'test', label: 'テスト対策', emoji: '📝' },
    { value: 'pastpaper', label: '過去問', emoji: '📄' },
    { value: 'weakness', label: '弱点補強', emoji: '💪' },
  ]

  const priorities = [
    { value: 'A', label: 'A (最重要)', color: '#ef4444' },
    { value: 'B', label: 'B (重要)', color: '#f59e0b' },
    { value: 'C', label: 'C (通常)', color: '#3b82f6' },
  ]

  const subjects = ['国語', '算数', '理科', '社会']

  // デフォルト単元とカスタム単元を統合
  const defaultUnits = unitsDatabase[subject]?.[grade] || []
  const filteredCustomUnits = customUnits.filter(u => u.subject === subject && u.grade === grade)
  const currentUnits = [...defaultUnits, ...filteredCustomUnits]

  // デバッグ: カスタム単元の内容を確認
  useEffect(() => {
    console.log('🔍 カスタム単元デバッグ情報:')
    console.log('  全カスタム単元:', customUnits)
    console.log('  現在の科目:', subject)
    console.log('  現在の学年:', grade)
    console.log('  フィルタ後のカスタム単元:', filteredCustomUnits)
  }, [customUnits, subject, grade, filteredCustomUnits])

  return (
    <form className="task-form sapix-form" onSubmit={handleSubmit}>
      <h2>{editingTask ? '✏️ タスクを編集' : '✏️ 学習タスクを追加'}</h2>

      <div className="form-row">
        <div className="form-group third">
          <label htmlFor="subject">科目</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setUnitId('')
            }}
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group third">
          <label htmlFor="grade">学年</label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value)
              setUnitId('')
            }}
          >
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="form-group third">
          <label htmlFor="unit">単元</label>
          <div className="unit-select-container">
            <select
              id="unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">選択してください</option>
              {defaultUnits.length > 0 && (
                <optgroup label="標準単元">
                  {defaultUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.category})
                    </option>
                  ))}
                </optgroup>
              )}
              {filteredCustomUnits.length > 0 && (
                <optgroup label="カスタム単元">
                  {filteredCustomUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.category})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              className="add-custom-unit-btn"
              onClick={() => setShowCustomUnitForm(!showCustomUnitForm)}
              title="カスタム単元を追加"
            >
              ➕
            </button>
          </div>
        </div>
      </div>

      {/* カスタム単元追加フォーム */}
      {showCustomUnitForm && (
        <div className="custom-unit-form">
          <h3>➕ カスタム単元を追加</h3>
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="customUnitName">単元名</label>
              <input
                type="text"
                id="customUnitName"
                value={customUnitName}
                onChange={(e) => setCustomUnitName(e.target.value)}
                placeholder="例: 開成2023年第1回"
              />
            </div>
            <div className="form-group half">
              <label htmlFor="customUnitCategory">カテゴリ</label>
              <select
                id="customUnitCategory"
                value={customUnitCategory}
                onChange={(e) => setCustomUnitCategory(e.target.value)}
              >
                <option value="過去問">過去問</option>
                <option value="弱点対策">弱点対策</option>
                <option value="発展">発展</option>
                <option value="特訓">特訓</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>
          <div className="custom-unit-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowCustomUnitForm(false)
                setCustomUnitName('')
                setCustomUnitCategory('過去問')
              }}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddCustomUnit}
            >
              追加
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">学習内容</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: デイリーサピックス No.23 p.12-15"
          required
        />
      </div>

      <div className="form-group">
        <label>タスク種別</label>
        <div className="task-type-buttons">
          {taskTypes.map(t => (
            <button
              key={t.value}
              type="button"
              className={`type-btn ${taskType === t.value ? 'active' : ''}`}
              onClick={() => setTaskType(t.value)}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group half">
          <label>優先度</label>
          <div className="priority-buttons">
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                className={`priority-btn ${priority === p.value ? 'active' : ''}`}
                style={{
                  borderColor: priority === p.value ? p.color : '#e0e0e0',
                  backgroundColor: priority === p.value ? p.color : 'white',
                  color: priority === p.value ? 'white' : '#333'
                }}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group half">
          <label htmlFor="dueDate">📅 実施日（任意）</label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn sapix-btn">
          {editingTask ? '✓ 更新' : '➕ タスクを追加'}
        </button>
        {editingTask && (
          <button type="button" className="cancel-btn" onClick={handleCancel}>
            ✕ キャンセル
          </button>
        )}
      </div>
    </form>
  )
}

export default TaskForm
