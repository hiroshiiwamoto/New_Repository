import { useReducer, useEffect, useRef, useState } from 'react'
import './TestScoreView.css'
import { getTodayString } from '../utils/dateUtils'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  getProblemsForTestScore,
  testTypes,
} from '../utils/testScores'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'
import {
  updateProblem,
  deleteProblem,
  deleteProblemsBySource,
} from '../utils/problems'
import { addLessonLogWithStats, deleteLessonLogsBySource, EVALUATION_SCORES } from '../utils/lessonLogs'
import { MAX_FILE_SIZE, SUBJECTS } from '../utils/constants'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import ProblemClipList from './ProblemClipList'
import DriveFilePicker from './DriveFilePicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { grades } from '../utils/unitsDatabase'
import EmptyState from './EmptyState'
import {
  lookupSapixSchedule,
  getSapixCodesBySubject,
  computeCoveredUnitIds,
} from '../utils/sapixSchedule'

const EMPTY_ADD_FORM = {
  testName: '',
  testDate: '',
  grade: '4年生',
  sapixRange: {},
  status: 'scheduled',
}

/** Google Drive URL から driveFileId を抽出 */
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
}

/** SAPIX 範囲をコンパクトに要約 */
function summarizeSapixRange(sapixRange) {
  const parts = []
  for (const [subject, codes] of Object.entries(sapixRange || {})) {
    if (codes && codes.length > 0) {
      if (codes.length <= 2) {
        parts.push(`${subject}: ${codes.join(', ')}`)
      } else {
        parts.push(`${subject}: ${codes[0]}~${codes[codes.length - 1]}`)
      }
    }
  }
  return parts.join(' / ')
}

const initialState = {
  scores: [],
  selectedScore: null,
  uploadingSubject: null,
  drivePickerSubject: null,
  problemsCache: [],
  showAddForm: false,
  addForm: { ...EMPTY_ADD_FORM },
  addUploading: null,
  addDrivePickerSubject: null,
  isEditing: false,
  editForm: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_FIELDS':
      return { ...state, ...action.fields }
    case 'MERGE_ADD_FORM':
      return { ...state, addForm: { ...state.addForm, ...action.fields } }
    case 'SET_ADD_FORM_SAPIX_RANGE':
      return {
        ...state,
        addForm: {
          ...state.addForm,
          sapixRange: {
            ...state.addForm.sapixRange,
            [action.subject]: action.codes,
          },
        },
      }
    case 'MERGE_EDIT_FORM':
      return { ...state, editForm: { ...state.editForm, ...action.fields } }
    case 'SET_EDIT_FORM_SAPIX_RANGE':
      return {
        ...state,
        editForm: {
          ...state.editForm,
          sapixRange: {
            ...(state.editForm?.sapixRange || {}),
            [action.subject]: action.codes,
          },
        },
      }
    case 'SET_ADD_FORM_SUBJECT_PDF':
      return {
        ...state,
        addForm: {
          ...state.addForm,
          subjectPdfs: {
            ...(state.addForm.subjectPdfs || {}),
            [action.subject]: action.pdf,
          },
        },
      }
    case 'REMOVE_ADD_FORM_SUBJECT_PDF': {
      const updated = { ...(state.addForm.subjectPdfs || {}) }
      delete updated[action.subject]
      return {
        ...state,
        addForm: {
          ...state.addForm,
          subjectPdfs: updated,
        },
      }
    }
    default:
      return state
  }
}

