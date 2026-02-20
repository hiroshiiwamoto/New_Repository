import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react'
import './SapixTextView.css'
import { grades } from '../utils/unitsDatabase'
import { subjectColors, subjectEmojis, MAX_FILE_SIZE, SUBJECTS } from '../utils/constants'
import { getSapixTexts, addSapixText, updateSapixText, deleteSapixText } from '../utils/sapixTexts'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import DriveFilePicker from './DriveFilePicker'
import UnitTagPicker from './UnitTagPicker'
import { addLessonLogWithStats, EVALUATION_SCORES, EVALUATION_LABELS } from '../utils/lessonLogs'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import EmptyState from './EmptyState'
import {
  getProblemsBySource,
  deleteProblemsBySource,
} from '../utils/problems'
import ProblemClipList from './ProblemClipList'

const defaultFormState = {
  textName: '',
  textNumber: '',
  subject: '算数',
  grade: '4年生',
  unitIds: [],
  fileUrl: '',
  fileName: '',
  scannedText: '',
  studyDate: '',
}

const initialState = {
  texts: [],
  selectedSubject: '算数',
  showAddForm: false,
  editingId: null,
  viewingPDF: null,
  fullscreenPDF: null,
  uploading: false,
  showDrivePicker: null, // 'add' | 'edit' | null
  expandedText: null, // スキャンテキスト展開中のID
  evaluating: null, // 評価処理中の id
  problems: {}, // textId -> problems[]
  addForm: { ...defaultFormState },
  editForm: { ...defaultFormState },
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_FIELDS':
      return { ...state, ...action.fields }
    case 'RESET_ADD_FORM':
      return { ...state, addForm: { ...defaultFormState } }
    case 'RESET_EDIT_FORM':
      return { ...state, editForm: { ...defaultFormState } }
    default:
      return state
  }
}

