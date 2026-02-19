// 学習セッション管理

import { getUnitById } from './unitsDatabase'

const STORAGE_KEY = 'sapix_study_sessions'

// 学習セッションの構造:
// {
//   id: unique ID,
//   unitId: 単元ID,
//   date: 学習日 (YYYY-MM-DD),
//   duration: 所要時間（分）,
//   masteryLevel: 理解度 (1-5),
//   notes: メモ,
//   testScore: テスト結果（任意）,
//   needsReview: 復習必要度 ('high', 'medium', 'low')
// }

// 全セッションを取得
export function getAllSessions() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

// セッションを保存
export function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

// 新しいセッションを追加
export function addStudySession(session) {
  const sessions = getAllSessions()
  const newSession = {
    id: `session_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    duration: 0,
    masteryLevel: 3,
    notes: '',
    testScore: null,
    needsReview: 'medium',
    ...session,
  }
  sessions.push(newSession)
  saveSessions(sessions)
  return newSession
}

// セッションを更新
export function updateStudySession(sessionId, updates) {
  const sessions = getAllSessions()
  const index = sessions.findIndex(s => s.id === sessionId)
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates }
    saveSessions(sessions)
    return sessions[index]
  }
  return null
}

// セッションを削除
export function deleteStudySession(sessionId) {
  const sessions = getAllSessions()
  const filtered = sessions.filter(s => s.id !== sessionId)
  saveSessions(filtered)
}

// 単元IDで セッションを取得
export function getSessionsByUnit(unitId) {
  const sessions = getAllSessions()
  return sessions
    .filter(s => s.unitId === unitId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

// 単元の学習統計を取得
export function getUnitStats(unitId) {
  const sessions = getSessionsByUnit(unitId)

  if (sessions.length === 0) {
    return {
      studyCount: 0,
      totalDuration: 0,
      averageMastery: 0,
      lastStudyDate: null,
      needsReview: false,
    }
  }

  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const averageMastery = sessions.reduce((sum, s) => sum + s.masteryLevel, 0) / sessions.length
  const lastStudyDate = sessions[0].date
  const daysSinceLastStudy = Math.floor((new Date() - new Date(lastStudyDate)) / (1000 * 60 * 60 * 24))

  // 復習が必要か判定（最後の学習から7日以上、または理解度が低い）
  const needsReview = daysSinceLastStudy > 7 || averageMastery < 3

  return {
    studyCount: sessions.length,
    totalDuration,
    averageMastery: Math.round(averageMastery * 10) / 10,
    lastStudyDate,
    daysSinceLastStudy,
    needsReview,
  }
}

// 学年全体の進捗を取得
export function getGradeProgress(subject, grade, units) {
  const studiedUnits = units.filter(unit => {
    const sessions = getSessionsByUnit(unit.id)
    return sessions.length > 0
  })

  const totalUnits = units.length
  const studiedCount = studiedUnits.length
  const percentage = totalUnits > 0 ? Math.round((studiedCount / totalUnits) * 100) : 0

  return {
    totalUnits,
    studiedCount,
    unstudiedCount: totalUnits - studiedCount,
    percentage,
  }
}

// 復習が必要な単元を取得
export function getUnitsNeedingReview(subject, grade, units) {
  return units.filter(unit => {
    const stats = getUnitStats(unit.id)
    return stats.needsReview && stats.studyCount > 0
  })
}

// 学習時間の統計（期間指定）
export function getStudyTimeStats(startDate, endDate) {
  const sessions = getAllSessions()
  const filtered = sessions.filter(s => {
    const sessionDate = new Date(s.date)
    return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate)
  })

  const totalDuration = filtered.reduce((sum, s) => sum + (s.duration || 0), 0)
  const bySubject = {}

  filtered.forEach(session => {
    const unit = getUnitById(session.unitId)
    if (unit) {
      if (!bySubject[unit.subject]) {
        bySubject[unit.subject] = 0
      }
      bySubject[unit.subject] += session.duration || 0
    }
  })

  return {
    totalDuration,
    sessionCount: filtered.length,
    bySubject,
  }
}

