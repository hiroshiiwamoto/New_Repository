// カスタム単元管理（Firestore）

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
 * カスタム単元を追加
 */
export async function addCustomUnit(userId, unitData) {
  try {
    const customUnitsRef = collection(db, 'users', userId, 'customUnits')

    const newUnit = {
      ...unitData,
      createdAt: new Date().toISOString(),
    }

    const docRef = await addDoc(customUnitsRef, newUnit)

    return {
      success: true,
      data: { id: docRef.id, ...newUnit }
    }
  } catch (error) {
    console.error('Error adding custom unit:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * カスタム単元を取得
 */
export async function getCustomUnits(userId) {
  try {
    const customUnitsRef = collection(db, 'users', userId, 'customUnits')
    const q = query(customUnitsRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)

    const units = []
    querySnapshot.forEach((doc) => {
      units.push({
        firestoreId: doc.id, // Firestoreのドキュメント ID
        ...doc.data()
      })
    })

    return {
      success: true,
      data: units
    }
  } catch (error) {
    console.error('Error getting custom units:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

/**
 * カスタム単元を更新（将来のフェーズ2用）
 */
export async function updateCustomUnit(userId, firestoreId, updates) {
  try {
    const unitRef = doc(db, 'users', userId, 'customUnits', firestoreId)
    await updateDoc(unitRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating custom unit:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * カスタム単元を削除（将来のフェーズ2用）
 */
export async function deleteCustomUnit(userId, firestoreId) {
  try {
    const unitRef = doc(db, 'users', userId, 'customUnits', firestoreId)
    await deleteDoc(unitRef)

    return { success: true }
  } catch (error) {
    console.error('Error deleting custom unit:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * カスタム単元IDを生成
 */
export function generateCustomUnitId(subject, grade, name) {
  const timestamp = Date.now()
  const subjectPrefix = {
    '算数': 'math',
    '国語': 'lang',
    '理科': 'sci',
    '社会': 'soc'
  }[subject] || 'custom'

  const gradeNum = grade.replace('年生', '')

  // カスタム単元であることを明示
  return `custom_${subjectPrefix}${gradeNum}_${timestamp}`
}
