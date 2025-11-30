import { useState, useEffect } from 'react'
import './App.css'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import Dashboard from './components/Dashboard'
import WeeklyCalendar from './components/WeeklyCalendar'
import SubjectView from './components/SubjectView'
import { generateSAPIXSchedule } from './utils/sampleData'

function App() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all') // all, active, completed
  const [view, setView] = useState('subject') // subject, calendar, list
  const [targetSchools, setTargetSchools] = useState([
    { name: '開成中学校', deviation: 71, priority: 1 },
    { name: '筑波大学附属駒場中学校', deviation: 78, priority: 1 },
  ])

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
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const loadSampleSchedule = () => {
    if (window.confirm('SAPIX新四年生の1月～3月のサンプルスケジュール（80タスク以上）を読み込みますか？\n既存のタスクは削除されます。')) {
      const sampleTasks = generateSAPIXSchedule()
      setTasks(sampleTasks)
      alert(`✅ ${sampleTasks.length}個のタスクを読み込みました！`)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

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

      <Dashboard tasks={tasks} targetSchools={targetSchools} />

      <div className="container">
        <TaskForm onAddTask={addTask} />

        {tasks.length === 0 && (
          <div className="sample-schedule-prompt">
            <p>📅 サンプルスケジュールを読み込んで、すぐに使い始められます！</p>
            <button onClick={loadSampleSchedule} className="load-sample-btn">
              🎓 SAPIX新四年生スケジュールを読み込む（1月～3月）
            </button>
          </div>
        )}

        <div className="view-switcher">
          <button
            className={view === 'subject' ? 'active' : ''}
            onClick={() => setView('subject')}
          >
            📚 科目別
          </button>
          <button
            className={view === 'calendar' ? 'active' : ''}
            onClick={() => setView('calendar')}
          >
            📅 カレンダー
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            📋 リスト
          </button>
        </div>

        {view === 'subject' ? (
          <SubjectView
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        ) : view === 'calendar' ? (
          <WeeklyCalendar
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        ) : (
          <>
            <div className="filter-buttons">
              <button
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                すべて
              </button>
              <button
                className={filter === 'active' ? 'active' : ''}
                onClick={() => setFilter('active')}
              >
                未完了
              </button>
              <button
                className={filter === 'completed' ? 'active' : ''}
                onClick={() => setFilter('completed')}
              >
                完了
              </button>
            </div>

            <TaskList
              tasks={filteredTasks}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default App
