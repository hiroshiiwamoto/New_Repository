import { useState, useEffect, useRef } from 'react'
import './App.css'
import './utils/toast.css'
import Auth from './components/Auth'
import TodayAndWeekView from './components/TodayAndWeekView'
import TaskForm from './components/TaskForm'
import ScheduleView from './components/ScheduleView'
import UnitAnalysisView from './components/UnitAnalysisView'
import PastPaperView from './components/PastPaperView'
import TestScoreView from './components/TestScoreView'
import GradesView from './components/GradesView'
import SapixTextView from './components/SapixTextView'
import {
  addTaskToFirestore,
  updateTaskInFirestore,
  deleteTaskFromFirestore,
  bulkDeleteTasksFromFirestore,
  subscribeToTasks,
  migrateLocalStorageToFirestore,
} from './utils/firestore'
import {
  getCustomUnits,
  addCustomUnit as addCustomUnitToFirestore,
  updateCustomUnit as updateCustomUnitInFirestore,
  deleteCustomUnit as deleteCustomUnitFromFirestore,
} from './utils/customUnits'
import { toast } from './utils/toast'

function App() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('schedule') // schedule, dashboard, pastpaper, testscore, sapixtext, edit
  const [previousView, setPreviousView] = useState('schedule') // Store previous view for returning after edit
  const [editingTask, setEditingTask] = useState(null)
  const [customUnits, setCustomUnits] = useState([]) // カスタム単元
  const taskFormRef = useRef(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [migrated, setMigrated] = useState(false)

  // Firestore同期: ユーザーがログインしたら、タスクをリアルタイムで取得
  useEffect(() => {
    if (!user) {
      // ユーザーがログインしていない場合は、localStorageから読み込む
      const savedTasks = localStorage.getItem('sapixTasks')
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
      return
    }

    // localStorageからFirestoreへの移行（初回のみ）
    // CLEANUP_KEYがある場合はすでにクリーンアップ済みなので移行しない
    const CLEANUP_KEY = 'all_tasks_cleared_20260217'
    if (!migrated) {
      const hasLocalData = localStorage.getItem('sapixTasks') || localStorage.getItem('targetSchools')
      if (hasLocalData && !localStorage.getItem(CLEANUP_KEY)) {
        // まだクリーンアップ前の場合のみFirestoreへ移行し、移行後はlocalStorageを削除
        migrateLocalStorageToFirestore(user.uid).then(() => {
          localStorage.removeItem('sapixTasks')
          setMigrated(true)
        })
      } else {
        // クリーンアップ済み、またはローカルデータなし → localStorageのタスクを削除して終了
        localStorage.removeItem('sapixTasks')
        setMigrated(true)
      }
    }

    // カスタム単元を取得
    getCustomUnits(user.uid).then(result => {
      if (result.success) {
        setCustomUnits(result.data)
      }
    })

    // タスクのリアルタイム同期を開始
    const unsubscribe = subscribeToTasks(user.uid, (firestoreTasks) => {
      if (!localStorage.getItem(CLEANUP_KEY)) {
        localStorage.setItem(CLEANUP_KEY, 'true')
        if (firestoreTasks.length > 0) {
          const ids = firestoreTasks.map(t => t.id)
          bulkDeleteTasksFromFirestore(user.uid, ids)
        }
        return
      }
      setTasks(firestoreTasks)
    })

    return () => unsubscribe()
  }, [user, migrated])


  const addTask = async (task) => {
    const newTask = {
      id: Date.now(),
      ...task,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    if (user) {
      // Firestoreに保存
      await addTaskToFirestore(user.uid, newTask)
    } else {
      // ユーザーがログインしていない場合は、localStorageに保存
      const updatedTasks = [...tasks, newTask]
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
    setEditingTask(null)
  }

  const updateTask = async (id, updates) => {
    if (user) {
      // Firestoreで更新
      await updateTaskInFirestore(user.uid, id, updates)
    } else {
      // ユーザーがログインしていない場合は、localStorageで更新
      const updatedTasks = tasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
      )
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
    setEditingTask(null)
    // Return to previous view after updating
    setView(previousView)
  }

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (user) {
      // Firestoreで更新
      await updateTaskInFirestore(user.uid, id, { completed: !task.completed })
    } else {
      // ユーザーがログインしていない場合は、localStorageで更新
      const updatedTasks = tasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const deleteTask = async (id) => {
    if (user) {
      // Firestoreから削除
      await deleteTaskFromFirestore(user.uid, id)
    } else {
      // ユーザーがログインしていない場合は、localStorageから削除
      const updatedTasks = tasks.filter(task => task.id !== id)
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const bulkDeleteTasks = async (ids) => {
    if (user) {
      // Firestoreから一括削除
      await bulkDeleteTasksFromFirestore(user.uid, ids)
    } else {
      // ユーザーがログインしていない場合は、localStorageから削除
      const updatedTasks = tasks.filter(task => !ids.includes(task.id))
      setTasks(updatedTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(updatedTasks))
    }
  }

  const handleEditTask = (task) => {
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

  const addCustomUnit = async (unitData) => {
    if (!user) {
      toast.error('カスタム単元を追加するにはログインが必要です')
      return { success: false }
    }

    const result = await addCustomUnitToFirestore(user.uid, unitData)

    if (result.success) {
      // カスタム単元リストを更新
      const newCustomUnits = [result.data, ...customUnits]
      setCustomUnits(newCustomUnits)
      return { success: true, data: result.data }
    } else {
      toast.error('カスタム単元の追加に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const updateCustomUnit = async (id, updates) => {
    if (!user) {
      toast.error('カスタム単元を更新するにはログインが必要です')
      return { success: false }
    }

    const result = await updateCustomUnitInFirestore(user.uid, id, updates)

    if (result.success) {
      // カスタム単元リストを更新
      const updatedCustomUnits = customUnits.map(unit =>
        unit.id === id
          ? { ...unit, ...updates }
          : unit
      )
      setCustomUnits(updatedCustomUnits)
      return { success: true }
    } else {
      toast.error('カスタム単元の更新に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const deleteCustomUnit = async (id) => {
    if (!user) {
      toast.error('カスタム単元を削除するにはログインが必要です')
      return { success: false }
    }

    const result = await deleteCustomUnitFromFirestore(user.uid, id)

    if (result.success) {
      // カスタム単元リストから削除
      const filteredCustomUnits = customUnits.filter(unit => unit.id !== id)
      setCustomUnits(filteredCustomUnits)
      return { success: true }
    } else {
      toast.error('カスタム単元の削除に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const handleAuthChange = (currentUser) => {
    setUser(currentUser)
  }

  // ログインしていない場合は、Authコンポーネントを表示
  if (!user) {
    return <Auth onAuthChange={handleAuthChange} />
  }

  return (
    <div className="app sapix-theme">
      <header className="app-header">
        <div className="header-content">
          <h1>📘 SAPIX 中学受験 学習管理</h1>
          <Auth onAuthChange={handleAuthChange} />
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
              customUnits={customUnits}
              onAddCustomUnit={addCustomUnit}
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

            {/* 2. ビュー切り替え */}
            <div className="view-switcher">
          <button
            className={view === 'schedule' ? 'active' : ''}
            onClick={() => setView('schedule')}
          >
            📅 今週のミッション
          </button>
          <button
            className={view === 'sapixtext' ? 'active' : ''}
            onClick={() => setView('sapixtext')}
          >
            📘 授業・教材
          </button>
          <button
            className={view === 'pastpaper' ? 'active' : ''}
            onClick={() => setView('pastpaper')}
          >
            📄 過去問
          </button>
          <button
            className={view === 'grades' ? 'active' : ''}
            onClick={() => setView('grades')}
          >
            📈 成績
          </button>
          <button
            className={view === 'testscore' ? 'active' : ''}
            onClick={() => setView('testscore')}
          >
            📋 テスト分析
          </button>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            🗺️ 弱点マップ
          </button>
        </div>

        {view === 'schedule' ? (
          <ScheduleView
            tasks={tasks}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onBulkDeleteTasks={bulkDeleteTasks}
            onEditTask={handleEditTask}
          />
        ) : view === 'dashboard' ? (
          <UnitAnalysisView
            tasks={tasks}
          />
        ) : view === 'pastpaper' ? (
          <PastPaperView
            tasks={tasks}
            user={user}
            customUnits={customUnits}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        ) : view === 'grades' ? (
          <GradesView
            user={user}
          />
        ) : view === 'testscore' ? (
          <TestScoreView
            user={user}
          />
        ) : view === 'sapixtext' ? (
          <SapixTextView
            user={user}
          />
        ) : null}
          </>
        )}

        {/* 3. タスク追加フォーム（一番下） - show only on schedule view */}
        {view === 'schedule' && (
          <div ref={taskFormRef}>
            {!showTaskForm ? (
              <button
                className="add-task-toggle-btn"
                onClick={() => setShowTaskForm(true)}
              >
                ＋ 学習タスクを追加
              </button>
            ) : (
              <>
                <button
                  className="add-task-toggle-btn close"
                  onClick={() => setShowTaskForm(false)}
                >
                  ✕ 閉じる
                </button>
                <TaskForm
                  onAddTask={(task) => {
                    addTask(task)
                    setShowTaskForm(false)
                  }}
                  onUpdateTask={updateTask}
                  editingTask={editingTask}
                  onCancelEdit={handleCancelEdit}
                  customUnits={customUnits}
                  onAddCustomUnit={addCustomUnit}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
