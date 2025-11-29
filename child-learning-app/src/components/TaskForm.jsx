import { useState } from 'react'
import './TaskForm.css'

function TaskForm({ onAddTask }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('国語')
  const [difficulty, setDifficulty] = useState('medium')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      onAddTask({
        title: title.trim(),
        subject,
        difficulty,
      })
      setTitle('')
    }
  }

  const subjects = ['国語', '算数', '理科', '社会', '英語', '音楽', '体育', 'その他']
  const difficulties = [
    { value: 'easy', label: 'かんたん', emoji: '😊' },
    { value: 'medium', label: 'ふつう', emoji: '🙂' },
    { value: 'hard', label: 'むずかしい', emoji: '🤔' },
  ]

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>✏️ 新しい学習を追加</h2>

      <div className="form-group">
        <label htmlFor="title">学習内容</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 漢字ドリル10ページ"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="subject">教科</label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          {subjects.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>難しさ</label>
        <div className="difficulty-buttons">
          {difficulties.map(d => (
            <button
              key={d.value}
              type="button"
              className={`difficulty-btn ${difficulty === d.value ? 'active' : ''}`}
              onClick={() => setDifficulty(d.value)}
            >
              {d.emoji} {d.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="submit-btn">
        ➕ 追加する
      </button>
    </form>
  )
}

export default TaskForm
