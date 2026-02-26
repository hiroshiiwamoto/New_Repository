import { useState, useEffect, useMemo } from 'react'
import './TestRangeProblems.css'
import { getProblemsBySource } from '../utils/problems'
import { lookupSapixSchedule } from '../utils/sapixSchedule'
import { subjectEmojis } from '../utils/constants'

function TestRangeProblems({ userId, sapixRange, testName, sapixTexts, onClose, onResolveProblem }) {
  const [problems, setProblems] = useState(null) // null = loading
  const [showResolved, setShowResolved] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)

  // sapixRange → 該当テキストをフィルタ
  const rangeTextIds = useMemo(() => {
    const ids = {}
    for (const [subject, codes] of Object.entries(sapixRange || {})) {
      if (!codes || codes.length === 0) continue
      ids[subject] = []
      for (const code of codes) {
        const text = sapixTexts.find(t => t.textNumber === code)
        if (text) {
          ids[subject].push({
            textId: text.id,
            textCode: code,
            textName: text.textName,
          })
        }
      }
    }
    return ids
  }, [sapixRange, sapixTexts])

  // 各テキストの問題クリップを取得
  useEffect(() => {
    async function load() {
      const allProblems = {}
      for (const [subject, texts] of Object.entries(rangeTextIds)) {
        allProblems[subject] = []
        for (const { textId, textCode, textName } of texts) {
          const result = await getProblemsBySource(userId, 'textbook', textId)
          if (result.success) {
            const incorrect = result.data.filter(p => !p.isCorrect)
            if (incorrect.length > 0) {
              const info = lookupSapixSchedule(textCode)
              allProblems[subject].push({
                textCode,
                textName: textName || info?.name || textCode,
                problems: incorrect,
              })
            }
          }
        }
      }
      setProblems(allProblems)
    }
    load()
  }, [rangeTextIds, userId])

  const handleResolve = async (problemId) => {
    if (onResolveProblem) {
      await onResolveProblem(problemId)
    }
    // ローカルstateも更新
    setProblems(prev => {
      if (!prev) return prev
      const updated = {}
      for (const [subject, groups] of Object.entries(prev)) {
        updated[subject] = groups.map(g => ({
          ...g,
          problems: g.problems.map(p =>
            p.id === problemId ? { ...p, reviewStatus: 'done' } : p
          ),
        }))
      }
      return updated
    })
  }

  // 全問題を集計
  const { pendingCount, resolvedCount } = useMemo(() => {
    if (!problems) return { pendingCount: 0, resolvedCount: 0 }
    let pending = 0
    let resolved = 0
    for (const groups of Object.values(problems)) {
      for (const g of groups) {
        for (const p of g.problems) {
          if (p.reviewStatus === 'done') resolved++
          else pending++
        }
      }
    }
    return { pendingCount: pending, resolvedCount: resolved }
  }, [problems])

  return (
    <div className="range-problems-overlay" onClick={onClose}>
      <div className="range-problems-modal" onClick={e => e.stopPropagation()}>
        <div className="range-problems-header">
          <h2>{testName} — 間違い問題</h2>
          <button className="range-problems-close" onClick={onClose}>✕</button>
        </div>

        <div className="range-problems-body">
          {problems === null ? (
            <div className="range-problems-loading">読み込み中...</div>
          ) : pendingCount === 0 && resolvedCount === 0 ? (
            <div className="range-problems-empty">この範囲の間違い問題はありません</div>
          ) : (
            <>
              {/* 未完了の問題 */}
              {Object.entries(problems).map(([subject, groups]) => {
                const subjectPending = groups.reduce(
                  (acc, g) => acc + g.problems.filter(p => p.reviewStatus !== 'done').length, 0
                )
                if (subjectPending === 0) return null
                return (
                  <div key={subject} className="range-subject-group">
                    <div className="range-subject-header">
                      <span>{subjectEmojis[subject]} {subject}（{subjectPending}問）</span>
                    </div>
                    {groups.map(g => {
                      const pendingInGroup = g.problems.filter(p => p.reviewStatus !== 'done')
                      if (pendingInGroup.length === 0) return null
                      return (
                        <div key={g.textCode} className="range-text-group">
                          <div className="range-text-header">
                            {g.textCode} {g.textName}
                          </div>
                          {pendingInGroup.map(p => (
                            <div key={p.id} className="range-problem-row">
                              <span className="range-problem-num">{p.problemNumber}</span>
                              {p.imageUrls?.length > 0 && (
                                <img
                                  src={p.imageUrls[0]}
                                  alt={p.problemNumber}
                                  className="range-problem-image"
                                  onClick={() => setExpandedImage(p.imageUrls[0])}
                                />
                              )}
                              <button
                                className="range-resolve-btn"
                                onClick={() => handleResolve(p.id)}
                              >
                                できた
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* 解き直し済み（折り畳み） */}
              {resolvedCount > 0 && (
                <div className="range-resolved-section">
                  <button
                    className="range-resolved-toggle"
                    onClick={() => setShowResolved(!showResolved)}
                  >
                    解き直し済み（{resolvedCount}問） {showResolved ? '▾' : '▸'}
                  </button>
                  {showResolved && (
                    <div className="range-resolved-list">
                      {Object.entries(problems).map(([subject, groups]) => {
                        const subjectResolved = groups.reduce(
                          (acc, g) => acc + g.problems.filter(p => p.reviewStatus === 'done').length, 0
                        )
                        if (subjectResolved === 0) return null
                        return (
                          <div key={subject} className="range-subject-group resolved">
                            <div className="range-subject-header">
                              <span>{subjectEmojis[subject]} {subject}（{subjectResolved}問）</span>
                            </div>
                            {groups.map(g => {
                              const resolvedInGroup = g.problems.filter(p => p.reviewStatus === 'done')
                              if (resolvedInGroup.length === 0) return null
                              return (
                                <div key={g.textCode} className="range-text-group">
                                  <div className="range-text-header">
                                    {g.textCode} {g.textName}
                                  </div>
                                  {resolvedInGroup.map(p => (
                                    <div key={p.id} className="range-problem-row resolved">
                                      <span className="range-problem-num">{p.problemNumber}</span>
                                      {p.imageUrls?.length > 0 && (
                                        <img
                                          src={p.imageUrls[0]}
                                          alt={p.problemNumber}
                                          className="range-problem-image"
                                          onClick={() => setExpandedImage(p.imageUrls[0])}
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 画像拡大表示 */}
      {expandedImage && (
        <div className="range-image-lightbox" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="拡大" />
        </div>
      )}
    </div>
  )
}

export default TestRangeProblems