function SapixTextView({ user }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // 単元IDから単元名へのマップ
  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])

  const addFileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  // テキスト一覧を読み込み
  const loadTexts = useCallback(async () => {
    if (!user) return
    const result = await getSapixTexts(user.uid)
    if (result.success) {
      dispatch({ type: 'SET_FIELD', field: 'texts', value: result.data })
      // 全テキストの問題数を事前ロード（バッジ表示用）
      for (const text of result.data) {
        const pResult = await getProblemsBySource(user.uid, 'textbook', text.id)
        if (pResult.success) {
          dispatch({ type: 'SET_FIELD', field: 'problems', value: { ...state.problems, [text.id]: pResult.data } })
        }
      }
    }
  }, [user])

  useEffect(() => {
    loadTexts()
  }, [loadTexts])

  // 科目でフィルタリング
  const filteredTexts = state.texts.filter(t => t.subject === state.selectedSubject)

  // PDF アップロード
  const handlePDFUpload = async (file, target) => {
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
    dispatch({ type: 'SET_FIELD', field: 'uploading', value: true })
    try {
      const result = await uploadPDFToDrive(file, () => {})
      const viewUrl = `https://drive.google.com/file/d/${result.driveFileId}/view`
      if (target === 'add') {
        dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, fileUrl: viewUrl, fileName: file.name } })
      } else {
        dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, fileUrl: viewUrl, fileName: file.name } })
      }
      toast.success(TOAST.UPLOAD_SUCCESS)
    } catch (error) {
      toast.error(TOAST.UPLOAD_ERROR + error.message)
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'uploading', value: false })
    }
  }

  // Google Drive URLから埋め込みプレビューURLを生成
  const getEmbedUrl = (fileUrl) => {
    if (!fileUrl) return null
    const match = fileUrl.match(/\/file\/d\/([^/]+)/)
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`
    }
    return fileUrl
  }

  // ── 問題ログ読み込み ────────────────────────────────────────
  const loadProblems = async (textId) => {
    if (!user) return
    const result = await getProblemsBySource(user.uid, 'textbook', textId)
    if (result.success) {
      dispatch({ type: 'SET_FIELD', field: 'problems', value: { ...state.problems, [textId]: result.data } })
    }
  }

  // 評価ボタン（🔵/🟡/🔴）押下
  const handleEvaluate = async (text, evalKey) => {
    if (!text.unitIds?.length) {
      toast.error('単元タグが設定されていません。編集から単元タグを追加してください。')
      return
    }
    dispatch({ type: 'SET_FIELD', field: 'evaluating', value: text.id })
    try {
      const textProblems = state.problems[text.id] || []
      const result = await addLessonLogWithStats(user.uid, {
        unitIds: text.unitIds,
        sourceType: 'sapixTask',
        sourceId: text.id,
        sourceName: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
        date: new Date(),
        performance: EVALUATION_SCORES[evalKey],
        evaluationKey: evalKey,
        problemIds: textProblems.map(p => p.id),
      })
      if (result.success) {
        toast.success(`評価を記録しました: ${EVALUATION_LABELS[evalKey]}`)
      } else {
        toast.error('評価の記録に失敗しました: ' + result.error)
        console.error('addLessonLogWithStats failed:', result.error)
      }
    } catch (err) {
      toast.error('評価の記録に失敗しました')
      console.error(err)
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'evaluating', value: null })
    }
  }

  // テキスト追加
  const handleAdd = async () => {
    if (!state.addForm.textName.trim()) {
      toast.error('テキスト名を入力してください')
      return
    }
    const result = await addSapixText(user.uid, {
      textName: state.addForm.textName.trim(),
      textNumber: state.addForm.textNumber.trim(),
      subject: state.addForm.subject,
      grade: state.addForm.grade,
      unitIds: state.addForm.unitIds,
      fileUrl: state.addForm.fileUrl,
      fileName: state.addForm.fileName,
      scannedText: state.addForm.scannedText,
      studyDate: state.addForm.studyDate,
    })
    if (result.success) {
      toast.success('SAPIXテキストを追加しました')
      dispatch({ type: 'RESET_ADD_FORM' })
      dispatch({ type: 'SET_FIELD', field: 'showAddForm', value: false })
      await loadTexts()
    } else {
      toast.error('追加に失敗しました: ' + result.error)
    }
  }

  // テキスト編集開始
  const handleStartEdit = (text) => {
    dispatch({ type: 'SET_FIELDS', fields: {
      editingId: text.id,
      editForm: {
        textName: text.textName || '',
        textNumber: text.textNumber || '',
        subject: text.subject || '算数',
        grade: text.grade || '4年生',
        unitIds: text.unitIds || [],
        fileUrl: text.fileUrl || '',
        fileName: text.fileName || '',
        scannedText: text.scannedText || '',
        studyDate: text.studyDate || '',
      },
    }})
  }

  // テキスト編集保存
  const handleSaveEdit = async () => {
    if (!state.editForm.textName.trim()) {
      toast.error('テキスト名を入力してください')
      return
    }
    const result = await updateSapixText(user.uid, state.editingId, {
      textName: state.editForm.textName.trim(),
      textNumber: state.editForm.textNumber.trim(),
      subject: state.editForm.subject,
      grade: state.editForm.grade,
      unitIds: state.editForm.unitIds,
      fileUrl: state.editForm.fileUrl,
      fileName: state.editForm.fileName,
      scannedText: state.editForm.scannedText,
      studyDate: state.editForm.studyDate,
    })
    if (result.success) {
      toast.success('更新しました')
      dispatch({ type: 'SET_FIELD', field: 'editingId', value: null })
      await loadTexts()
    } else {
      toast.error('更新に失敗しました: ' + result.error)
    }
  }

  // テキスト削除
  const handleDelete = async (text) => {
    if (!window.confirm(`「${text.textName}」を削除しますか？`)) return
    await deleteProblemsBySource(user.uid, 'textbook', text.id)
    const result = await deleteSapixText(user.uid, text.id)
    if (result.success) {
      toast.success('削除しました')
      if (state.viewingPDF?.id === text.id) dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: null })
      await loadTexts()
    } else {
      toast.error('削除に失敗しました: ' + result.error)
    }
  }

  // PDFビューワー
  const handleViewPDF = (text) => {
    if (state.viewingPDF?.id === text.id) {
      dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: null })
    } else {
      dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: { id: text.id, fileUrl: text.fileUrl, title: text.textName } })
    }
  }

  // フォームの単元タグピッカー（共通）
  const renderUnitSelector = (form, formField) => {
    return (
      <>
        <div className="sapix-form-section">
          <label className="sapix-section-label">学年:</label>
          <div className="sapix-grade-selector">
            {grades.map(g => (
              <button
                key={g}
                type="button"
                className={`sapix-grade-btn ${form.grade === g ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'SET_FIELD', field: formField, value: { ...form, grade: g } })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="sapix-form-section">
          <label className="sapix-section-label">単元タグ（複数選択可）:</label>
          <UnitTagPicker
            subject={form.subject}
            value={form.unitIds}
            onChange={(unitIds) => dispatch({ type: 'SET_FIELD', field: formField, value: { ...form, unitIds } })}
          />
        </div>
      </>
    )
  }

  // PDFアップロード/選択UI（共通）
  const renderFileUpload = (form, formField, target) => (
    <div className="sapix-form-section">
      <label className="sapix-section-label">問題PDF（任意）:</label>
      {form.fileUrl ? (
        <div className="sapix-file-preview">
          <span>📎</span>
          <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
            {form.fileName || (form.fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : form.fileUrl)}
          </a>
          <button type="button" onClick={() => dispatch({ type: 'SET_FIELD', field: formField, value: { ...form, fileUrl: '', fileName: '' } })}>&times;</button>
        </div>
      ) : (
        <div className="sapix-file-upload-area">
          <input
            ref={target === 'add' ? addFileInputRef : editFileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden-input"
            onChange={(e) => { handlePDFUpload(e.target.files[0], target); e.target.value = '' }}
          />
          <button
            type="button"
            className="sapix-upload-btn"
            onClick={() => (target === 'add' ? addFileInputRef : editFileInputRef).current?.click()}
            disabled={state.uploading}
          >
            {state.uploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
          </button>
          <span className="sapix-or">または</span>
          <button
            type="button"
            className="sapix-drive-btn"
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: target })}
          >
            {LABELS.DRIVE_SELECT}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="sapix-text-view">
      {/* 科目フィルター */}
      <div className="dashboard-header">
        <div className="subject-grid">
          {SUBJECTS.map(subject => (
            <button
              key={subject}
              className={`pastpaper-subject-btn subject-btn-common ${state.selectedSubject === subject ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedSubject', value: subject })}
              style={{
                borderColor: state.selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: state.selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
              }}
            >
              <span className="subject-emoji">{subjectEmojis[subject]}</span>
              <span>{subject}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="view-header">
        <div className="header-title-row">
          <div>
            <h2>📘 SAPIXテキスト</h2>
            <p className="view-description">
              SAPIXテキスト・プリントをスキャン管理。単元タグ付きでPDF閲覧できます。
            </p>
          </div>
          <button className="add-pastpaper-btn" onClick={() => dispatch({ type: 'SET_FIELD', field: 'showAddForm', value: !state.showAddForm })}>
            {state.showAddForm ? '✕ 閉じる' : '+ テキスト追加'}
          </button>
        </div>
      </div>

      {/* 追加フォーム */}
      {state.showAddForm && (
        <div className="add-pastpaper-form">
          <h3>📝 新しいSAPIXテキストを追加</h3>

          {/* 科目選択 */}
          <div className="sapix-form-section">
            <label className="sapix-section-label">科目:</label>
            <div className="subject-selector-inline">
              {SUBJECTS.map(subject => (
                <button
                  key={subject}
                  type="button"
                  className={`subject-btn subject-btn-common ${state.addForm.subject === subject ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, subject, unitIds: [] } })}
                  style={{
                    borderColor: state.addForm.subject === subject ? subjectColors[subject] : '#e2e8f0',
                    background: state.addForm.subject === subject ? `${subjectColors[subject]}15` : 'white',
                  }}
                >
                  <span className="subject-emoji">{subjectEmojis[subject]}</span>
                  <span>{subject}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="add-form-grid-two-cols">
            <div className="add-form-field">
              <label>テキスト名:</label>
              <input
                type="text"
                placeholder="例: デイリーサピックス"
                value={state.addForm.textName}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, textName: e.target.value } })}
              />
            </div>
            <div className="add-form-field">
              <label>番号:</label>
              <input
                type="text"
                placeholder="例: No.23"
                value={state.addForm.textNumber}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, textNumber: e.target.value } })}
              />
            </div>
          </div>

          <div className="add-form-field">
            <label>学習日（任意）:</label>
            <input
              type="date"
              value={state.addForm.studyDate}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, studyDate: e.target.value } })}
              className="form-input-common"
            />
          </div>

          {renderFileUpload(state.addForm, 'addForm', 'add')}
          {renderUnitSelector(state.addForm, 'addForm')}

          {/* スキャンテキスト */}
          <div className="sapix-form-section">
            <label className="sapix-section-label">スキャンテキスト（任意）:</label>
            <textarea
              className="sapix-scanned-text-input"
              placeholder="OCRでスキャンしたテキストをここに貼り付け..."
              value={state.addForm.scannedText}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, scannedText: e.target.value } })}
              rows="5"
            />
          </div>

          <div className="add-form-actions">
            <button
              className="btn-secondary"
              onClick={() => dispatch({ type: 'SET_FIELDS', fields: { showAddForm: false, addForm: { ...defaultFormState } } })}
            >
              {LABELS.CANCEL}
            </button>
            <button className="btn-primary" onClick={handleAdd}>
              追加する
            </button>
          </div>
        </div>
      )}

      {/* テキスト一覧 */}
      <div className="sapix-text-list">
        {filteredTexts.length === 0 ? (
          <EmptyState
            icon="📘"
            message="この科目のSAPIXテキストがありません"
            hint="「+ テキスト追加」からテキストを登録してください"
          />
        ) : (
          filteredTexts.map(text => (
            <div key={text.id} className="sapix-text-card">
              {state.editingId === text.id ? (
                /* 編集モード */
                <div className="edit-form-container">
                  <h4>📝 テキストを編集</h4>
                  <div className="sapix-form-section">
                    <label className="sapix-section-label">科目:</label>
                    <div className="subject-selector-inline">
                      {SUBJECTS.map(subject => (
                        <button
                          key={subject}
                          type="button"
                          className={`subject-btn subject-btn-common ${state.editForm.subject === subject ? 'active' : ''}`}
                          onClick={() => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, subject, unitIds: [] } })}
                          style={{
                            borderColor: state.editForm.subject === subject ? subjectColors[subject] : '#e2e8f0',
                            background: state.editForm.subject === subject ? `${subjectColors[subject]}15` : 'white',
                          }}
                        >
                          <span className="subject-emoji">{subjectEmojis[subject]}</span>
                          <span>{subject}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="add-form-grid-two-cols">
                    <div className="add-form-field">
                      <label>テキスト名:</label>
                      <input type="text" value={state.editForm.textName} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, textName: e.target.value } })} />
                    </div>
                    <div className="add-form-field">
                      <label>番号:</label>
                      <input type="text" value={state.editForm.textNumber} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, textNumber: e.target.value } })} />
                    </div>
                  </div>
                  <div className="add-form-field">
                    <label>学習日（任意）:</label>
                    <input
                      type="date"
                      value={state.editForm.studyDate}
                      onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, studyDate: e.target.value } })}
                      className="form-input-common"
                    />
                  </div>
                  {renderFileUpload(state.editForm, 'editForm', 'edit')}
                  {renderUnitSelector(state.editForm, 'editForm')}
                  <div className="sapix-form-section">
                    <label className="sapix-section-label">スキャンテキスト:</label>
                    <textarea
                      className="sapix-scanned-text-input"
                      value={state.editForm.scannedText}
                      onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, scannedText: e.target.value } })}
                      rows="5"
                    />
                  </div>
                  <div className="edit-form-actions">
                    <button className="btn-secondary" onClick={() => dispatch({ type: 'SET_FIELD', field: 'editingId', value: null })}>{LABELS.CANCEL}</button>
                    <button className="btn-primary" onClick={handleSaveEdit}>保存</button>
                  </div>
                </div>
              ) : (
                /* 通常表示 */
                <>
                  <div className="sapix-text-card-header">
                    <div className="sapix-text-info">
                      <span className="sapix-text-name">
                        {text.textName}
                        {text.textNumber && <span className="sapix-text-number">{text.textNumber}</span>}
                        {text.studyDate && <span className="sapix-study-date">📅 {text.studyDate}</span>}
                      </span>
                      {(text.unitIds?.length > 0) && (
                        <div className="sapix-unit-tags">
                          {text.unitIds.map(uid => (
                            <span key={uid} className="sapix-unit-badge">{unitNameMap[uid] || uid}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="sapix-text-actions">
                      {text.fileUrl && (
                        <button
                          className={`pdf-view-btn ${state.viewingPDF?.id === text.id ? 'active' : ''}`}
                          onClick={() => handleViewPDF(text)}
                        >
                          {state.viewingPDF?.id === text.id ? '✕ 閉じる' : '📄 PDF表示'}
                        </button>
                      )}
                      {text.scannedText && (
                        <button
                          className={`sapix-scan-toggle ${state.expandedText === text.id ? 'active' : ''}`}
                          onClick={() => dispatch({ type: 'SET_FIELD', field: 'expandedText', value: state.expandedText === text.id ? null : text.id })}
                        >
                          {state.expandedText === text.id ? '✕ テキスト閉じる' : '📝 テキスト表示'}
                        </button>
                      )}
                      <button className="edit-pastpaper-btn" onClick={() => handleStartEdit(text)} title="編集">✏️</button>
                      <button className="delete-pastpaper-btn" onClick={() => handleDelete(text)} title="削除">🗑️</button>
                    </div>
                  </div>

                  {/* PDFプレビュー */}
                  {state.viewingPDF?.id === text.id && (
                    <div className="pdf-preview-panel">
                      <div className="pdf-preview-header">
                        <span className="pdf-preview-title">📄 {state.viewingPDF.title}</span>
                        <div className="pdf-preview-actions">
                          <button
                            className="pdf-fullscreen-btn"
                            onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: { fileUrl: state.viewingPDF.fileUrl, title: state.viewingPDF.title } })}
                          >
                            ⛶
                          </button>
                          <a href={state.viewingPDF.fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-newtab-btn">
                            新しいタブで開く
                          </a>
                          <button className="pdf-preview-close" onClick={() => dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: null })}>&times;</button>
                        </div>
                      </div>
                      <div className="pdf-preview-container">
                        <iframe
                          src={getEmbedUrl(state.viewingPDF.fileUrl)}
                          title={`PDF: ${state.viewingPDF.title}`}
                          className="pdf-preview-iframe"
                          allow="autoplay"
                        />
                      </div>
                    </div>
                  )}

                  {/* 評価ボタン */}
                  <div className="sapix-eval-row">
                    <span className="sapix-eval-label">評価:</span>
                    {['blue', 'yellow', 'red'].map(key => (
                      <button
                        key={key}
                        className="sapix-eval-btn"
                        disabled={state.evaluating === text.id}
                        onClick={() => handleEvaluate(text, key)}
                        title={EVALUATION_LABELS[key]}
                      >
                        {key === 'blue' ? '🔵' : key === 'yellow' ? '🟡' : '🔴'}
                      </button>
                    ))}
                    {state.evaluating === text.id && (
                      <span className="sapix-eval-saving">記録中...</span>
                    )}
                  </div>

                  {/* ── 問題クリップ ─────────────────────── */}
                  <ProblemClipList
                    userId={user.uid}
                    problems={state.problems[text.id] || []}
                    onReload={() => loadProblems(text.id)}
                    sourceType="textbook"
                    sourceId={text.id}
                    subject={text.subject}
                    defaultUnitIds={text.unitIds || []}
                    pdfInfo={(() => {
                      const id = text.fileUrl?.match(/\/file\/d\/([^/?]+)/)?.[1]
                      return id ? { driveFileId: id, fileName: text.fileName || text.textName } : null
                    })()}
                    taskGenInfo={{
                      title: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
                      grade: text.grade,
                      fileUrl: text.fileUrl,
                      fileName: text.fileName,
                      sourceRef: { type: 'textbook', id: text.id },
                    }}
                  />
                  {/* ─────────────────────────────────────────────── */}

                  {/* スキャンテキスト表示 */}
                  {state.expandedText === text.id && text.scannedText && (
                    <div className="sapix-scanned-text-display">
                      <div className="sapix-scanned-text-header">
                        <span>📝 スキャンテキスト</span>
                        <button onClick={() => dispatch({ type: 'SET_FIELD', field: 'expandedText', value: null })}>&times;</button>
                      </div>
                      <pre className="sapix-scanned-text-content">{text.scannedText}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* フルスクリーンPDF */}
      {state.fullscreenPDF && (
        <div className="pdf-fullscreen-overlay" onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: null })}>
          <div className="pdf-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-fullscreen-header">
              <span className="pdf-fullscreen-title">📄 {state.fullscreenPDF.title}</span>
              <div className="pdf-fullscreen-actions">
                <a href={state.fullscreenPDF.fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-newtab-btn">
                  新しいタブで開く
                </a>
                <button className="pdf-fullscreen-close" onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: null })}>&times;</button>
              </div>
            </div>
            <iframe
              src={getEmbedUrl(state.fullscreenPDF.fileUrl)}
              title={`PDF: ${state.fullscreenPDF.title}`}
              className="pdf-fullscreen-iframe"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Drive ファイルピッカー */}
      {state.showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => {
            if (state.showDrivePicker === 'add') {
              dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, fileUrl: data.url, fileName: data.name } })
            } else {
              dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, fileUrl: data.url, fileName: data.name } })
            }
            dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: null })
          }}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: null })}
        />
      )}

    </div>
  )
}

export default SapixTextView