// ── SAPIX コードチップ入力コンポーネント ──────────────────────
function SapixCodeInput({ subject, codes, onChange }) {
  const [inputValue, setInputValue] = useState('')
  const datalistId = `sapix-codes-${subject}`
  const suggestions = getSapixCodesBySubject(subject)

  const addCode = (code) => {
    const trimmed = code.trim()
    if (!trimmed) return
    if (codes.includes(trimmed)) return
    onChange([...codes, trimmed])
    setInputValue('')
  }

  const removeCode = (code) => {
    onChange(codes.filter(c => c !== code))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCode(inputValue)
    }
  }

  return (
    <div className="sapix-range-subject-row">
      <span className="sapix-range-subject-label">{subject}</span>
      <div className="sapix-code-chips-wrap">
        {codes.map(code => {
          const info = lookupSapixSchedule(code)
          return (
            <span key={code} className="sapix-code-chip">
              {code}
              {info && <span className="chip-name">{info.name}</span>}
              <button className="chip-remove" onClick={() => removeCode(code)}>✕</button>
            </span>
          )
        })}
        <input
          type="text"
          list={suggestions.length > 0 ? datalistId : undefined}
          className="sapix-code-input"
          placeholder="コード入力"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addCode(inputValue) }}
        />
        {suggestions.length > 0 && (
          <datalist id={datalistId}>
            {suggestions.map(c => {
              const info = lookupSapixSchedule(c)
              return <option key={c} value={c} label={info ? `${c} ${info.name}` : c} />
            })}
          </datalist>
        )}
      </div>
    </div>
  )
}

