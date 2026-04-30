/**
 * dailyTaskEngine.js — タスク自動生成エンジン
 *
 * 4つのデータソースから優先度付き学習タスクを自動生成する純粋関数。
 * Layer 1（テキスト評価）だけでも動作し、Layer 2/3 のデータが増えるほど精度が上がる。
 */

import { parseLocalDate } from './dateUtils'

// ── 定数 ──────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** ミス種別の深刻度マップ */
const SEVERITY_MAP = {
  understanding: 20,
  not_studied:   15,
  careless:       5,
}

/** スコアリング重み */
const W_FORGETTING = 0.30
const W_TEST       = 0.35
const W_WEAKNESS   = 0.25
const W_JITTER     = 0.10

/** 科目あたり最大タスク数 */
const MAX_PER_SUBJECT = 2

/** 返却タスク上限 */
const MAX_TASKS = 5

// ── ヘルパー ──────────────────────────────────

/** Firestore timestamp / Date / ISO string → ms */
function toMs(ts) {
  if (!ts) return 0
  if (ts.toMillis) return ts.toMillis()
  if (ts.seconds) return ts.seconds * 1000
  return new Date(ts).getTime()
}

/** 今日の 0:00 を ms で返す */
function todayStartMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 昨日の日付文字列 YYYY-MM-DD */
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── 個別スコア計算 ──────────────────────────────

/**
 * forgettingScore（忘却スコア）0-100
 * R = e^(-t/S),  S = max(1, reviewCount * 2 + 3)
 */
function calcForgettingScore(lastUpdatedMs, logCount) {
  if (!lastUpdatedMs) return 50 // データなし→中程度
  const daysSince = (Date.now() - lastUpdatedMs) / MS_PER_DAY
  const memoryStrength = Math.max(1, logCount * 2 + 3)
  const retention = Math.exp(-daysSince / memoryStrength)
  return (1 - retention) * 100
}

/**
 * testUrgency（テスト緊急度）0-100
 * scheduledテストの coveredUnitIds にこの単元が含まれるか確認
 */
function calcTestUrgency(unitId, currentScore, testScores) {
  const today = todayStartMs()
  let maxUrgency = 0
  let nearestTestName = ''
  let nearestDaysUntil = Infinity

  for (const test of testScores) {
    if (test.status !== 'scheduled') continue
    const testDateMs = test.testDate
      ? parseLocalDate(test.testDate).getTime()
      : 0
    if (testDateMs <= today) continue

    const coveredIds = test.coveredUnitIds || []
    if (!coveredIds.includes(unitId)) continue

    const daysUntilTest = (testDateMs - today) / MS_PER_DAY

    let baseUrgency
    if (daysUntilTest <= 3)       baseUrgency = 95
    else if (daysUntilTest <= 7)  baseUrgency = 80
    else if (daysUntilTest <= 14) baseUrgency = 60
    else if (daysUntilTest <= 21) baseUrgency = 40
    else if (daysUntilTest <= 30) baseUrgency = 20
    else                          baseUrgency = 5

    const testName = test.testName || ''
    const testWeight = testName.includes('組分け') ? 1.3
                     : testName.includes('マンスリー') ? 1.0
                     : 0.7

    const masteryPenalty = 1 + (100 - Math.max(0, currentScore)) / 200
    const urgency = Math.min(100, baseUrgency * testWeight * masteryPenalty)

    if (urgency > maxUrgency) {
      maxUrgency = urgency
      nearestTestName = testName
      nearestDaysUntil = Math.ceil(daysUntilTest)
    }
  }

  return { testUrgency: maxUrgency, testName: nearestTestName, daysUntilTest: nearestDaysUntil }
}

/**
 * weaknessDepth（弱点深度）0-100
 */
function calcWeaknessDepth(currentScore, unitProblems) {
  const masteryPart = (100 - Math.max(0, currentScore)) / 2

  const mistakeCount = unitProblems.filter(p => !p.isCorrect).length
  const mistakePart = Math.min(30, mistakeCount * 7)

  const maxSeverity = Math.max(
    0,
    ...unitProblems.map(p => SEVERITY_MAP[p.missType] || 0)
  )

  const hasHighCorrectRateMiss = unitProblems.some(
    p => !p.isCorrect && p.correctRate != null && p.correctRate >= 50
  )
  const correctRateBoost = hasHighCorrectRateMiss ? 1.5 : 1.0

  return {
    weaknessDepth: Math.min(100, (masteryPart + mistakePart + maxSeverity) * correctRateBoost),
    mistakeCount,
    hasHighCorrectRateMiss,
  }
}

// ── reason / suggestedAction 生成 ────────────────

function buildReason(testName, daysUntilTest, currentScore, mistakeCount, hasHighCorrectRateMiss) {
  const reasons = []
  if (testName && daysUntilTest < Infinity) reasons.push(`${testName}まで${daysUntilTest}日`)
  if (currentScore >= 0 && currentScore < 50) reasons.push(`習熟度${currentScore}%`)
  if (mistakeCount > 0) reasons.push(`間違い${mistakeCount}問`)
  if (hasHighCorrectRateMiss) reasons.push('正答率50%↑で不正解あり')
  return reasons.join(' + ') || '復習推奨'
}

