import { useReducer, useEffect, useRef } from 'react'
import './TestScoreView.css'
import { getTodayString } from '../utils/dateUtils'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  getProblemsForTestScore,
  testTypes,
} from '../utils/testScores'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'
import {
  updateProblem,
  deleteProblem,
} from '../utils/problems'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { MAX_FILE_SIZE, SUBJECTS } from '../utils/constants'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import ProblemClipList from './ProblemClipList'
import DriveFilePicker from './DriveFilePicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { grades } from '../utils/unitsDatabase'
import EmptyState from './EmptyState'

const EMPTY_ADD_FORM = { testName: '', testDate: '', grade: '4年生', subjectPdfs: {} }

/** Google Drive URL から driveFileId を抽出 */
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
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
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_FIELDS':
      return { ...state, ...action.fields }
    case 'MERGE_ADD_FORM':
      return { ...state, addForm: { ...state.addForm, ...action.fields } }
    case 'SET_ADD_FORM_SUBJECT_PDF':
      return {
        ...state,
        addForm: {
          ...state.addForm,
          subjectPdfs: {
            ...state.addForm.subjectPdfs,
            [action.subject]: action.pdf,
          },
        },
      }
    case 'REMOVE_ADD_FORM_SUBJECT_PDF': {
      const updated = { ...state.addForm.subjectPdfs }
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

function TestScoreView({ user }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { data: scores, reload: reloadScores } = useFirestoreQuery(
    () => user ? getAllTestScores(user.uid) : null,
    [user]
  )

  const subjectFileInputRefs = useRef({}) // 科目別ファイルinput参照
  const addFileInputRefs = useRef({}) // 追加フォーム用科目別ファイルinput参照

  // scores が更新されたら state に反映
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
    if (updated) dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: updated })
  }, [state.scores])

  // ============================================================
  // テスト追加
  // ============================================================

  const handleAddTest = async () => {
    if (!state.addForm.testName.trim()) {
      toast.error('テスト名を入力してください')
      return
    }
    const result = await addTestScore(user.uid, {
      testName: state.addForm.testName.trim(),
      testDate: state.addForm.testDate || getTodayString(),
      grade: state.addForm.grade,
      subjectPdfs: state.addForm.subjectPdfs,
    })
    if (result.success) {
      toast.success('テストを追加しました')
      dispatch({ type: 'SET_FIELDS', fields: { addForm: { ...EMPTY_ADD_FORM }, showAddForm: false } })
      await reloadScores()
    } else {
      toast.error('追加に失敗しました: ' + result.error)
    }
  }

  // 追加フォーム用PDFアップロード
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

  // 追加フォーム用DriveFilePicker選択
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

  // ============================================================
  // ヘルパー
  // ============================================================

  // 科目別PDF: { subject: { fileUrl, fileName } }
  function getSubjectPdfs(score) {
    return score?.subjectPdfs || {}
  }

  // subject の PDF情報を返す（{ fileUrl, fileName } | null）
  function getPdfForSubject(subject) {
    return getSubjectPdfs(state.selectedScore)[subject] || null
  }






  // ============================================================
  // PDF紐付けハンドラ
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

  // DriveFilePickerからの選択（{ url, name } を受け取る）
  const handleDrivePickerSelect = async ({ url, name }) => {
    const subject = state.drivePickerSubject
    if (!subject || !url) return
    await saveSubjectPdf(subject, url, name)
    dispatch({ type: 'SET_FIELD', field: 'drivePickerSubject', value: null })
    toast.success(`${subject}：「${name}」を紐付けました`)
  }

  // 科目PDFの保存共通処理（fileUrl + fileName のみ保存）
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
    const sortedScores = [...state.scores].sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
    return (
      <div className="testscore-view">
        <div className="test-selector-header">
          <div className="header-title-row">
            <div>
              <h3 className="test-selector-title">テストを選択して問題を分析</h3>
              <p className="test-selector-desc">テスト名をタップすると、問題別記録が表示されます</p>
            </div>
            <button className="add-pastpaper-btn" onClick={() => dispatch({ type: 'SET_FIELD', field: 'showAddForm', value: !state.showAddForm })}>
              {state.showAddForm ? '✕ 閉じる' : '+ テスト追加'}
            </button>
          </div>
        </div>

        {/* テスト追加フォーム */}
        {state.showAddForm && (
          <div className="add-pastpaper-form">
            <h3>📝 新しいテストを追加</h3>

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

            {/* 科目別PDF */}
            <div className="add-form-section" style={{ marginTop: '16px' }}>
              <label className="section-label">📎 科目別PDF（任意）:</label>
              <div className="subject-pdf-slots">
                {SUBJECTS.map(subject => {
                  const pdf = state.addForm.subjectPdfs[subject]
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

            <div className="add-form-actions">
              <button
                className="btn-secondary"
                onClick={() => dispatch({ type: 'SET_FIELDS', fields: { showAddForm: false, addForm: { ...EMPTY_ADD_FORM } } })}
              >
                {LABELS.CANCEL}
              </button>
              <button className="btn-primary" onClick={handleAddTest}>
                追加する
              </button>
            </div>
          </div>
        )}

        {/* DriveFilePicker（追加フォーム用） */}
        {state.addDrivePickerSubject && (
          <DriveFilePicker
            onSelect={handleAddFormDriveSelect}
            onClose={() => dispatch({ type: 'SET_FIELD', field: 'addDrivePickerSubject', value: null })}
          />
        )}

        {sortedScores.length === 0 && !state.showAddForm ? (
          <EmptyState
            icon="📋"
            message="テストデータがありません"
            hint="「+ テスト追加」または「成績」タブから追加してください"
          />
        ) : (
          <div className="test-select-list">
            {sortedScores.map(score => (
              <button
                key={score.id}
                className="test-select-item"
                onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedScore', value: score })}
              >
                <div className="test-select-info">
                  <span className="test-select-name">{score.testName}</span>
                  <span className="test-select-date">{score.testDate}</span>
                  <span className="test-select-grade">{score.grade}</span>
                </div>
                <div className="test-select-badges">
                  {score.fourSubjects?.deviation && (
                    <span className="badge-deviation">偏差値 {score.fourSubjects.deviation}</span>
                  )}
                </div>
                <span className="test-select-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー
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

      {/* 科目別PDF紐付けバー */}
      <div className="subject-pdf-bar">
        <span className="subject-pdf-bar-label">📎 科目別PDF（問題用紙）</span>
        <div className="subject-pdf-slots">
          {SUBJECTS.map(subject => {
            const pdf = getPdfForSubject(subject)
            const isUploading = state.uploadingSubject === subject
            return (
              <div key={subject} className="subject-pdf-slot">
                {/* 隠しファイルinput */}
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
          // 弱点分析用に lessonLog も作成（単元が選択されている場合のみ）
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
