import { useState, useEffect, useRef } from 'react'
import './App.css'
import TodayAndWeekView from './components/TodayAndWeekView'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import WeeklyCalendar from './components/WeeklyCalendar'
import UnitDashboard from './components/UnitDashboard'
import Analytics from './components/Analytics'
import { generateSAPIXSchedule } from './utils/sampleData'

function App() {
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('calendar') // subject, calendar, analytics, tasks, edit
  const [previousView, setPreviousView] = useState('calendar') // Store previous view for returning after edit
  const [editingTask, setEditingTask] = useState(null)
  const [targetSchools, setTargetSchools] = useState([
    { name: '開成中学校', deviation: 71, priority: 1 },
    { name: '筑波大学附属駒場中学校', deviation: 78, priority: 1 },
  ])
  const taskFormRef = useRef(null)

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('sapixTasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
    const savedSchools = localStorage.getItem('targetSchools')
    if (savedSchools) {
      setTargetSchools(JSON.parse(savedSchools))
    }
  }, [])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sapixTasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('targetSchools', JSON.stringify(targetSchools))
  }, [targetSchools])


  const addTask = (task) => {
    const newTask = {
      id: Date.now(),
      ...task,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setTasks([...tasks, newTask])
    setEditingTask(null)
  }

  const updateTask = (id, updates) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ))
    setEditingTask(null)
    // Return to previous view after updating
    setView(previousView)
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const bulkDeleteTasks = (ids) => {
    setTasks(tasks.filter(task => !ids.includes(task.id)))
  }

  const handleEditTask = (task) => {
    console.log('✏️ Editing task:', task.title)
    // Save current view to return to later
    setPreviousView(view)
    // Switch to edit view
    setView('edit')
    setEditingTask(task)
  }

  const handleCancelEdit = () => {
    setEditingTask(null)
    // Return to previous view
    setView(previousView)
  }

  const loadSampleSchedule = () => {
    if (window.confirm('SAPIX新四年生の1月～3月のサンプルスケジュール（80タスク以上）を読み込みますか？\n既存のタスクは削除されます。')) {
      const sampleTasks = generateSAPIXSchedule()
      setTasks(sampleTasks)
      alert(`✅ ${sampleTasks.length}個のタスクを読み込みました！`)
    }
  }

  return (
    <div className="app sapix-theme">
      <header className="app-header">
        <div className="header-content">
          <h1>📘 SAPIX 中学受験 学習管理</h1>
          <div className="target-schools">
            {targetSchools.filter(s => s.priority === 1).map((school, idx) => (
              <span key={idx} className="target-badge">{school.name}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="container">
        {/* Edit view - show only the form */}
        {view === 'edit' ? (
          <div className="edit-view">
            <div className="edit-header">
              <h2>✏️ タスク編集</h2>
              <button onClick={handleCancelEdit} className="back-btn">
                ← 戻る
              </button>
            </div>
            <TaskForm
              onAddTask={addTask}
              onUpdateTask={updateTask}
              editingTask={editingTask}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        ) : (
          <>
            {/* 1. 今日と今週のタスク（最優先） */}
            <TodayAndWeekView
              tasks={tasks}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onEditTask={handleEditTask}
            />

            {tasks.length === 0 && (
              <div className="sample-schedule-prompt">
                <p>📅 サンプルスケジュールを読み込んで、すぐに使い始められます！</p>
                <button onClick={loadSampleSchedule} className="load-sample-btn">
                  🎓 SAPIX新四年生スケジュールを読み込む（1月～3月）
                </button>
              </div>
            )}

            {/* 2. ビュー切り替え */}
            <div className="view-switcher">
          <button
            className={view === 'subject' ? 'active' : ''}
            onClick={() => setView('subject')}
          >
            📊 ダッシュボード
          </button>
          <button
            className={view === 'analytics' ? 'active' : ''}
            onClick={() => setView('analytics')}
          >
            📈 分析
          </button>
          <button
            className={view === 'calendar' ? 'active' : ''}
            onClick={() => setView('calendar')}
          >
            📅 カレンダー
          </button>
          <button
            className={view === 'tasks' ? 'active' : ''}
            onClick={() => setView('tasks')}
          >
            📋 タスク
          </button>
        </div>

        {view === 'subject' ? (
          <UnitDashboard
            tasks={tasks}
            onEditTask={handleEditTask}
          />
        ) : view === 'analytics' ? (
          <Analytics tasks={tasks} />
        ) : view === 'calendar' ? (
          <WeeklyCalendar
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onEditTask={handleEditTask}
          />
        ) : view === 'tasks' ? (
          <TaskList
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onBulkDeleteTasks={bulkDeleteTasks}
            onEditTask={handleEditTask}
          />
        ) : null}
          </>
        )}

        {/* 3. タスク追加フォーム（一番下） - only show when not in edit view */}
        {view !== 'edit' && (
          <div ref={taskFormRef}>
            <TaskForm
              onAddTask={addTask}
              onUpdateTask={updateTask}
              editingTask={editingTask}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
