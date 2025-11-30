import { useState, useEffect } from 'react'
import './App.css'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import Dashboard from './components/Dashboard'
import WeeklyCalendar from './components/WeeklyCalendar'

function App() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all') // all, active, completed
  const [view, setView] = useState('list') // list, calendar

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('learningTasks')
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }, [])

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('learningTasks', JSON.stringify(tasks))
  }, [tasks])

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

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed
    if (filter === 'completed') return task.completed
    return true
  })

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 子供の学習アプリ</h1>
        <p>がんばって学習しよう！</p>
      </header>

      <Dashboard tasks={tasks} />

      <div className="container">
        <TaskForm onAddTask={addTask} />

        <div className="view-switcher">
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            📋 リスト
          </button>
          <button
            className={view === 'calendar' ? 'active' : ''}
            onClick={() => setView('calendar')}
          >
            📅 カレンダー
          </button>
        </div>

        {view === 'calendar' ? (
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
