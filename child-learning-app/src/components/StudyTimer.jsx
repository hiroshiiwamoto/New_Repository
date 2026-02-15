import { useState, useEffect, useRef, useCallback } from 'react'
import './StudyTimer.css'

function StudyTimer() {
  const [mode, setMode] = useState('study') // 'study' or 'break'
  const [studyMinutes, setStudyMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // seconds
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalStudySeconds, setTotalStudySeconds] = useState(0)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  const resetTimer = useCallback((newMode) => {
    const minutes = newMode === 'study' ? studyMinutes : breakMinutes
    setTimeLeft(minutes * 60)
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [studyMinutes, breakMinutes])

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsRunning(false)

          // 通知音
          try {
            if (audioRef.current) {
              audioRef.current.play().catch(() => {})
            }
          } catch { /* ignore */ }

          // セッション完了
          if (mode === 'study') {
            setCompletedSessions(s => s + 1)
            // 自動で休憩に切替
            setMode('break')
            setTimeLeft(breakMinutes * 60)
          } else {
            // 休憩終了、学習に切替
            setMode('study')
            setTimeLeft(studyMinutes * 60)
          }

          return 0
        }

        // 学習中の累計時間を更新
        if (mode === 'study') {
          setTotalStudySeconds(t => t + 1)
        }

        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, mode, studyMinutes, breakMinutes])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    resetTimer(mode)
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    resetTimer(newMode)
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}時間${m}分`
    return `${m}分`
  }

  const progress = mode === 'study'
    ? ((studyMinutes * 60 - timeLeft) / (studyMinutes * 60)) * 100
    : ((breakMinutes * 60 - timeLeft) / (breakMinutes * 60)) * 100

  const presets = [
    { label: '25/5', study: 25, break: 5 },
    { label: '50/10', study: 50, break: 10 },
    { label: '30/5', study: 30, break: 5 },
    { label: '45/15', study: 45, break: 15 },
  ]

  return (
    <div className="study-timer">
      <div className="timer-header">
        <h2>⏱️ 学習タイマー</h2>
        <p className="timer-description">集中して学習する時間を管理しましょう</p>
      </div>

      {/* プリセット */}
      <div className="timer-presets">
        {presets.map(preset => (
          <button
            key={preset.label}
            className={`preset-btn ${studyMinutes === preset.study && breakMinutes === preset.break ? 'active' : ''}`}
            onClick={() => {
              setStudyMinutes(preset.study)
              setBreakMinutes(preset.break)
              if (!isRunning) {
                setTimeLeft(mode === 'study' ? preset.study * 60 : preset.break * 60)
              }
            }}
            disabled={isRunning}
          >
            {preset.label}分
          </button>
        ))}
      </div>

      {/* モード切替 */}
      <div className="timer-modes">
        <button
          className={`mode-btn ${mode === 'study' ? 'active study-mode' : ''}`}
          onClick={() => handleModeChange('study')}
          disabled={isRunning}
        >
          📖 学習
        </button>
        <button
          className={`mode-btn ${mode === 'break' ? 'active break-mode' : ''}`}
          onClick={() => handleModeChange('break')}
          disabled={isRunning}
        >
          ☕ 休憩
        </button>
      </div>

      {/* タイマー表示 */}
      <div className={`timer-display ${mode}`}>
        <div className="timer-circle">
          <svg className="timer-svg" viewBox="0 0 200 200">
            <circle
              className="timer-bg-circle"
              cx="100" cy="100" r="90"
              fill="none" strokeWidth="8"
            />
            <circle
              className="timer-progress-circle"
              cx="100" cy="100" r="90"
              fill="none" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="timer-text">
            <div className="timer-time">{formatTime(timeLeft)}</div>
            <div className="timer-mode-label">
              {mode === 'study' ? '学習中' : '休憩中'}
            </div>
          </div>
        </div>
      </div>

      {/* コントロール */}
      <div className="timer-controls">
        <button className="timer-control-btn reset" onClick={handleReset}>
          リセット
        </button>
        <button
          className={`timer-control-btn ${isRunning ? 'pause' : 'start'}`}
          onClick={toggleTimer}
        >
          {isRunning ? '⏸ 一時停止' : '▶ スタート'}
        </button>
      </div>

      {/* 統計 */}
      <div className="timer-stats">
        <div className="timer-stat-item">
          <span className="stat-number">{completedSessions}</span>
          <span className="stat-label">完了セッション</span>
        </div>
        <div className="timer-stat-item">
          <span className="stat-number">{formatTotalTime(totalStudySeconds)}</span>
          <span className="stat-label">累計学習時間</span>
        </div>
      </div>

      {/* 通知用の不可視オーディオ */}
      <audio ref={audioRef} preload="none">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGY6I0eCr9y8dkgkOG2Xw9SzaTMiQHyny9m5dEYiOGqTw9e4eTgkOXCZxNa0cjQhQniry9a2bjQmP2+Ww9q+gEcoNWeQvte8dT8nPG+YxNi5bDMjQ3GWw9q+gEcoNWeQvte8dT8nPG+YxNi5bDMjQ3GWw9q+gEcoNWeQvte8dT8nPG+YxNi5bA==" type="audio/wav" />
      </audio>
    </div>
  )
}

export default StudyTimer
