// 志望校管理（Firestore）

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * 志望校を追加
 */
export async function addTargetSchool(userId, schoolData) {
  try {
    const schoolsRef = collection(db, 'users', userId, 'targetSchoolsDetail')

    const newSchool = {
      name: schoolData.name || '',
      examDate: schoolData.examDate || '',
      examDate2: schoolData.examDate2 || '',
      applicationDeadline: schoolData.applicationDeadline || '',
      resultDate: schoolData.resultDate || '',
      enrollmentDeadline: schoolData.enrollmentDeadline || '',
      targetDeviation: schoolData.targetDeviation || '',
      passScore: schoolData.passScore || '',
      maxScore: schoolData.maxScore || '',
      examSubjects: schoolData.examSubjects || ['国語', '算数', '理科', '社会'],
      priority: schoolData.priority || 1,
      notes: schoolData.notes || '',
      createdAt: new Date().toISOString(),
    }

    const docRef = await addDoc(schoolsRef, newSchool)

    return {
      success: true,
      data: { firestoreId: docRef.id, ...newSchool }
    }
  } catch (error) {
    console.error('Error adding target school:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 全ての志望校を取得
 */
export async function getAllTargetSchools(userId) {
  try {
    const schoolsRef = collection(db, 'users', userId, 'targetSchoolsDetail')
    const q = query(schoolsRef, orderBy('priority', 'asc'))
    const querySnapshot = await getDocs(q)

    const schools = []
    querySnapshot.forEach((doc) => {
      schools.push({
        firestoreId: doc.id,
        ...doc.data()
      })
    })

    return { success: true, data: schools }
  } catch (error) {
    console.error('Error getting target schools:', error)
    return { success: false, error: error.message, data: [] }
  }
}

/**
 * 志望校を更新
 */
export async function updateTargetSchool(userId, firestoreId, updates) {
  try {
    const schoolRef = doc(db, 'users', userId, 'targetSchoolsDetail', firestoreId)
    await updateDoc(schoolRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating target school:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 志望校を削除
 */
export async function deleteTargetSchool(userId, firestoreId) {
  try {
    const schoolRef = doc(db, 'users', userId, 'targetSchoolsDetail', firestoreId)
    await deleteDoc(schoolRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting target school:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 受験日までの残り日数を計算
 */
export function getDaysUntilExam(examDate) {
  if (!examDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  const diff = exam - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
