import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { lookupSapixSchedule } from '../utils/sapixSchedule'
import { addProblem } from '../utils/problems'
import { addLessonLogWithStats } from '../utils/lessonLogs'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { toast } from '../utils/toast'
import UnitTagPicker from './UnitTagPicker'
import { SUBJECTS } from '../utils/constants'
import './QuickMistakeInput.css'

// 問題番号ボタンの初期候補
const DEFAULT_PROBLEM_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8']

// パフォーマンス計算（間違い問題数→performance）
function calculatePerformance(mistakeCount) {
  if (mistakeCount === 0) return 90
  if (mistakeCount === 1) return 70
  if (mistakeCount === 2) return 55
  return 30
}

/**
 * QuickMistakeInput — 間違い問題クイック登録モーダル
 *
 * @param {string}   userId     - ユーザーID
 * @param {object}   sapixText  - テキスト情報 { id, sapixCode, textName, textNumber, subject, unitIds }
 * @param {Function} onClose    - モーダルを閉じるコールバック
 * @param {Function} onSaved    - 保存完了コールバック
 */
export default function QuickMistakeInput({ userId, sapixText, onClose, onSaved }) {
  const [selectedProblems, setSelectedProblems] = useState(new Set())
  const [customNumber, setCustomNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  // sapixScheduleから自動取得を試みる
  const scheduleInfo = useMemo(() => {
    const code = sapixText.textNumber || sapixText.sapixCode
    if (code) {
      const info = lookupSapixSchedule(code)
      if (info) return info
    }
    return null
  }, [sapixText])

  // フォールバック：scheduleInfoがnullの場合に手動選択
  const [manualSubject, setManualSubject] = useState(sapixText.subject || '算数')
  const [manualUnitIds, setManualUnitIds] = useState(sapixText.unitIds || [])

  // 実際に使うsubject/unitIds
  const effectiveSubject = scheduleInfo?.subject || manualSubject
  const effectiveUnitIds = scheduleInfo?.unitIds?.length ? scheduleInfo.unitIds : manualUnitIds

  // 単元名のマップ
  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])

  const unitNames = effectiveUnitIds.map(id => unitNameMap[id] || id)

  // 問題番号トグル
  const toggleProblem = (num) => {
    setSelectedProblems(prev => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
      } else {
        next.add(num)
      }
      return next
    })
  }

  // カスタム問題番号追加
  const addCustomNumber = () => {
    const trimmed = customNumber.trim()
    if (!trimmed) return
    setSelectedProblems(prev => new Set([...prev, trimmed]))
    setCustomNumber('')
  }

  // 保存処理
  const handleSave = async () => {
    if (selectedProblems.size === 0) {
      toast.error('間違えた問題を選択してください')
      return
    }
    if (effectiveUnitIds.length === 0) {
      toast.error('単元タグを設定してください')
      return
    }

    setSaving(true)
    try {
      const problemNumbers = [...selectedProblems]

      // 各問題をproblemsコレクションに追加
      for (const problemNumber of problemNumbers) {
        await addProblem(userId, {
          sourceType: 'textbook',
          sourceId: sapixText.id,
          subject: effectiveSubject,
          problemNumber,
          unitIds: effectiveUnitIds,
          isCorrect: false,
          missType: 'understanding',
          imageUrls: [],
        })
      }

      // lessonLogにも反映
      const code = sapixText.textNumber || sapixText.sapixCode || ''
      const name = scheduleInfo?.name || sapixText.textName || ''
      await addLessonLogWithStats(userId, {
        unitIds: effectiveUnitIds,
        subject: effectiveSubject,
        sourceType: 'sapixTask',
        sourceId: sapixText.id,
        sourceName: `${code} ${name}`.trim(),
        performance: calculatePerformance(problemNumbers.length),
        evaluationKey: null,
      })

      setDone(true)
      toast.success(`${problemNumbers.length}問の間違いを記録しました`)

      if (onSaved) onSaved()
    } catch (err) {
      console.error('QuickMistakeInput save error:', err)
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 全問題番号リスト（デフォルト + カスタム追加分）
  const allNumbers = useMemo(() => {
    const nums = [...DEFAULT_PROBLEM_NUMBERS]
    for (const num of selectedProblems) {
      if (!nums.includes(num)) nums.push(num)
    }
    return nums
  }, [selectedProblems])

  const code = sapixText.textNumber || sapixText.sapixCode || ''

  return createPortal(
    <div className="qmi-overlay" onClick={onClose}>
      <div className="qmi-modal" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="qmi-header">
          <h3>間違い問題を記録</h3>
          <button className="qmi-close" onClick={onClose}>&times;</button>
        </div>

        {done ? (
          /* 完了表示 */
          <div className="qmi-done">
            <div className="qmi-done-icon">&#10003;</div>
            <p>記録しました</p>
            <button className="btn-primary" onClick={onClose}>閉じる</button>
          </div>
        ) : (
          <>
            {/* テキスト情報 */}
            <div className="qmi-text-info">
              <span className="qmi-text-code">{code}</span>
              <span className="qmi-text-name">{scheduleInfo?.name || sapixText.textName}</span>
              {unitNames.length > 0 && (
                <div className="qmi-unit-tags">
                  {unitNames.map(name => (
                    <span key={name} className="qmi-unit-badge">{name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* フォールバック: scheduleInfoがない場合の手動選択 */}
            {!scheduleInfo && (
              <div className="qmi-fallback">
                <p className="qmi-fallback-note">
                  テキストコードが未登録のため、科目・単元を手動で選択してください
                </p>
                <div className="qmi-fallback-subject">
                  <label>科目:</label>
                  <div className="qmi-subject-btns">
                    {SUBJECTS.map(s => (
                      <button
                        key={s}
                        className={`qmi-subject-btn ${manualSubject === s ? 'active' : ''}`}
                        onClick={() => { setManualSubject(s); setManualUnitIds([]) }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="qmi-fallback-unit">
                  <label>単元タグ:</label>
                  <UnitTagPicker
                    subject={manualSubject}
                    value={manualUnitIds}
                    onChange={setManualUnitIds}
                  />
                </div>
              </div>
            )}

            {/* 問題番号選択 */}
            <div className="qmi-problems">
              <p className="qmi-problems-label">間違えた問題を選んでください:</p>
              <div className="qmi-problem-grid">
                {allNumbers.map(num => (
                  <button
                    key={num}
                    className={`qmi-problem-btn ${selectedProblems.has(num) ? 'selected' : ''}`}
                    onClick={() => toggleProblem(num)}
                  >
                    {DEFAULT_PROBLEM_NUMBERS.includes(num) ? `問${num}` : num}
                  </button>
                ))}
              </div>
              <div className="qmi-custom-input">
                <input
                  type="text"
                  placeholder="例: 9, 大問3(2)"
                  value={customNumber}
                  onChange={e => setCustomNumber(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomNumber()}
                />
                <button className="qmi-custom-add" onClick={addCustomNumber}>追加</button>
              </div>
            </div>

            {/* 選択数表示 */}
            {selectedProblems.size > 0 && (
              <div className="qmi-selection-summary">
                {selectedProblems.size}問選択中
              </div>
            )}

            {/* アクション */}
            <div className="qmi-actions">
              <button className="btn-secondary" onClick={onClose}>
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || selectedProblems.size === 0}
              >
                {saving ? '記録中...' : '記録する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
