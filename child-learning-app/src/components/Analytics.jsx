import { useState, useEffect, useCallback } from 'react'
import './Analytics.css'
import ProgressChart from './ProgressChart'
import { getProgressForPeriod, getWeeklyProgress, calculateStatistics, recordProgressSnapshot } from '../utils/progressTracking'

function Analytics({ tasks }) {
  const [period, setPeriod] = useState('30days') // 30days, 90days, 12weeks
  const [progressData, setProgressData] = useState([])
  const [statistics, setStatistics] = useState(null)

  const subjects = ['国語', '算数', '理科', '社会']

  const loadProgressData = useCallback(() => {
    let data
    let statDays

    if (period === '30days') {
      data = getProgressForPeriod(30)
      statDays = 30
    } else if (period === '90days') {
      data = getProgressForPeriod(90)
      statDays = 90
    } else if (period === '12weeks') {
      data = getWeeklyProgress(12)
      statDays = 84
    }

    setProgressData(data)
    setStatistics(calculateStatistics(statDays))
  }, [period])

  useEffect(() => {
    // 現在の進捗をスナップショット
    if (tasks && tasks.length > 0) {
      recordProgressSnapshot(tasks)
    }

    // データを読み込み
    loadProgressData()
  }, [tasks, period, loadProgressData])

  const subjectEmojis = {
    '国語': '📖',
    '算数': '🔢',
    '理科': '🔬',
    '社会': '🌍',
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>📈 学習進捗分析</h2>
        <div className="period-selector">
          <button
            className={period === '30days' ? 'active' : ''}
            onClick={() => setPeriod('30days')}
          >
            30日間
          </button>
          <button
            className={period === '90days' ? 'active' : ''}
            onClick={() => setPeriod('90days')}
          >
            90日間
          </button>
          <button
            className={period === '12weeks' ? 'active' : ''}
            onClick={() => setPeriod('12weeks')}
          >
            12週間
          </button>
        </div>
      </div>

      {/* 統計サマリー */}
      {statistics && (
        <div className="statistics-summary">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">平均達成率</div>
              <div className="stat-value">{statistics.averageProgress}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">総学習時間</div>
              <div className="stat-value">{Math.round(statistics.totalStudyTime / 60)}h {statistics.totalStudyTime % 60}m</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">1日平均</div>
              <div className="stat-value">{statistics.averageDailyStudyTime}分</div>
            </div>
          </div>

          <div className={`stat-card ${statistics.improvement >= 0 ? 'positive' : 'negative'}`}>
            <div className="stat-icon">{statistics.improvement >= 0 ? '📈' : '📉'}</div>
            <div className="stat-content">
              <div className="stat-label">改善度</div>
              <div className="stat-value">
                {statistics.improvement > 0 ? '+' : ''}{statistics.improvement}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 進捗グラフ */}
      <div className="chart-section">
        <h3>📊 達成率の推移</h3>
        <ProgressChart
          data={progressData}
          subjects={subjects}
        />
      </div>

      {/* 科目別分析 */}
      {statistics && statistics.subjectAverages && (
        <div className="subject-analysis">
          <h3>📚 科目別分析</h3>
          <div className="subject-grid">
            {subjects.map(subject => {
              const avg = statistics.subjectAverages[subject] || 0
              const isBest = subject === statistics.bestSubject
              const isWeakest = subject === statistics.weakestSubject

              return (
                <div
                  key={subject}
                  className={`subject-card ${isBest ? 'best' : ''} ${isWeakest ? 'weakest' : ''}`}
                >
                  <div className="subject-card-header">
                    <span className="subject-emoji">{subjectEmojis[subject]}</span>
                    <span className="subject-name">{subject}</span>
                    {isBest && <span className="badge best-badge">得意</span>}
                    {isWeakest && <span className="badge weak-badge">要強化</span>}
                  </div>
                  <div className="subject-average">
                    <div className="average-value">{avg}%</div>
                    <div className="average-label">平均達成率</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* アドバイス */}
      {statistics && (
        <div className="advice-section">
          <h3>💡 学習アドバイス</h3>
          <div className="advice-cards">
            {statistics.weakestSubject && (
              <div className="advice-card">
                <div className="advice-icon">🎯</div>
                <div className="advice-content">
                  <strong>{subjectEmojis[statistics.weakestSubject]} {statistics.weakestSubject}を重点強化</strong>
                  <p>現在の平均達成率: {statistics.subjectAverages[statistics.weakestSubject]}%</p>
                  <p>この科目の学習時間を増やすことをお勧めします。</p>
                </div>
              </div>
            )}

            {statistics.averageDailyStudyTime < 60 && (
              <div className="advice-card">
                <div className="advice-icon">⏰</div>
                <div className="advice-content">
                  <strong>学習時間を増やしましょう</strong>
                  <p>1日平均: {statistics.averageDailyStudyTime}分</p>
                  <p>目標: 60分以上（SAPIX推奨）</p>
                </div>
              </div>
            )}

            {statistics.improvement > 10 && (
              <div className="advice-card positive">
                <div className="advice-icon">🎉</div>
                <div className="advice-content">
                  <strong>素晴らしい成長です！</strong>
                  <p>達成率が{statistics.improvement}%向上しています</p>
                  <p>このペースを維持しましょう！</p>
                </div>
              </div>
            )}

            {statistics.improvement < -10 && (
              <div className="advice-card warning">
                <div className="advice-icon">⚠️</div>
                <div className="advice-content">
                  <strong>学習ペースを見直しましょう</strong>
                  <p>達成率が低下傾向にあります</p>
                  <p>計画を見直し、無理のないペースで学習を続けましょう。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
