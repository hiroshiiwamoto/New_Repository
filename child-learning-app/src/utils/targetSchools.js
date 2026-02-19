// 志望校管理（Firestore）

import { createFirestoreService } from './firestoreCrud'

const service = createFirestoreService('targetSchoolsDetail', {
  orderByField: 'priority',
  orderDirection: 'asc',
  beforeAdd: (data) => ({
    name: data.name || '',
    examDate: data.examDate || '',
    examDate2: data.examDate2 || '',
    applicationDeadline: data.applicationDeadline || '',
    resultDate: data.resultDate || '',
    enrollmentDeadline: data.enrollmentDeadline || '',
    targetDeviation: data.targetDeviation || '',
    passScore: data.passScore || '',
    maxScore: data.maxScore || '',
    examSubjects: data.examSubjects || ['国語', '算数', '理科', '社会'],
    priority: data.priority || 1,
    notes: data.notes || '',
  }),
})

export const addTargetSchool = (userId, schoolData) =>
  service.add(userId, schoolData)

export const getAllTargetSchools = (userId) =>
  service.getAll(userId)

export const updateTargetSchool = (userId, id, updates) =>
  service.update(userId, id, updates)

export const deleteTargetSchool = (userId, id) =>
  service.remove(userId, id)

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
