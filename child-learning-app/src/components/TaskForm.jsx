import { useState } from 'react'
import './TaskForm.css'

function TaskForm({ onAddTask }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('算数')
  const [unit, setUnit] = useState('')
  const [taskType, setTaskType] = useState('daily')
  const [priority, setPriority] = useState('B')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      onAddTask({
        title: title.trim(),
        subject,
        unit,
        taskType,
        priority,
        dueDate: dueDate || null,
      })
      setTitle('')
      setUnit('')
    }
  }

  const subjects = {
    '国語': ['漢字', '語彙', '読解', '記述', '知識'],
    '算数': ['計算', '図形', '文章題', '特殊算', '規則性', '場合の数'],
    '理科': ['物理', '化学', '生物', '地学', '実験・観察'],
    '社会': ['地理', '歴史', '公民', '時事問題']
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

  return (
    <form className="task-form sapix-form" onSubmit={handleSubmit}>
      <h2>✏️ 学習タスクを追加</h2>

      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="subject">科目</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setUnit('')
            }}
          >
            {Object.keys(subjects).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group half">
          <label htmlFor="unit">単元</label>
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="">選択してください</option>
            {subjects[subject].map(u => (
              <option key={u} value={u}>{u}</option>
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

      <button type="submit" className="submit-btn sapix-btn">
        ➕ タスクを追加
      </button>
    </form>
  )
}

export default TaskForm
