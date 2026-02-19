// カスタム単元管理（Firestore）

import { createFirestoreService } from './firestoreCrud'

const service = createFirestoreService('customUnits', {
  orderByField: 'createdAt',
  orderDirection: 'desc',
})

export const addCustomUnit = (userId, unitData) =>
  service.add(userId, unitData)

export const getCustomUnits = (userId) =>
  service.getAll(userId)

export const updateCustomUnit = (userId, id, updates) =>
  service.update(userId, id, updates)

export const deleteCustomUnit = (userId, id) =>
  service.remove(userId, id)

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
  return `custom_${subjectPrefix}${gradeNum}_${timestamp}`
}
