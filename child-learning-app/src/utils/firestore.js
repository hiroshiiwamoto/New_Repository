import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'

// ユーザーのタスクコレクションへの参照を取得
const getUserTasksCollection = (userId) => {
  return collection(db, 'users', userId, 'tasks')
}

// ユーザーのドキュメントへの参照を取得
const getUserDoc = (userId) => {
  return doc(db, 'users', userId)
}

// タスクを追加
export const addTaskToFirestore = async (userId, task) => {
  try {
    const taskRef = doc(getUserTasksCollection(userId), task.id.toString())
    await setDoc(taskRef, task)
    return { success: true }
  } catch (error) {
    console.error('Error adding task:', error)
    return { success: false, error }
  }
}

// タスクを更新
export const updateTaskInFirestore = async (userId, taskId, updates) => {
  try {
    const taskRef = doc(getUserTasksCollection(userId), taskId.toString())
    await updateDoc(taskRef, updates)
    return { success: true }
  } catch (error) {
    console.error('Error updating task:', error)
    return { success: false, error }
  }
}

// タスクを削除
export const deleteTaskFromFirestore = async (userId, taskId) => {
  try {
    const taskRef = doc(getUserTasksCollection(userId), taskId.toString())
    await deleteDoc(taskRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting task:', error)
    return { success: false, error }
  }
}

// 複数のタスクを削除
export const bulkDeleteTasksFromFirestore = async (userId, taskIds) => {
  try {
    const deletePromises = taskIds.map(taskId =>
      deleteDoc(doc(getUserTasksCollection(userId), taskId.toString()))
    )
    await Promise.all(deletePromises)
    return { success: true }
  } catch (error) {
    console.error('Error bulk deleting tasks:', error)
    return { success: false, error }
  }
}

// タスクのリアルタイムリスナーを設定
export const subscribeToTasks = (userId, callback) => {
  const tasksQuery = query(
    getUserTasksCollection(userId),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const tasks = []
      snapshot.forEach((doc) => {
        tasks.push({ ...doc.data(), id: doc.id })
      })
      callback(tasks)
    },
    (error) => {
      console.error('Error fetching tasks:', error)
      callback([])
    }
  )
}

// 目標学校を保存
export const saveTargetSchools = async (userId, schools) => {
  try {
    const userRef = getUserDoc(userId)
    await setDoc(userRef, { targetSchools: schools }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Error saving target schools:', error)
    return { success: false, error }
  }
}

// 目標学校を取得
export const getTargetSchools = async (userId) => {
  try {
    const userRef = getUserDoc(userId)
    const docSnap = await getDoc(userRef)
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data().targetSchools || [] }
    }
    return { success: true, data: [] }
  } catch (error) {
    console.error('Error getting target schools:', error)
    return { success: false, error, data: [] }
  }
}

// localStorageからFirestoreへデータを移行
export const migrateLocalStorageToFirestore = async (userId) => {
  try {
    // タスクを移行
    const savedTasks = localStorage.getItem('sapixTasks')
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks)
      const uploadPromises = tasks.map(task =>
        addTaskToFirestore(userId, task)
      )
      await Promise.all(uploadPromises)
    }

    // 目標学校を移行
    const savedSchools = localStorage.getItem('targetSchools')
    if (savedSchools) {
      const schools = JSON.parse(savedSchools)
      await saveTargetSchools(userId, schools)
    }

    return { success: true }
  } catch (error) {
    console.error('Error migrating data:', error)
    return { success: false, error }
  }
}
