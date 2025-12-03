import { useState, useEffect } from 'react'
import './TaskForm.css'
import { unitsDatabase, grades } from '../utils/unitsDatabase'

function TaskForm({ onAddTask, onUpdateTask, editingTask, onCancelEdit }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('算数')
  const [grade, setGrade] = useState('4年生')
  const [unitId, setUnitId] = useState('')
  const [taskType, setTaskType] = useState('daily')
  const [priority, setPriority] = useState('B')
  const [dueDate, setDueDate] = useState('')

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
      const taskData = {
        title: title.trim(),
        subject,
        grade,
        unitId,
        unit: getUnitName(unitId),
        taskType,
        priority,
        dueDate: dueDate || null,
      }

      if (editingTask) {
        onUpdateTask(editingTask.id, taskData)
      } else {
        onAddTask(taskData)
      }

      // フォームをリセット
      setTitle('')
      setUnitId('')
      if (editingTask && onCancelEdit) {
        onCancelEdit()
      }
    }
  }

  const getUnitName = (unitId) => {
    if (!unitId) return ''
    const units = unitsDatabase[subject]?.[grade] || []
    const unit = units.find(u => u.id === unitId)
    return unit ? unit.name : ''
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
  const currentUnits = unitsDatabase[subject]?.[grade] || []

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
          <select
            id="unit"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">選択してください</option>
            {currentUnits.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.category})
              </option>
            ))}
          </select>
        </div>
      </div>

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