// ── SAPIX 範囲表示（読み取り専用）──────────────────────────────
function SapixRangeDisplay({ sapixRange, collapsed }) {
  const [isOpen, setIsOpen] = useState(!collapsed)
  const hasRange = Object.values(sapixRange || {}).some(codes => codes?.length > 0)
  if (!hasRange) return null

  return (
    <div className="sapix-range-display">
      <button className="sapix-range-display-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="sapix-range-display-title">テスト範囲</span>
        <span>{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && (
        <div className="sapix-range-display-body">
          {SUBJECTS.map(subject => {
            const codes = (sapixRange || {})[subject]
            if (!codes || codes.length === 0) return null
            return (
              <div key={subject} className="sapix-range-display-row">
                <span className="sapix-range-subject-label">{subject}</span>
                <div className="sapix-code-chips-wrap">
                  {codes.map(code => {
                    const info = lookupSapixSchedule(code)
                    return (
                      <span key={code} className="sapix-code-chip sapix-code-chip-readonly">
                        {code}
                        {info && <span className="chip-name">{info.name}</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// メインコンポーネント
// ════════════════════════════════════════════════════════════════

function TestScoreView({ user, initialTestId, onConsumeInitialTestId }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { data: scores, reload: reloadScores } = useFirestoreQuery(
    () => user ? getAllTestScores(user.uid) : null,
    [user]
  )

  const subjectFileInputRefs = useRef({})
  const addFileInputRefs = useRef({})

  useEffect(() => {
    if (scores) dispatch({ type: 'SET_FIELD', field: 'scores', value: scores })
  }, [scores])

  useEffect(() => {
    if (!user || !state.selectedScore) return
    getProblemsForTestScore(user.uid, state.selectedScore).then(merged => {
      dispatch({ type: 'SET_FIELD', field: 'problemsCache', value: merged })
    })
  }, [user, state.selectedScore?.id])

  useEffect(() => {
    if (!state.selectedScore) return
    const updated = state.scores.find(s => s.id === state.selectedScore.id)
    if (!updated) return
    // 内容が変わった場合のみ更新（不要な再レンダーを防止）
    if (JSON.stringify(updated) !== JSON.stringify(state.selectedScore)) {
      dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: updated })
    }
  }, [state.scores])

  // initialTestId が渡されたら自動的にそのテストを選択
  useEffect(() => {
    if (!initialTestId || !state.scores.length) return
    const target = state.scores.find(s => s.id === initialTestId)
    if (target) {
      dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: target })
    }
    if (onConsumeInitialTestId) onConsumeInitialTestId()
  }, [initialTestId, state.scores])

  // scheduled テスト選択時に editForm を自動初期化（既にある場合はスキップ）
  useEffect(() => {
    if (!state.selectedScore || state.selectedScore.status !== 'scheduled') return
    if (state.editForm) return
    dispatch({
      type: 'SET_FIELDS',
      fields: {
        isEditing: true,
        editForm: {
          testName: state.selectedScore.testName || '',
          testDate: state.selectedScore.testDate || '',
          grade: state.selectedScore.grade || '4年生',
          sapixRange: state.selectedScore.sapixRange || {},
        },
      },
    })
  }, [state.selectedScore?.id])

  // ============================================================
  // テスト追加（日程登録）
  // ============================================================

  const handleAddTest = async () => {
    if (!state.addForm.testName.trim()) {
      toast.error('テスト名を入力してください')
      return
    }
    const coveredUnitIds = computeCoveredUnitIds(state.addForm.sapixRange)
    const result = await addTestScore(user.uid, {
      testName: state.addForm.testName.trim(),
      testDate: state.addForm.testDate || getTodayString(),
      grade: state.addForm.grade,
      status: state.addForm.status || 'scheduled',
      sapixRange: state.addForm.sapixRange || {},
      coveredUnitIds,
      subjectPdfs: state.addForm.subjectPdfs || {},
    })
    if (result.success) {
      const label = state.addForm.status === 'completed' ? 'テストを追加しました' : 'テスト日程を登録しました'
      toast.success(label)
      dispatch({ type: 'SET_FIELDS', fields: { addForm: { ...EMPTY_ADD_FORM }, showAddForm: false } })
      await reloadScores()
    } else {
      toast.error('追加に失敗しました: ' + result.error)
    }
  }

  // ============================================================
  // 受験済みにする
  // ============================================================

  const handleMarkCompleted = async () => {
    const result = await updateTestScore(user.uid, state.selectedScore.id, {
      status: 'completed',
    })
    if (result.success) {
      toast.success('テストを受験済みにしました')
      await reloadScores()
    } else {
      toast.error('更新に失敗しました: ' + result.error)
    }
  }

  // ============================================================
  // テスト日程の編集
  // ============================================================

  const handleStartEdit = () => {
    dispatch({
      type: 'SET_FIELDS',
      fields: {
        isEditing: true,
        editForm: {
          testName: state.selectedScore.testName || '',
          testDate: state.selectedScore.testDate || '',
          grade: state.selectedScore.grade || '4年生',
          sapixRange: state.selectedScore.sapixRange || {},
        },
      },
    })
  }

  const handleSaveEdit = async () => {
    if (!state.editForm.testName.trim()) {
      toast.error('テスト名を入力してください')
      return
    }
    const coveredUnitIds = computeCoveredUnitIds(state.editForm.sapixRange)
    const result = await updateTestScore(user.uid, state.selectedScore.id, {
      testName: state.editForm.testName.trim(),
      testDate: state.editForm.testDate,
      grade: state.editForm.grade,
      sapixRange: state.editForm.sapixRange || {},
      coveredUnitIds,
    })
    if (result.success) {
      toast.success('テスト日程を更新しました')
      dispatch({ type: 'SET_FIELDS', fields: { isEditing: false, editForm: null } })
      await reloadScores()
    } else {
      toast.error('更新に失敗しました: ' + result.error)
    }
  }

  const handleCancelEdit = () => {
    dispatch({ type: 'SET_FIELDS', fields: { isEditing: false, editForm: null } })
  }

  // ============================================================
  // 追加フォーム用PDFアップロード（テスト結果直接追加モード用）
  // ============================================================

  const handleAddFormUploadPdf = async (subject, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(TOAST.PDF_ONLY)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(TOAST.FILE_TOO_LARGE)
      return
    }
    const hasAccess = await checkDriveAccess()
    if (!hasAccess) {
      const token = await refreshGoogleAccessToken()
      if (!token) {
        toast.error(TOAST.DRIVE_NOT_CONNECTED)
        return
      }
    }
    dispatch({ type: 'SET_FIELD', field: 'addUploading', value: subject })
    try {
      const driveResult = await uploadPDFToDrive(file, () => {})
      const fileUrl = `https://drive.google.com/file/d/${driveResult.driveFileId}/view`
      dispatch({ type: 'SET_ADD_FORM_SUBJECT_PDF', subject, pdf: { fileUrl, fileName: file.name } })
      toast.success(`${subject}：「${file.name}」をアップロードしました`)
    } catch (e) {
      toast.error(TOAST.UPLOAD_ERROR + e.message)
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'addUploading', value: null })
      if (addFileInputRefs.current[subject]) {
        addFileInputRefs.current[subject].value = ''
      }
    }
  }

  const handleAddFormDriveSelect = ({ url, name }) => {
    const subject = state.addDrivePickerSubject
    if (!subject || !url) return
    dispatch({ type: 'SET_ADD_FORM_SUBJECT_PDF', subject, pdf: { fileUrl: url, fileName: name } })
    dispatch({ type: 'SET_FIELD', field: 'addDrivePickerSubject', value: null })
    toast.success(`${subject}：「${name}」を紐付けました`)
  }

  // ============================================================
  // 問題キャッシュリロード（CRUD 後に呼ぶ）
  // ============================================================

  const reloadProblems = async (score = state.selectedScore) => {
    if (!user || !score) return
    const merged = await getProblemsForTestScore(user.uid, score)
    dispatch({ type: 'SET_FIELD', field: 'problemsCache', value: merged })
  }

  // テスト削除
  const handleDeleteTest = async (score) => {
    if (!window.confirm(`「${score.testName}」を削除しますか？\n関連する問題クリップと学習記録もすべて削除されます。`)) return
    await deleteProblemsBySource(user.uid, 'test', score.id)
    await deleteLessonLogsBySource(user.uid, 'test', score.id)
    const result = await deleteTestScore(user.uid, score.id)
    if (result.success) {
      toast.success('テストを削除しました')
      await reloadScores()
    } else {
      toast.error('削除に失敗しました: ' + result.error)
    }
  }

  // ============================================================
  // ヘルパー
  // ============================================================

  function getSubjectPdfs(score) {
    return score?.subjectPdfs || {}
  }

  function getPdfForSubject(subject) {
    return getSubjectPdfs(state.selectedScore)[subject] || null
  }

  // ============================================================
  // PDF紐付けハンドラ（詳細ビュー用）
  // ============================================================

  const handleUploadSubjectPdf = async (subject, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error(TOAST.PDF_ONLY)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(TOAST.FILE_TOO_LARGE)
      return
    }
    const hasAccess = await checkDriveAccess()
    if (!hasAccess) {
      const token = await refreshGoogleAccessToken()
      if (!token) {
        toast.error(TOAST.DRIVE_NOT_CONNECTED)
        return
      }
    }
    dispatch({ type: 'SET_FIELD', field: 'uploadingSubject', value: subject })
    try {
      const driveResult = await uploadPDFToDrive(file, () => {})
      const fileUrl = `https://drive.google.com/file/d/${driveResult.driveFileId}/view`
      await saveSubjectPdf(subject, fileUrl, file.name)
      toast.success(`${subject}：「${file.name}」をアップロードしました`)
    } catch (e) {
      toast.error(TOAST.UPLOAD_ERROR + e.message)
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'uploadingSubject', value: null })
      if (subjectFileInputRefs.current[subject]) {
        subjectFileInputRefs.current[subject].value = ''
      }
    }
  }

  const handleDrivePickerSelect = async ({ url, name }) => {
    const subject = state.drivePickerSubject
    if (!subject || !url) return
    await saveSubjectPdf(subject, url, name)
    dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: null })
    toast.success(`${subject}：「${name}」を紐付けました`)
  }

  const saveSubjectPdf = async (subject, fileUrl, fileName) => {
    const updated = {
      ...getSubjectPdfs(state.selectedScore),
      [subject]: { fileUrl, fileName }
    }
    const result = await updateTestScore(user.uid, state.selectedScore.id, { subjectPdfs: updated })
    if (result.success) {
      await reloadScores()
    } else {
      toast.error('保存に失敗しました')
    }
  }

  const handleDetachPdf = async (subject) => {
    const updated = { ...getSubjectPdfs(state.selectedScore) }
    delete updated[subject]
    const result = await updateTestScore(user.uid, state.selectedScore.id, { subjectPdfs: updated })
    if (result.success) {
      await reloadScores()
    }
  }

  // ============================================================
  // RENDER - テスト選択リスト
  // ============================================================

  if (!state.selectedScore) {
    const today = getTodayString()
    const scheduled = state.scores
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))

    const completed = state.scores
      .filter(s => s.status !== 'scheduled')
      .sort((a, b) => new Date(b.testDate) - new Date(a.testDate))

    const isDirectMode = state.addForm.status === 'completed'

    const renderTestItem = (score) => (
      <div key={score.id} className="test-select-item-row">
        <button
          className="test-select-item"
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: score })}
        >
          <div className="test-select-info">
            <span className="test-select-name">{score.testName}</span>
            <span className="test-select-date">{score.testDate}</span>
            <span className="test-select-grade">{score.grade}</span>
          </div>
          <div className="test-select-badges">
            {score.status === 'scheduled' && (
              <span className="badge-scheduled">予定</span>
            )}
            {score.status === 'scheduled' && score.testDate && score.testDate >= today && (
              <span className="badge-countdown">
                {(() => {
                  const days = Math.ceil((new Date(score.testDate) - new Date(today)) / 86400000)
                  return days === 0 ? '今日' : `${days}日後`
                })()}
              </span>
            )}
            {score.status === 'scheduled' && score.testDate && score.testDate < today && (
              <span className="badge-overdue">期限切れ</span>
            )}
            {score.fourSubjects?.deviation && (
              <span className="badge-deviation">偏差値 {score.fourSubjects.deviation}</span>
            )}
            {score.sapixRange && Object.values(score.sapixRange).some(c => c?.length > 0) && (
              <span className="badge-range">{summarizeSapixRange(score.sapixRange)}</span>
            )}
          </div>
          <span className="test-select-arrow">›</span>
        </button>
        <button
          className="delete-pastpaper-btn"
          onClick={() => handleDeleteTest(score)}
          title="このテストを削除"
        >🗑️</button>
      </div>
    )

    return (
      <div className="testscore-view">
        <div className="test-selector-header">
          <div className="header-title-row">
            <div>
              <h3 className="test-selector-title">テスト管理</h3>
              <p className="test-selector-desc">日程登録・テスト範囲・問題分析</p>
            </div>
            <button className="add-pastpaper-btn" onClick={() => dispatch({ type: 'SET_FIELD', field: 'showAddForm', value: !state.showAddForm })}>
              {state.showAddForm ? '✕ 閉じる' : '+ テスト日程登録'}
            </button>
          </div>
        </div>

        {/* テスト追加フォーム */}
        {state.showAddForm && (
          <div className="add-pastpaper-form">
            <h3>{isDirectMode ? '📋 テスト結果を追加' : '📅 テスト日程を登録'}</h3>

            <div className="add-form-field form-field-sm">
              <label>テスト名:</label>
              <input
                type="text"
                list="test-type-list"
                placeholder="例: 組分けテスト"
                value={state.addForm.testName}
                onChange={(e) => dispatch({ type: 'MERGE_ADD_FORM', fields: { testName: e.target.value } })}
              />
              <datalist id="test-type-list">
                {testTypes.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div className="add-form-grid-two-cols">
              <div className="add-form-field">
                <label>テスト日:</label>
                <input
                  type="date"
                  value={state.addForm.testDate}
                  onChange={(e) => dispatch({ type: 'MERGE_ADD_FORM', fields: { testDate: e.target.value } })}
                  className="form-input-common"
                />
              </div>
              <div className="add-form-field">
                <label>学年:</label>
                <select
                  value={state.addForm.grade}
                  onChange={(e) => dispatch({ type: 'MERGE_ADD_FORM', fields: { grade: e.target.value } })}
                  className="form-input-common"
                >
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* SAPIX テスト範囲 */}
            <div className="sapix-range-section">
              <label className="section-label">テスト範囲（SAPIXカリキュラム）:</label>
              {SUBJECTS.map(subject => (
                <SapixCodeInput
                  key={subject}
                  subject={subject}
                  codes={(state.addForm.sapixRange || {})[subject] || []}
                  onChange={(codes) => dispatch({ type: 'SET_ADD_FORM_SAPIX_RANGE', subject, codes })}
                />
              ))}
            </div>

            {/* テスト結果直接追加モードの場合のみ科目別PDF */}
            {isDirectMode && (
              <div className="add-form-section" style={{ marginTop: '16px' }}>
                <label className="section-label">科目別PDF（任意）:</label>
                <div className="subject-pdf-slots">
                  {SUBJECTS.map(subject => {
                    const pdf = (state.addForm.subjectPdfs || {})[subject]
                    const isUploading = state.addUploading === subject
                    return (
                      <div key={subject} className="subject-pdf-slot">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden-input"
                          ref={el => { addFileInputRefs.current[subject] = el }}
                          onChange={e => handleAddFormUploadPdf(subject, e.target.files[0])}
                        />
                        <span className="subject-pdf-slot-name">{subject}</span>
                        {pdf ? (
                          <div className="subject-pdf-slot-linked">
                            <a
                              href={pdf.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="subject-pdf-slot-filename"
                              title={pdf.fileName}
                            >
                              {pdf.fileName}
                            </a>
                            <button
                              className="pdf-attach-change"
                              onClick={() => addFileInputRefs.current[subject]?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? '...' : '変更'}
                            </button>
                            <button
                              className="pdf-attach-remove"
                              onClick={() => dispatch({ type: 'REMOVE_ADD_FORM_SUBJECT_PDF', subject })}
                            >✕</button>
                          </div>
                        ) : (
                          <div className="subject-pdf-slot-buttons">
                            <button
                              className="pdf-attach-add"
                              onClick={() => addFileInputRefs.current[subject]?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
                            </button>
                            <button
                              className="pdf-attach-drive"
                              onClick={() => dispatch({ type: 'SET_FIELD', field: 'addDrivePickerSubject', value: subject })}
                              disabled={isUploading}
                            >
                              {LABELS.DRIVE_SELECT}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="add-form-actions">
              <button
                className="btn-secondary"
                onClick={() => dispatch({ type: 'SET_FIELDS', fields: { showAddForm: false, addForm: { ...EMPTY_ADD_FORM } } })}
              >
                {LABELS.CANCEL}
              </button>
              <button className="btn-primary" onClick={handleAddTest}>
                {isDirectMode ? '追加する' : '日程を登録'}
              </button>
            </div>

            {/* モード切り替えリンク */}
            <button
              className="mode-toggle-link"
              onClick={() => dispatch({
                type: 'MERGE_ADD_FORM',
                fields: { status: isDirectMode ? 'scheduled' : 'completed' },
              })}
            >
              {isDirectMode ? '← 日程登録モードに戻す' : 'テスト結果を直接追加 →'}
            </button>
          </div>
        )}

        {/* DriveFilePicker（追加フォーム用） */}
        {state.addDrivePickerSubject && (
          <DriveFilePicker
            onSelect={handleAddFormDriveSelect}
            onClose={() => dispatch({ type: 'SET_FIELD', field: 'addDrivePickerSubject', value: null })}
          />
        )}

        {state.scores.length === 0 && !state.showAddForm ? (
          <EmptyState
            icon="📋"
            message="テストデータがありません"
            hint="「+ テスト日程登録」からテストの日程と範囲を登録してください"
          />
        ) : (
          <>
            {/* 今後のテスト */}
            {scheduled.length > 0 && (
              <>
                <h4 className="test-section-header">今後のテスト</h4>
                <div className="test-select-list">
                  {scheduled.map(renderTestItem)}
                </div>
              </>
            )}

            {/* テスト結果 */}
            {completed.length > 0 && (
              <>
                <h4 className="test-section-header">テスト結果</h4>
                <div className="test-select-list">
                  {completed.map(renderTestItem)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー（scheduled）
  // ============================================================

  const isScheduled = state.selectedScore.status === 'scheduled'

  if (isScheduled) {
    return (
      <div className="testscore-view">
        <div className="detail-header">
          <button className="back-btn" onClick={() => {
            dispatch({ type: 'SET_FIELDS', fields: { selectedScore: null, isEditing: false, editForm: null } })
          }}>
            ← テスト一覧
          </button>
          <div className="detail-title-area">
            <span className="badge-scheduled">予定</span>
          </div>
        </div>

        {state.editForm && (
          <div className="edit-schedule-form">
            <div className="add-form-field form-field-sm">
              <label>テスト名:</label>
              <input
                type="text"
                list="test-type-list-edit"
                value={state.editForm.testName}
                onChange={(e) => dispatch({ type: 'MERGE_EDIT_FORM', fields: { testName: e.target.value } })}
              />
              <datalist id="test-type-list-edit">
                {testTypes.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div className="add-form-grid-two-cols">
              <div className="add-form-field">
                <label>テスト日:</label>
                <input
                  type="date"
                  value={state.editForm.testDate}
                  onChange={(e) => dispatch({ type: 'MERGE_EDIT_FORM', fields: { testDate: e.target.value } })}
                  className="form-input-common"
                />
              </div>
              <div className="add-form-field">
                <label>学年:</label>
                <select
                  value={state.editForm.grade}
                  onChange={(e) => dispatch({ type: 'MERGE_EDIT_FORM', fields: { grade: e.target.value } })}
                  className="form-input-common"
                >
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="sapix-range-section">
              <label className="section-label">テスト範囲:</label>
              {SUBJECTS.map(subject => (
                <SapixCodeInput
                  key={subject}
                  subject={subject}
                  codes={(state.editForm.sapixRange || {})[subject] || []}
                  onChange={(codes) => dispatch({ type: 'SET_EDIT_FORM_SAPIX_RANGE', subject, codes })}
                />
              ))}
            </div>

            {/* 科目別PDF */}
            <div className="subject-pdf-bar">
              <span className="subject-pdf-bar-label">科目別PDF（問題用紙）</span>
              <div className="subject-pdf-slots">
                {SUBJECTS.map(subject => {
                  const pdf = getPdfForSubject(subject)
                  const isUploading = state.uploadingSubject === subject
                  return (
                    <div key={subject} className="subject-pdf-slot">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden-input"
                        ref={el => { subjectFileInputRefs.current[subject] = el }}
                        onChange={e => handleUploadSubjectPdf(subject, e.target.files[0])}
                      />
                      <span className="subject-pdf-slot-name">{subject}</span>
                      {pdf ? (
                        <div className="subject-pdf-slot-linked">
                          <a
                            href={pdf.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="subject-pdf-slot-filename"
                            title={pdf.fileName}
                          >
                            {pdf.fileName}
                          </a>
                          <button
                            className="pdf-attach-change"
                            onClick={() => subjectFileInputRefs.current[subject]?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? '...' : '変更'}
                          </button>
                          <button className="pdf-attach-remove" onClick={() => handleDetachPdf(subject)}>✕</button>
                        </div>
                      ) : (
                        <div className="subject-pdf-slot-buttons">
                          <button
                            className="pdf-attach-add"
                            onClick={() => subjectFileInputRefs.current[subject]?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
                          </button>
                          <button
                            className="pdf-attach-drive"
                            onClick={() => dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: subject })}
                            disabled={isUploading}
                          >
                            {LABELS.DRIVE_SELECT}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {state.drivePickerSubject && (
              <DriveFilePicker
                onSelect={handleDrivePickerSelect}
                onClose={() => dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: null })}
              />
            )}

            <div className="add-form-actions">
              <button className="btn-mark-completed" onClick={handleMarkCompleted}>
                受験済みにする
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={() => {
                dispatch({ type: 'SET_FIELDS', fields: { selectedScore: null, isEditing: false, editForm: null } })
              }}>
                {LABELS.CANCEL}
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー（completed）
  // ============================================================

  return (
    <div className="testscore-view">
      {/* 詳細ヘッダー */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: null })}>
          ← テスト一覧
        </button>
        <div className="detail-title-area">
          <h2 className="detail-test-name">{state.selectedScore.testName}</h2>
          <span className="detail-test-date">{state.selectedScore.testDate}</span>
          {state.selectedScore.fourSubjects?.deviation && (
            <span className="detail-deviation-badge">
              4科偏差値 {state.selectedScore.fourSubjects.deviation}
            </span>
          )}
        </div>
      </div>

      {/* テスト範囲（折りたたみ） */}
      <SapixRangeDisplay sapixRange={state.selectedScore.sapixRange} collapsed />

      {/* 科目別PDF紐付けバー */}
      <div className="subject-pdf-bar">
        <span className="subject-pdf-bar-label">科目別PDF（問題用紙）</span>
        <div className="subject-pdf-slots">
          {SUBJECTS.map(subject => {
            const pdf = getPdfForSubject(subject)
            const isUploading = state.uploadingSubject === subject
            return (
              <div key={subject} className="subject-pdf-slot">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden-input"
                  ref={el => { subjectFileInputRefs.current[subject] = el }}
                  onChange={e => handleUploadSubjectPdf(subject, e.target.files[0])}
                />
                <span className="subject-pdf-slot-name">{subject}</span>
                {pdf ? (
                  <div className="subject-pdf-slot-linked">
                    <a
                      href={pdf.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="subject-pdf-slot-filename"
                      title={pdf.fileName}
                    >
                      {pdf.fileName}
                    </a>
                    <button
                      className="pdf-attach-change"
                      onClick={() => subjectFileInputRefs.current[subject]?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? '...' : '変更'}
                    </button>
                    <button className="pdf-attach-remove" onClick={() => handleDetachPdf(subject)}>✕</button>
                  </div>
                ) : (
                  <div className="subject-pdf-slot-buttons">
                    <button
                      className="pdf-attach-add"
                      onClick={() => subjectFileInputRefs.current[subject]?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
                    </button>
                    <button
                      className="pdf-attach-drive"
                      onClick={() => dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: subject })}
                      disabled={isUploading}
                    >
                      {LABELS.DRIVE_SELECT}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DriveFilePicker（科目別） */}
      {state.drivePickerSubject && (
        <DriveFilePicker
          onSelect={handleDrivePickerSelect}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: null })}
        />
      )}

      {/* 問題クリップ */}
      <ProblemClipList
        userId={user.uid}
        problems={state.problemsCache}
        onReload={() => reloadProblems()}
        sourceType="test"
        sourceId={state.selectedScore.id}
        subject=""
        multiSubject
        subjects={SUBJECTS}
        showCorrectRate
        showPoints
        collapsible={false}
        defaultExpanded
        getSubjectPdf={(subj) => {
          const pdf = getPdfForSubject(subj)
          if (!pdf) return null
          const driveFileId = extractDriveFileId(pdf.fileUrl)
          return driveFileId ? { driveFileId, fileName: pdf.fileName, fileUrl: pdf.fileUrl } : null
        }}
        taskGenInfo={{
          title: state.selectedScore.testName,
          grade: state.selectedScore.grade,
          sourceRef: { type: 'test', id: state.selectedScore.id },
        }}
        onAfterAdd={async (problemData) => {
          if (problemData.unitIds && problemData.unitIds.length > 0) {
            const evaluationKey = problemData.isCorrect ? 'blue' : 'red'
            await addLessonLogWithStats(user.uid, {
              unitIds: problemData.unitIds,
              subject: problemData.subject,
              sourceType: 'test',
              sourceId: state.selectedScore.id,
              sourceName: `${state.selectedScore.testName} 問${problemData.problemNumber}`,
              date: state.selectedScore.testDate ? new Date(state.selectedScore.testDate) : new Date(),
              performance: EVALUATION_SCORES[evaluationKey],
              evaluationKey,
              missType: problemData.isCorrect ? null : (problemData.missType || 'understanding'),
              notes: `正答率: ${problemData.correctRate || 0}%`,
            })
          }
        }}
        onUpdateStatus={async (problemId, reviewStatus) => {
          const problem = state.problemsCache.find(p => p.id === problemId)
          if (problem) {
            await updateProblem(user.uid, problem.id, typeof reviewStatus === 'object' ? reviewStatus : { reviewStatus })
          }
        }}
        onDelete={async (problemId) => {
          const problem = state.problemsCache.find(p => p.id === problemId)
          if (problem) {
            await deleteProblem(user.uid, problem.id)
          }
        }}
      />
    </div>
  )
}

export default TestScoreView
