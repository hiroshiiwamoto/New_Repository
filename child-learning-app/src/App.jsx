import { useState, useEffect, useRef } from 'react'
import './App.css'
import Auth from './components/Auth'
import TodayAndWeekView from './components/TodayAndWeekView'
import TaskForm from './components/TaskForm'
import TaskList from './components/TaskList'
import WeeklyCalendar from './components/WeeklyCalendar'
import UnitDashboard from './components/UnitDashboard'
import Analytics from './components/Analytics'
import UnitManager from './components/UnitManager'
import PastPaperView from './components/PastPaperView'
import { generateSAPIXScheduleByGrade } from './utils/sampleData'
import {
  addTaskToFirestore,
  updateTaskInFirestore,
  deleteTaskFromFirestore,
  bulkDeleteTasksFromFirestore,
  subscribeToTasks,
  saveTargetSchools as saveTargetSchoolsToFirestore,
  getTargetSchools as getTargetSchoolsFromFirestore,
  migrateLocalStorageToFirestore,
} from './utils/firestore'
import {
  getCustomUnits,
  addCustomUnit as addCustomUnitToFirestore,
  updateCustomUnit as updateCustomUnitInFirestore,
  deleteCustomUnit as deleteCustomUnitFromFirestore,
} from './utils/customUnits'

