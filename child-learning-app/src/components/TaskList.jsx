import { useState, useMemo } from 'react'
import TaskItem from './TaskItem'
import EmptyState from './EmptyState'
import './TaskList.css'

function TaskList({ tasks, onToggleTask, onDeleteTask, onBulkDeleteTasks, onEditTask }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('dueDate') // dueDate, subject, priority, created
  const [selectedTasks, setSelectedTasks] = useState([])
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('全て') // 全て, 国語, 算数, 理科, 社会

  const subjects = [
    { name: '全て', emoji: '📚', color: '#64748b' },
    { name: '国語', emoji: '📖', color: '#10b981' },
    { name: '算数', emoji: '🔢', color: '#ef4444' },
    { name: '理科', emoji: '🔬', color: '#3b82f6' },
    { name: '社会', emoji: '🌏', color: '#f59e0b' }
  ]

  // フィルターとソート
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks]

    // 過去問タスクを除外（過去問ビューで管理）ただしクリップ由来の個別問題タスクは表示
    result = result.filter(task => task.taskType !== 'pastpaper' || task.generatedFrom)

    // 科目フィルター
    if (selectedSubject !== '全て') {
      result = result.filter(task => task.subject === selectedSubject)
    }

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.subject?.toLowerCase().includes(query) ||
        task.unit?.toLowerCase().includes(query)
      )
    }

    // ソート
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate) - new Date(b.dueDate)
        case 'subject':
          return (a.subject || '').localeCompare(b.subject || '')
        case 'priority': {
          const priorityOrder = { A: 0, B: 1, C: 2 }
          return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
        }
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt)
        default:
          return 0
      }
    })

    return result
  }, [tasks, searchQuery, sortBy, selectedSubject])

  // 統計を計算（過去問を除外）
  const statistics = useMemo(() => {
    const nonPastPaperTasks = tasks.filter(t => t.taskType !== 'pastpaper')
    const total = nonPastPaperTasks.length
    const completed = nonPastPaperTasks.filter(t => t.completed).length
    const pending = total - completed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // 科目別統計
    const bySubject = {}
    nonPastPaperTasks.forEach(task => {
      const subject = task.subject || 'その他'
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, completed: 0 }
      }
      bySubject[subject].total++
      if (task.completed) bySubject[subject].completed++
    })

    // 優先度別統計
    const byPriority = {}
    nonPastPaperTasks.forEach(task => {
      const priority = task.priority || 'なし'
      if (!byPriority[priority]) {
        byPriority[priority] = { total: 0, completed: 0 }
      }
      byPriority[priority].total++
      if (task.completed) byPriority[priority].completed++
    })

    return {
      total,
      completed,
      pending,
      completionRate,
      bySubject,
      byPriority
    }
  }, [tasks])

  // 一括選択
  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredAndSortedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredAndSortedTasks.map(t => t.id))
    }
  }

  const toggleSelectTask = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  // 一括操作
  const handleBulkComplete = () => {
    if (window.confirm(`${selectedTasks.length}件のタスクを完了にしますか？`)) {
      selectedTasks.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId)
        if (task && !task.completed) {
          onToggleTask(taskId)
        }
      })
      setSelectedTasks([])
      setBulkMode(false)
    }
  }

  const handleBulkDelete = () => {
    if (window.confirm(`${selectedTasks.length}件のタスクを削除しますか？この操作は取り消せません。`)) {
      if (onBulkDeleteTasks) {
        onBulkDeleteTasks(selectedTasks)
      } else {
        selectedTasks.forEach(taskId => {
          onDeleteTask(taskId)
        })
      }
      setSelectedTasks([])
      setBulkMode(false)
    }
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="📝"
        message="まだ学習タスクがありません"
        hint="上から新しい学習を追加してね！"
      />
    )
  }

  return (
    <div className="enhanced-task-list">
      {/* 統計サマリー */}
      <div className="task-statistics">
        <div className="stat-item">
          <div className="stat-label">総タスク数</div>
          <div className="stat-value">{statistics.total}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">完了</div>
          <div className="stat-value">{statistics.completed}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">未完了</div>
          <div className="stat-value">{statistics.pending}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">達成率</div>
          <div className="stat-value">{statistics.completionRate}%</div>
        </div>
      </div>

      {/* 科目フィルター */}
      <div className="subject-filter">
        {subjects.map(subject => (
          <button
            key={subject.name}
            className={`subject-filter-btn ${selectedSubject === subject.name ? 'active' : ''}`}
            onClick={() => setSelectedSubject(subject.name)}
          >
            <span className="subject-filter-emoji">{subject.emoji}</span>
            <span>{subject.name}</span>
          </button>
        ))}
      </div>

      {/* 検索・ソート・一括操作バー */}
      <div className="task-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="タスク名、科目、単元で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title="クリア"
            >
              ×
            </button>
          )}
        </div>

        <div className="sort-box">
          <label>並び替え:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="dueDate">期限順</option>
            <option value="subject">科目順</option>
            <option value="priority">優先度順</option>
            <option value="created">作成順（新しい順）</option>
          </select>
        </div>

        <button
          className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
          onClick={() => {
            setBulkMode(!bulkMode)
            setSelectedTasks([])
          }}
        >
          {bulkMode ? '✓ 一括モード終了' : '☑ 一括操作'}
        </button>
      </div>

      {/* 一括操作バー */}
      {bulkMode && (
        <div className="bulk-actions-bar">
          <div className="bulk-select">
            <input
              type="checkbox"
              checked={selectedTasks.length === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0}
              onChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all">
              すべて選択 ({selectedTasks.length}/{filteredAndSortedTasks.length})
            </label>
          </div>

          {selectedTasks.length > 0 && (
            <div className="bulk-buttons">
              <button className="bulk-complete-btn" onClick={handleBulkComplete}>
                ✓ 完了にする ({selectedTasks.length}件)
              </button>
              <button className="bulk-delete-btn" onClick={handleBulkDelete}>
                × 削除 ({selectedTasks.length}件)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 検索結果表示 */}
      {searchQuery && (
        <div className="search-results-info">
          🔍 "{searchQuery}" の検索結果: {filteredAndSortedTasks.length}件
        </div>
      )}

      {/* タスクリスト */}
      <div className="task-list">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="no-results">
            <p>🔍 検索結果がありません</p>
            <button onClick={() => setSearchQuery('')} className="reset-search-btn">
              検索をクリア
            </button>
          </div>
        ) : (
          filteredAndSortedTasks.map(task => (
            <div key={task.id} className={`task-item-wrapper ${bulkMode ? 'bulk-mode' : ''}`}>
              {bulkMode && (
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => toggleSelectTask(task.id)}
                  className="task-checkbox"
                />
              )}
              <TaskItem
                task={task}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onEdit={onEditTask}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TaskList