function buildSuggestedAction(unitName, linkedProblems) {
  if (linkedProblems.length > 0) {
    const nums = linkedProblems.slice(0, 5).map(p => p.problemNumber).join(', ')
    const source = linkedProblems[0].sourceType === 'textbook' ? 'テキスト' : 'テスト'
    return `${source}の${nums}を解き直し`
  }
  return `${unitName}のテキストを復習`
}

// ── priority 判定 ─────────────────────────────

function scoreToPriority(score) {
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

// ── taskType 判定 ─────────────────────────────

function determineTaskType(testUrgency, weaknessDepth, forgettingScore) {
  if (testUrgency >= 50) return 'test_prep'
  if (weaknessDepth >= 50) return 'weakness'
  if (forgettingScore >= 60) return 'sr_review'
  return 'review'
}

// ── メイン関数 ─────────────────────────────────

/**
 * 本日の推薦タスクを生成する
 *
 * @param {Object} params
 * @param {Object} params.unitStats   - { unitId: { currentScore, statusLevel, logCount, lastUpdated } }
 * @param {Array}  params.problems    - problems コレクションの全ドキュメント
 * @param {Array}  params.testScores  - testScores コレクションの全ドキュメント
 * @param {Array}  params.lessonLogs  - lessonLogs コレクションの全ドキュメント
 * @param {Array}  params.masterUnits - getStaticMasterUnits() の結果
 * @returns {DailyTask[]} 最大5件の推薦タスク
 */
export function generateDailyTasks({ unitStats = {}, problems = [], testScores = [], lessonLogs = [], masterUnits = [] }) {
  if (masterUnits.length === 0) return []

  // 昨日学習した単元を除外リストに
  const yesterday = yesterdayStr()
  const yesterdayUnitIds = new Set()
  for (const log of lessonLogs) {
    const logDate = log.date
    let logDateStr = ''
    if (logDate) {
      if (typeof logDate === 'string') {
        logDateStr = logDate.slice(0, 10)
      } else {
        const ms = toMs(logDate)
        const d = new Date(ms)
        logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
    }
    if (logDateStr === yesterday) {
      for (const uid of (log.unitIds || [])) {
        yesterdayUnitIds.add(uid)
      }
    }
  }

  // 単元ごとの problems を事前集計
  const problemsByUnit = {}
  for (const p of problems) {
    for (const uid of (p.unitIds || [])) {
      if (!problemsByUnit[uid]) problemsByUnit[uid] = []
      problemsByUnit[uid].push(p)
    }
  }

  // 全マスター単元に対してスコアを計算
  const candidates = []

  for (const unit of masterUnits) {
    const uid = unit.id
    const stats = unitStats[uid]

    // 未学習（statsなし or currentScore < 0）を除外
    if (!stats || stats.currentScore == null || stats.currentScore < 0) continue

    // 昨日学習した単元を除外
    if (yesterdayUnitIds.has(uid)) continue

    const currentScore = stats.currentScore
    const logCount = stats.logCount || 0
    const lastUpdatedMs = toMs(stats.lastUpdated)

    // 個別スコア
    const forgetting = calcForgettingScore(lastUpdatedMs, logCount)
    const { testUrgency, testName, daysUntilTest } = calcTestUrgency(uid, currentScore, testScores)
    const unitProblems = problemsByUnit[uid] || []
    const { weaknessDepth, mistakeCount, hasHighCorrectRateMiss } = calcWeaknessDepth(currentScore, unitProblems)
    const jitter = Math.random() * 100

    // トータルスコア
    const totalScore = forgetting * W_FORGETTING
                     + testUrgency * W_TEST
                     + weaknessDepth * W_WEAKNESS
                     + jitter * W_JITTER

    // 関連する間違い問題
    const linkedProblems = unitProblems
      .filter(p => !p.isCorrect)
      .sort((a, b) => {
        // 正答率が高いのに間違えた問題を優先
        const aRate = a.correctRate ?? 0
        const bRate = b.correctRate ?? 0
        return bRate - aRate
      })
      .slice(0, 5)

    candidates.push({
      unitId: uid,
      unitName: unit.name,
      subject: unit.subject,
      totalScore,
      forgetting,
      testUrgency,
      weaknessDepth,
      testName,
      daysUntilTest,
      currentScore,
      mistakeCount,
      hasHighCorrectRateMiss,
      linkedProblems,
    })
  }

  // スコアでソート（降順）
  candidates.sort((a, b) => b.totalScore - a.totalScore)

  // 科目バランス制約を適用して上位5件選択
  const selected = []
  const subjectCount = {}

  for (const c of candidates) {
    if (selected.length >= MAX_TASKS) break
    const count = subjectCount[c.subject] || 0
    if (count >= MAX_PER_SUBJECT) continue
    subjectCount[c.subject] = count + 1
    selected.push(c)
  }

  // DailyTask型に変換
  return selected.map((c, idx) => ({
    id: `task-${Date.now()}-${idx}`,
    unitId: c.unitId,
    unitName: c.unitName,
    subject: c.subject,
    priority: scoreToPriority(c.totalScore),
    score: Math.round(c.totalScore),
    reason: buildReason(c.testName, c.daysUntilTest, c.currentScore, c.mistakeCount, c.hasHighCorrectRateMiss),
    linkedProblems: c.linkedProblems,
    suggestedAction: buildSuggestedAction(c.unitName, c.linkedProblems),
    taskType: determineTaskType(c.testUrgency, c.weaknessDepth, c.forgetting),
  }))
}