function App() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('calendar') // subject, calendar, analytics, tasks, edit, unitManager, pastpaper
  const [previousView, setPreviousView] = useState('calendar') // Store previous view for returning after edit
  const [editingTask, setEditingTask] = useState(null)
  const [targetSchools, setTargetSchools] = useState([])
  const [customUnits, setCustomUnits] = useState([]) // カスタム単元
  const taskFormRef = useRef(null)
  const [migrated, setMigrated] = useState(false)

  // Firestore同期: ユーザーがログインしたら、タスクをリアルタイムで取得
  useEffect(() => {
    if (!user) {
      // ユーザーがログインしていない場合は、localStorageから読み込む
      const savedTasks = localStorage.getItem('sapixTasks')
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
      const savedSchools = localStorage.getItem('targetSchools')
      if (savedSchools) {
        setTargetSchools(JSON.parse(savedSchools))
      }
      return
    }

    // localStorageからFirestoreへの移行（初回のみ）
    if (!migrated) {
      const hasLocalData = localStorage.getItem('sapixTasks') || localStorage.getItem('targetSchools')
      if (hasLocalData) {
        migrateLocalStorageToFirestore(user.uid).then(() => {
          console.log('✅ LocalStorageからFirestoreへデータを移行しました')
          setMigrated(true)
        })
      } else {
        setMigrated(true)
      }
    }

    // 目標学校を取得
    getTargetSchoolsFromFirestore(user.uid).then(result => {
      if (result.success && result.data.length > 0) {
        setTargetSchools(result.data)
      }
    })

    // カスタム単元を取得
    getCustomUnits(user.uid).then(result => {
      console.log('🔄 App.jsx - Firestoreからカスタム単元を取得:', result)
      if (result.success) {
        console.log('🔄 App.jsx - カスタム単元をセット:', result.data)
        setCustomUnits(result.data)
      } else {
        console.log('🔄 App.jsx - カスタム単元の取得に失敗:', result.error)
      }
    })

    // タスクのリアルタイム同期を開始
    const unsubscribe = subscribeToTasks(user.uid, (firestoreTasks) => {
      setTasks(firestoreTasks)
    })

    return () => unsubscribe()
  }, [user, migrated])

  // 目標学校が変更されたらFirestoreに保存
  useEffect(() => {
    if (user) {
      saveTargetSchoolsToFirestore(user.uid, targetSchools)
    } else {
      // ユーザーがログインしていない場合は、localStorageに保存
      localStorage.setItem('targetSchools', JSON.stringify(targetSchools))
    }
  }, [targetSchools, user])


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

  const loadSampleSchedule = async () => {
    const grade = window.prompt(
      'どの学年のサンプルスケジュールを読み込みますか？\n\n3 = 新三年生（1月～3月）\n4 = 新四年生（1月～3月）\n\n既存のタスクは削除されます。',
      '4'
    )

    if (!grade) return // キャンセルされた場合

    let selectedGrade = '4年生' // デフォルト
    if (grade === '3') {
      selectedGrade = '3年生'
    } else if (grade === '4') {
      selectedGrade = '4年生'
    } else {
      alert('❌ 3または4を入力してください')
      return
    }

    const sampleTasks = generateSAPIXScheduleByGrade(selectedGrade)

    if (user) {
      // 既存のタスクを削除してから新しいタスクを追加
      const taskIds = tasks.map(t => t.id)
      if (taskIds.length > 0) {
        await bulkDeleteTasksFromFirestore(user.uid, taskIds)
      }

      // サンプルタスクをFirestoreに追加
      const uploadPromises = sampleTasks.map(task =>
        addTaskToFirestore(user.uid, task)
      )
      await Promise.all(uploadPromises)
    } else {
      // ユーザーがログインしていない場合は、localStorageに保存
      setTasks(sampleTasks)
      localStorage.setItem('sapixTasks', JSON.stringify(sampleTasks))
    }

    alert(`✅ ${selectedGrade}のサンプルスケジュール（${sampleTasks.length}個のタスク）を読み込みました！`)
  }

  const addCustomUnit = async (unitData) => {
    if (!user) {
      alert('❌ カスタム単元を追加するにはログインが必要です')
      return { success: false }
    }

    console.log('📦 App.jsx - カスタム単元を追加:', unitData)
    console.log('📦 App.jsx - 現在のcustomUnits:', customUnits)

    const result = await addCustomUnitToFirestore(user.uid, unitData)

    console.log('📦 App.jsx - Firestore追加結果:', result)

    if (result.success) {
      // カスタム単元リストを更新
      const newCustomUnits = [result.data, ...customUnits]
      console.log('📦 App.jsx - 更新後のcustomUnits:', newCustomUnits)
      setCustomUnits(newCustomUnits)
      return { success: true, data: result.data }
    } else {
      alert('❌ カスタム単元の追加に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const updateCustomUnit = async (firestoreId, updates) => {
    if (!user) {
      alert('❌ カスタム単元を更新するにはログインが必要です')
      return { success: false }
    }

    console.log('📝 App.jsx - カスタム単元を更新:', firestoreId, updates)

    const result = await updateCustomUnitInFirestore(user.uid, firestoreId, updates)

    console.log('📝 App.jsx - Firestore更新結果:', result)

    if (result.success) {
      // カスタム単元リストを更新
      const updatedCustomUnits = customUnits.map(unit =>
        unit.firestoreId === firestoreId
          ? { ...unit, ...updates }
          : unit
      )
      console.log('📝 App.jsx - 更新後のcustomUnits:', updatedCustomUnits)
      setCustomUnits(updatedCustomUnits)
      return { success: true }
    } else {
      alert('❌ カスタム単元の更新に失敗しました: ' + result.error)
      return { success: false, error: result.error }
    }
  }

  const deleteCustomUnit = async (firestoreId) => {
    if (!user) {
      alert('❌ カスタム単元を削除するにはログインが必要です')
      return { success: false }
    }

    console.log('🗑️ App.jsx - カスタム単元を削除:', firestoreId)

    const result = await deleteCustomUnitFromFirestore(user.uid, firestoreId)

    console.log('🗑️ App.jsx - Firestore削除結果:', result)

    if (result.success) {
      // カスタム単元リストから削除
      const filteredCustomUnits = customUnits.filter(unit => unit.firestoreId !== firestoreId)
      console.log('🗑️ App.jsx - 削除後のcustomUnits:', filteredCustomUnits)
      setCustomUnits(filteredCustomUnits)
      return { success: true }
    } else {
      alert('❌ カスタム単元の削除に失敗しました: ' + result.error)
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

            {tasks.length === 0 && (
              <div className="sample-schedule-prompt">
                <p>📅 サンプルスケジュールを読み込んで、すぐに使い始められます！</p>
                <button onClick={loadSampleSchedule} className="load-sample-btn">
                  🎓 SAPIXサンプルスケジュールを読み込む（新3年 / 新4年）
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
          <button
            className={view === 'unitManager' ? 'active' : ''}
            onClick={() => setView('unitManager')}
          >
            📚 単元管理
          </button>
          <button
            className={view === 'pastpaper' ? 'active' : ''}
            onClick={() => setView('pastpaper')}
          >
            📄 過去問
          </button>
        </div>

        {view === 'subject' ? (
          <UnitDashboard
            tasks={tasks}
            onEditTask={handleEditTask}
            customUnits={customUnits}
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
        ) : view === 'unitManager' ? (
          <UnitManager
            customUnits={customUnits}
            onUpdateUnit={updateCustomUnit}
            onDeleteUnit={deleteCustomUnit}
          />
        ) : view === 'pastpaper' ? (
          <PastPaperView
            tasks={tasks}
            user={user}
            customUnits={customUnits}
          />
        ) : null}
          </>
        )}

        {/* 3. タスク追加フォーム（一番下） - only show when not in edit view, unitManager view, or pastpaper view */}
        {view !== 'edit' && view !== 'unitManager' && view !== 'pastpaper' && (
          <div ref={taskFormRef}>
            <TaskForm
              onAddTask={addTask}
              onUpdateTask={updateTask}
              editingTask={editingTask}
              onCancelEdit={handleCancelEdit}
              customUnits={customUnits}
              onAddCustomUnit={addCustomUnit}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
