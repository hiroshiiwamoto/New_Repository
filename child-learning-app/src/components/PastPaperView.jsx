import { useReducer, useEffect, useMemo, useCallback, useRef } from 'react'
import './PastPaperView.css'
import { getTodayString } from '../utils/dateUtils'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import {
  getSessionsByTaskId,
  addPastPaperSession,
  getNextAttemptNumber,
  deleteSessionsByTaskId
} from '../utils/pastPaperSessions'
import {
  getProblemsBySource,
  deleteProblemsBySource,
  reviewStatusInfo,
  missTypeLabel,
} from '../utils/problems'
import { subjectColors, subjectEmojis, MAX_FILE_SIZE, SUBJECTS } from '../utils/constants'
import EmptyState from './EmptyState'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import DriveFilePicker from './DriveFilePicker'
import UnitTagPicker from './UnitTagPicker'
import ProblemClipList from './ProblemClipList'

const YEAR_OPTIONS = Array.from({ length: 2031 - 2000 }, (_, i) => 2000 + i)

const EMPTY_ADD_FORM = { schoolName: '', year: '', subject: '算数', unitIds: [], fileUrl: '', fileName: '', dueDate: '' }
const EMPTY_EDIT_FORM = { schoolName: '', year: '', subject: '算数', unitIds: [], fileUrl: '', fileName: '', dueDate: '' }

/** Google Drive URL から driveFileId を抽出 */
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
}

const getTaskUnitIds = (task) => task.unitIds || []

const initialState = {
  viewMode: 'school',
  selectedSubject: '算数',
  masterUnits: [],
  sessions: {},
  showSessionForm: null,
  sessionForm: {
    studiedAt: getTodayString(),
    score: '',
    totalScore: '',
    timeSpent: '',
    notes: ''
  },
  showAddForm: false,
  addForm: { ...EMPTY_ADD_FORM },
  editingTaskId: null,
  editForm: { ...EMPTY_EDIT_FORM },
  expandedSessions: {},
  uploading: false,
  uploadTarget: null,
  showDrivePicker: null,
  viewingPDF: null,
  fullscreenPDF: null,
  problems: {},
  unitDrill: null,  // { unitId, taskId, schoolName, year }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value }
    case 'SET_FIELDS': return { ...state, ...action.fields }
    case 'MERGE_PROBLEMS': return { ...state, problems: { ...state.problems, [action.taskId]: action.data } }
    default: return state
  }
}

function PastPaperView({ tasks, user, customUnits = [], onAddTask, onUpdateTask, onDeleteTask }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const addFileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  // マスター単元を読み込み
  useEffect(() => {
    dispatch({ type: 'SET_FIELD', field: 'masterUnits', value: getStaticMasterUnits() })
  }, [])

  // ── 問題ログ読み込み ──────────────────────────────────────
  const loadProblems = useCallback(async (taskId) => {
    if (!user) return
    const result = await getProblemsBySource(user.uid, 'pastPaper', taskId)
    if (result.success) {
      dispatch({ type: 'MERGE_PROBLEMS', taskId, data: result.data })
    }
  }, [user])


  // PDF を Google Drive にアップロードする共通処理
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

    dispatch({ type: 'SET_FIELDS', fields: { uploading: true, uploadTarget: target } })
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
      dispatch({ type: 'SET_FIELDS', fields: { uploading: false, uploadTarget: null } })
    }
  }

  // 過去問タスクのみフィルタリング（クリップ由来の個別問題タスクは除外）
  const pastPaperTasks = useMemo(() => {
    return tasks.filter(
      t => t.taskType === 'pastpaper' && t.subject === state.selectedSubject && !t.generatedFrom
    )
  }, [tasks, state.selectedSubject])

  // セッションデータを読み込み
  const loadSessions = useCallback(async () => {
    if (!user) return

    const sessionData = {}
    for (const task of pastPaperTasks) {
      const result = await getSessionsByTaskId(user.uid, task.id)
      if (result.success) {
        sessionData[task.id] = result.data
      }
    }
    dispatch({ type: 'SET_FIELD', field: 'sessions', value: sessionData })
  }, [user, pastPaperTasks])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 過去問タスクの問題ログを一括読み込み
  useEffect(() => {
    if (!user) return
    pastPaperTasks.forEach(task => loadProblems(task.id))
  }, [user, pastPaperTasks, loadProblems])

  // 学校別にグループ化（メモ化）
  const groupedBySchool = useMemo(() => {
    const grouped = {}
    pastPaperTasks.forEach(task => {
      const school = task.schoolName || '学校名未設定'
      if (!grouped[school]) grouped[school] = []
      grouped[school].push(task)
    })
    return grouped
  }, [pastPaperTasks])

  // 単元別ビュー用: 単元 → タスク(学校+年度)タイル → 問題一覧
  const unitTileData = useMemo(() => {
    if (state.viewMode !== 'unit') return {}
    const taskMap = {}
    pastPaperTasks.forEach(t => { taskMap[t.id] = t })

    // unitId → { taskId → { task, problems[] } }
    const grouped = {}
    for (const [taskId, problems] of Object.entries(state.problems)) {
      const task = taskMap[taskId]
      if (!task) continue
      for (const p of problems) {
        const unitIds = p.unitIds && p.unitIds.length > 0 ? p.unitIds : ['未分類']
        for (const uid of unitIds) {
          if (!grouped[uid]) grouped[uid] = {}
          if (!grouped[uid][taskId]) grouped[uid][taskId] = { task, problems: [] }
          grouped[uid][taskId].problems.push(p)
        }
      }
    }
    return grouped
  }, [state.viewMode, state.problems, pastPaperTasks])

  // 単元IDから単元名を取得
  const getUnitName = (unitId) => {
    const mu = state.masterUnits.find(u => u.id === unitId)
    if (mu) return mu.name
    const cu = customUnits.find(u => u.id === unitId)
    if (cu) return cu.name
    return unitId
  }

  // セッション記録フォームを開く
  const handleOpenSessionForm = (taskId) => {
    dispatch({ type: 'SET_FIELDS', fields: {
      showSessionForm: taskId,
      sessionForm: {
        studiedAt: getTodayString(),
        score: '',
        totalScore: '',
        timeSpent: '',
        notes: ''
      }
    }})
  }

  // セッション記録を保存
  const handleSaveSession = async (taskId) => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }

    const attemptNumber = await getNextAttemptNumber(user.uid, taskId)

    const sessionData = {
      ...state.sessionForm,
      attemptNumber,
      score: state.sessionForm.score ? parseInt(state.sessionForm.score) : null,
      totalScore: state.sessionForm.totalScore ? parseInt(state.sessionForm.totalScore) : null,
      timeSpent: state.sessionForm.timeSpent ? parseInt(state.sessionForm.timeSpent) : null,
    }

    const result = await addPastPaperSession(user.uid, taskId, sessionData)

    if (result.success) {
      await loadSessions()
      dispatch({ type: 'SET_FIELD', field: 'showSessionForm', value: null })
      toast.success('学習記録を保存しました')
    } else {
      toast.error('保存に失敗しました: ' + result.error)
    }
  }

  // 得点率を計算
  const getScorePercentage = (session) => {
    if (session.score !== null && session.totalScore && session.totalScore > 0) {
      return Math.round((session.score / session.totalScore) * 100)
    }
    return null
  }

  // 過去問タスクを追加
  const handleAddPastPaper = async () => {
    if (!state.addForm.schoolName || !state.addForm.year) {
      toast.error('学校名と年度を入力してください')
      return
    }

    const newTask = {
      title: `${state.addForm.schoolName} ${state.addForm.year}`,
      taskType: 'pastpaper',
      subject: state.addForm.subject,
      grade: '全学年',
      schoolName: state.addForm.schoolName,
      year: state.addForm.year,
      unitIds: state.addForm.unitIds,
      fileUrl: state.addForm.fileUrl,
      fileName: state.addForm.fileName,
      dueDate: state.addForm.dueDate || null,
      priority: 'medium'
    }

    await onAddTask(newTask)
    dispatch({ type: 'SET_FIELDS', fields: { addForm: { ...EMPTY_ADD_FORM }, showAddForm: false } })
    toast.success('過去問を追加しました')
  }

  // 過去問タスクを削除
  const handleDeletePastPaper = async (taskId, taskTitle) => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }

    const confirmed = window.confirm(
      `「${taskTitle}」を削除しますか？\n\nこの過去問に関連する学習記録もすべて削除されます。`
    )

    if (!confirmed) return

    try {
      const sessionResult = await deleteSessionsByTaskId(user.uid, taskId)
      if (!sessionResult.success) {
        toast.error('学習記録の削除に失敗しました: ' + sessionResult.error)
        return
      }
      // 問題ログも削除
      await deleteProblemsBySource(user.uid, 'pastPaper', taskId)
      await onDeleteTask(taskId)
      toast.success('過去問を削除しました')
    } catch (error) {
      toast.error('削除に失敗しました: ' + error.message)
    }
  }

  // 過去問タスクの編集を開始
  const handleStartEdit = (task) => {
    dispatch({ type: 'SET_FIELDS', fields: {
      editingTaskId: task.id,
      editForm: {
        schoolName: task.schoolName || '',
        year: task.year || '',
        subject: task.subject || '算数',
        unitIds: getTaskUnitIds(task),
        fileUrl: task.fileUrl || '',
        fileName: task.fileName || '',
        dueDate: task.dueDate || ''
      }
    }})
  }

  // 過去問タスクの編集をキャンセル
  const handleCancelEdit = () => {
    dispatch({ type: 'SET_FIELDS', fields: { editingTaskId: null, editForm: { ...EMPTY_EDIT_FORM } } })
  }

  // 過去問タスクの編集を保存
  const handleSaveEdit = async () => {
    if (!state.editForm.schoolName || !state.editForm.year) {
      toast.error('学校名と年度を入力してください')
      return
    }

    const updatedTask = {
      title: `${state.editForm.schoolName} ${state.editForm.year}`,
      schoolName: state.editForm.schoolName,
      year: state.editForm.year,
      subject: state.editForm.subject,
      unitIds: state.editForm.unitIds,
      fileUrl: state.editForm.fileUrl,
      fileName: state.editForm.fileName,
      dueDate: state.editForm.dueDate || null
    }

    await onUpdateTask(state.editingTaskId, updatedTask)
    dispatch({ type: 'SET_FIELD', field: 'editingTaskId', value: null })
    toast.success('過去問を更新しました')
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

  // PDFプレビューを表示
  const handleViewPDF = (task) => {
    if (state.viewingPDF?.taskId === task.id) {
      dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: null })
    } else {
      dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: { taskId: task.id, fileUrl: task.fileUrl, title: task.title } })
    }
  }

  // 学習記録の展開/折りたたみをトグル
  const toggleSessionExpanded = (taskId) => {
    dispatch({ type: 'SET_FIELD', field: 'expandedSessions', value: { ...state.expandedSessions, [taskId]: !state.expandedSessions[taskId] } })
  }

  // ファイルエリア（新規アップロード or Driveから選択）
  const renderFileArea = (form, formField, target) => {
    const isAdd = target === 'add'
    const fileInputRef = isAdd ? addFileInputRef : editFileInputRef

    if (form.fileUrl) {
      return (
        <div className="sapix-file-preview">
          <span>📎</span>
          <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
            {form.fileName || (form.fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : form.fileUrl)}
          </a>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_FIELD', field: formField, value: { ...form, fileUrl: '', fileName: '' } })}
          >
            &times;
          </button>
        </div>
      )
    }

    return (
      <div className="sapix-file-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden-input"
          onChange={(e) => {
            handlePDFUpload(e.target.files[0], target)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="sapix-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={state.uploading && state.uploadTarget === target}
        >
          {state.uploading && state.uploadTarget === target ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
        </button>
        <span className="sapix-or">または</span>
        <button
          type="button"
          className="sapix-drive-btn"
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: isAdd ? 'add' : 'edit' })}
        >
          {LABELS.DRIVE_SELECT}
        </button>
      </div>
    )
  }

  const groupedData = groupedBySchool

  return (
    <div className="pastpaper-view">
      {/* フィルター */}
      <div className="mud-header-row">
        <div className="mud-subject-tabs">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              className={`mud-subject-btn ${state.selectedSubject === subject ? 'active' : ''}`}
              style={{ '--subject-color': subjectColors[subject] }}
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'selectedSubject', value: subject })}
            >
              {subjectEmojis[subject]} {subject}
            </button>
          ))}
        </div>
        <div className="mud-header-right">
          <button
            className={`mud-mode-btn ${state.viewMode === 'school' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'viewMode', value: 'school' })}
          >
            学校別
          </button>
          <button
            className={`mud-mode-btn ${state.viewMode === 'unit' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'viewMode', value: 'unit' })}
          >
            単元別
          </button>
        </div>
      </div>

      <div className="view-header">
        <div className="header-title-row">
          <div>
            <h2>📄 過去問管理</h2>
            <p className="view-description">
              過去問の学習記録を管理します。同じ過去問を何度でも演習できます。
            </p>
          </div>
          <button
            className="add-pastpaper-btn"
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'showAddForm', value: !state.showAddForm })}
          >
            {state.showAddForm ? '✕ 閉じる' : '+ 過去問を追加'}
          </button>
        </div>
      </div>

      {/* 過去問追加フォーム */}
      {state.showAddForm && (
        <div className="add-pastpaper-form">
          <h3>📝 新しい過去問を追加</h3>

          {/* 科目選択 */}
          <div className="add-form-section">
            <label className="section-label">科目:</label>
            <div className="subject-selector-inline">
              {SUBJECTS.map((subject) => (
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

          {/* 学校名 */}
          <div className="add-form-field form-field-sm">
            <label>学校名:</label>
            <input
              type="text"
              placeholder="例: 開成中学校"
              value={state.addForm.schoolName}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, schoolName: e.target.value } })}
            />
          </div>

          {/* 年度 */}
          <div className="add-form-field form-field-md">
            <label>年度:</label>
            <select
              value={state.addForm.year}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, year: e.target.value } })}
              className="form-input-common"
            >
              <option value="">年度を選択</option>
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={`${y}年度`}>{y}年度</option>
              ))}
            </select>
          </div>

          {/* 実施日 */}
          <div className="add-form-field form-field-sm">
            <label>📅 実施日（任意）:</label>
            <input
              type="date"
              value={state.addForm.dueDate}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, dueDate: e.target.value } })}
              className="form-input-common"
            />
          </div>

          {/* 問題ファイル */}
          <div className="add-form-section">
            <label className="section-label">問題PDF（任意）:</label>
            {renderFileArea(state.addForm, 'addForm', 'add')}
          </div>

          {/* 単元タグ */}
          <div className="add-form-section">
            <label className="section-label">単元タグ（任意）:</label>
            <UnitTagPicker
              subject={state.addForm.subject}
              value={state.addForm.unitIds}
              onChange={(unitIds) => dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, unitIds } })}
            />
          </div>

          <div className="add-form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                dispatch({ type: 'SET_FIELDS', fields: { showAddForm: false, addForm: { ...EMPTY_ADD_FORM } } })
              }}
            >
              {LABELS.CANCEL}
            </button>
            <button className="btn-primary" onClick={handleAddPastPaper}>
              ✓ 追加する
            </button>
          </div>
        </div>
      )}

      {/* タスク一覧 */}
      <div className="pastpaper-content">
        {/* ── 単元別ビュー ── */}
        {state.viewMode === 'unit' ? (
          Object.keys(unitTileData).length === 0 ? (
            <EmptyState
              icon="📝"
              message="問題クリップがありません"
              hint="学校別ビューから問題を追加してください"
            />
          ) : (
            <div className="mud-categories">
              {Object.entries(unitTileData)
                .sort((a, b) => {
                  if (a[0] === '未分類') return 1
                  if (b[0] === '未分類') return -1
                  return a[0].localeCompare(b[0])
                })
                .map(([unitId, taskMap]) => {
                  const tiles = Object.entries(taskMap)
                  const allProblems = tiles.flatMap(([, d]) => d.problems)
                  const correct = allProblems.filter(p => p.isCorrect).length
                  const wrong = allProblems.length - correct
                  return (
                    <div key={unitId} className="mud-category-section">
                      <h3 className="mud-cat-title">
                        {unitId === '未分類' ? '未分類' : getUnitName(unitId)}
                        <span className="pp-unit-count">
                          {allProblems.length}問（○{correct} ✗{wrong}）
                        </span>
                      </h3>
                      <div className="mud-unit-grid">
                        {tiles.map(([taskId, { task, problems }]) => {
                          const c = problems.filter(p => p.isCorrect).length
                          const w = problems.length - c
                          const rate = problems.length > 0 ? Math.round((c / problems.length) * 100) : 0
                          const tileColor = w === 0 ? '#16a34a' : rate >= 50 ? '#ca8a04' : '#dc2626'
                          const tileBg = w === 0 ? '#f0fdf4' : rate >= 50 ? '#fefce8' : '#fef2f2'
                          const label = `${task.schoolName || '不明'}${(task.year || '').replace('年度', '')}`
                          return (
                            <button
                              key={taskId}
                              className="mud-unit-cell"
                              style={{ '--prof-color': tileColor, background: tileBg, borderColor: tileColor }}
                              onClick={() => dispatch({ type: 'SET_FIELD', field: 'unitDrill', value: { unitId, taskId, problems } })}
                            >
                              <div className="mud-unit-indicator" style={{ background: tileColor }} />
                              <div className="mud-unit-name">{label}</div>
                              <div className="mud-unit-score">{c}/{problems.length}</div>
                              <div className="mud-unit-level" style={{ color: tileColor }}>{rate}%</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        ) : (
        /* ── 学校別ビュー ── */
        Object.keys(groupedData).length === 0 ? (
          <EmptyState
            icon="📝"
            message="この条件の過去問タスクがありません"
            hint="「+ 過去問を追加」から追加してください"
          />
        ) : (
          Object.entries(groupedData).map(([key, taskList]) => (
            <div key={key} className="pastpaper-group">
              <h3 className="group-title">
                {'🏫 ' + key}
                <span className="task-count">({taskList.length}問)</span>
              </h3>

              <div className="task-cards">
                {taskList.map(task => {
                  const taskSessions = (state.sessions[task.id] || []).sort((a, b) => a.attemptNumber - b.attemptNumber)
                  const lastSession = taskSessions[taskSessions.length - 1]
                  const taskUnitIds = getTaskUnitIds(task)

                  return (
                    <div key={task.id} className={`pastpaper-card${state.editingTaskId === task.id ? ' editing' : ''}`}>
                      {state.editingTaskId === task.id ? (
                        // 編集モード
                        <div className="edit-form-container">
                          <h4>📝 過去問を編集</h4>

                          {/* 科目選択 */}
                          <div className="edit-form-section">
                            <label className="section-label">科目:</label>
                            <div className="subject-selector-inline">
                              {SUBJECTS.map((subject) => (
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

                          {/* 学校名 */}
                          <div className="edit-form-field form-field-sm">
                            <label>学校名:</label>
                            <input
                              type="text"
                              value={state.editForm.schoolName}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, schoolName: e.target.value } })}
                            />
                          </div>

                          {/* 年度 */}
                          <div className="edit-form-field form-field-md">
                            <label>年度:</label>
                            <select
                              value={state.editForm.year}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, year: e.target.value } })}
                              className="form-input-common"
                            >
                              <option value="">年度を選択</option>
                              {YEAR_OPTIONS.map(y => (
                                <option key={y} value={`${y}年度`}>{y}年度</option>
                              ))}
                            </select>
                          </div>

                          {/* 実施日 */}
                          <div className="edit-form-field form-field-sm">
                            <label>📅 実施日（任意）:</label>
                            <input
                              type="date"
                              value={state.editForm.dueDate}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, dueDate: e.target.value } })}
                              className="form-input-common"
                            />
                          </div>

                          {/* 問題ファイル */}
                          <div className="edit-form-section">
                            <label className="section-label">問題PDF（任意）:</label>
                            {renderFileArea(state.editForm, 'editForm', task.id)}
                          </div>

                          {/* 単元タグ */}
                          <div className="edit-form-section">
                            <label className="section-label">単元タグ（任意）:</label>
                            <UnitTagPicker
                              subject={state.editForm.subject}
                              value={state.editForm.unitIds}
                              onChange={(unitIds) => dispatch({ type: 'SET_FIELD', field: 'editForm', value: { ...state.editForm, unitIds } })}
                            />
                          </div>

                          <div className="edit-form-actions">
                            <button className="btn-secondary" onClick={handleCancelEdit}>
                              {LABELS.CANCEL}
                            </button>
                            <button className="btn-primary" onClick={handleSaveEdit}>
                              ✓ 保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 通常表示モード
                        <>
                          <div className="card-header">
                            <div className="task-title">
                              <span className="task-name">{task.title}</span>
                              {taskUnitIds.length > 0 && (
                                <div className="task-unit-tags">
                                  {taskUnitIds.map(id => (
                                    <span key={id} className="unit-tag">{getUnitName(id)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="card-header-actions">
                              <div className="attempt-count">
                                {taskSessions.length}回演習済み
                              </div>
                              {task.fileUrl && (
                                <button
                                  className={`pdf-view-btn ${state.viewingPDF?.taskId === task.id ? 'active' : ''}`}
                                  onClick={() => handleViewPDF(task)}
                                  title="PDFを表示"
                                >
                                  {state.viewingPDF?.taskId === task.id ? '✕ 閉じる' : '📄 PDF表示'}
                                </button>
                              )}
                              <button
                                className="edit-pastpaper-btn"
                                onClick={() => handleStartEdit(task)}
                                title="この過去問を編集"
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-pastpaper-btn"
                                onClick={() => handleDeletePastPaper(task.id, task.title)}
                                title="この過去問を削除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* PDFプレビュー（編集モードでない場合のみ表示） */}
                      {state.editingTaskId !== task.id && state.viewingPDF?.taskId === task.id && (
                        <div className="pdf-preview-panel">
                          <div className="pdf-preview-header">
                            <span className="pdf-preview-title">📄 {state.viewingPDF.title}</span>
                            <div className="pdf-preview-actions">
                              <button
                                className="pdf-fullscreen-btn"
                                onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: { fileUrl: state.viewingPDF.fileUrl, title: state.viewingPDF.title } })}
                                title="フルスクリーン表示"
                              >
                                ⛶
                              </button>
                              <a
                                href={state.viewingPDF.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pdf-open-newtab-btn"
                              >
                                新しいタブで開く
                              </a>
                              <button
                                className="pdf-preview-close"
                                onClick={() => dispatch({ type: 'SET_FIELD', field: 'viewingPDF', value: null })}
                              >
                                &times;
                              </button>
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

                      {/* 最新の学習記録 */}
                      {state.editingTaskId !== task.id && lastSession && (
                        <div className="last-session">
                          <span className="session-label">最新:</span>
                          <span className="session-date">
                            {new Date(lastSession.studiedAt).toLocaleDateString('ja-JP')}
                          </span>
                          {getScorePercentage(lastSession) !== null && (
                            <span className="session-score">
                              {getScorePercentage(lastSession)}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* 学習記録の展開/折りたたみ */}
                      {state.editingTaskId !== task.id && taskSessions.length > 0 && (
                        <button
                          className="toggle-sessions-btn"
                          onClick={() => toggleSessionExpanded(task.id)}
                        >
                          {state.expandedSessions[task.id] ? '▼' : '▶'} 学習記録 ({taskSessions.length}回)
                        </button>
                      )}

                      {/* セッション一覧 */}
                      {state.editingTaskId !== task.id && state.expandedSessions[task.id] && taskSessions.length > 0 && (
                        <div className="sessions-list">
                          {taskSessions.map(session => (
                            <div key={session.id} className="session-item">
                              <span className="session-attempt">{session.attemptNumber}回目</span>
                              <span className="session-date">
                                {new Date(session.studiedAt).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              {session.score !== null && session.totalScore && (
                                <span className="session-score">
                                  {session.score}/{session.totalScore} ({getScorePercentage(session)}%)
                                </span>
                              )}
                              {session.timeSpent && (
                                <span className="session-time">{session.timeSpent}分</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* セッション記録フォーム */}
                      {state.editingTaskId !== task.id && state.showSessionForm === task.id ? (
                        <div className="session-form">
                          <h4>📝 学習記録を追加</h4>
                          <div className="form-grid">
                            <div className="form-field">
                              <label>実施日:</label>
                              <input
                                type="date"
                                value={state.sessionForm.studiedAt}
                                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sessionForm', value: { ...state.sessionForm, studiedAt: e.target.value } })}
                              />
                            </div>
                            <div className="form-field">
                              <label>得点:</label>
                              <div className="score-inputs">
                                <input
                                  type="number"
                                  placeholder="得点"
                                  value={state.sessionForm.score}
                                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sessionForm', value: { ...state.sessionForm, score: e.target.value } })}
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  placeholder="満点"
                                  value={state.sessionForm.totalScore}
                                  onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sessionForm', value: { ...state.sessionForm, totalScore: e.target.value } })}
                                />
                              </div>
                            </div>
                            <div className="form-field">
                              <label>所要時間（分）:</label>
                              <input
                                type="number"
                                placeholder="分"
                                value={state.sessionForm.timeSpent}
                                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sessionForm', value: { ...state.sessionForm, timeSpent: e.target.value } })}
                              />
                            </div>
                            <div className="form-field full">
                              <label>メモ:</label>
                              <textarea
                                placeholder="間違えた問題、気づきなど..."
                                value={state.sessionForm.notes}
                                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sessionForm', value: { ...state.sessionForm, notes: e.target.value } })}
                                rows="3"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => dispatch({ type: 'SET_FIELD', field: 'showSessionForm', value: null })}
                            >
                              {LABELS.CANCEL}
                            </button>
                            <button
                              className="btn-primary"
                              onClick={() => handleSaveSession(task.id)}
                            >
                              ✓ 記録する
                            </button>
                          </div>
                        </div>
                      ) : state.editingTaskId !== task.id ? (
                        <button
                          className="add-session-btn"
                          onClick={() => handleOpenSessionForm(task.id)}
                        >
                          + 学習記録を追加
                        </button>
                      ) : null}

                      {/* ── 問題クリップ ─────────────────────── */}
                      {state.editingTaskId !== task.id && (
                        <ProblemClipList
                          userId={user.uid}
                          problems={state.problems[task.id] || []}
                          onReload={() => loadProblems(task.id)}
                          sourceType="pastPaper"
                          sourceId={task.id}
                          subject={task.subject}
                          defaultUnitIds={getTaskUnitIds(task)}
                          showDifficulty
                          pdfInfo={(() => {
                            const id = extractDriveFileId(task.fileUrl)
                            return id ? { driveFileId: id, fileName: task.fileName || task.title } : null
                          })()}
                          taskGenInfo={{
                            title: task.title,
                            grade: '全学年',
                            fileUrl: task.fileUrl,
                            fileName: task.fileName,
                            schoolName: task.schoolName,
                            year: task.year,
                            sourceRef: { type: 'pastPaper', id: task.id },
                          }}
                        />
                      )}
                      {/* ─────────────────────────────────────────────── */}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ))}
      </div>

      {/* 単元別タイル ドリルダウンモーダル */}
      {state.unitDrill && (
        <div className="modal-overlay-common" onClick={() => dispatch({ type: 'SET_FIELD', field: 'unitDrill', value: null })}>
          <div className="mud-modal mud-drill-modal" onClick={e => e.stopPropagation()}>
            <div className="mud-drill-header">
              <div>
                <h3>{state.unitDrill.unitId === '未分類' ? '未分類' : getUnitName(state.unitDrill.unitId)}</h3>
                <p className="mud-drill-cat">
                  {(() => {
                    const t = pastPaperTasks.find(t => t.id === state.unitDrill.taskId)
                    return t ? `${t.schoolName} ${t.year}` : ''
                  })()}
                </p>
              </div>
              <button className="mud-drill-close" onClick={() => dispatch({ type: 'SET_FIELD', field: 'unitDrill', value: null })}>×</button>
            </div>
            <div className="mud-drill-history">
              <h4>問題一覧 ({state.unitDrill.problems.length}問)</h4>
              <div className="clip-list">
                {state.unitDrill.problems.map((p, idx) => {
                  const st = reviewStatusInfo(p.reviewStatus)
                  return (
                    <div key={p.id || idx} className={`clip-item ${p.isCorrect ? 'correct' : 'incorrect'}`}>
                      <div className="clip-item-left">
                        <span className="clip-correctness">{p.isCorrect ? '○' : '✗'}</span>
                        <span className="clip-number">第{p.problemNumber}問</span>
                        {!p.isCorrect && p.missType && (
                          <span className={`clip-miss-type miss-${p.missType}`}>
                            {missTypeLabel(p.missType)}
                          </span>
                        )}
                      </div>
                      <div className="clip-item-right">
                        {p.difficulty && <span className="clip-difficulty">{'★'.repeat(p.difficulty)}</span>}
                        {p.imageUrls?.length > 0 && <span className="clip-has-image">📷</span>}
                        {!p.isCorrect && (
                          <span className="clip-review-badge" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDFフルスクリーン表示 */}
      {state.fullscreenPDF && (
        <div className="pdf-fullscreen-overlay" onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: null })}>
          <div className="pdf-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-fullscreen-header">
              <span className="pdf-fullscreen-title">📄 {state.fullscreenPDF.title}</span>
              <div className="pdf-fullscreen-actions">
                <a
                  href={state.fullscreenPDF.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-open-newtab-btn"
                >
                  新しいタブで開く
                </a>
                <button
                  className="pdf-fullscreen-close"
                  onClick={() => dispatch({ type: 'SET_FIELD', field: 'fullscreenPDF', value: null })}
                >
                  &times;
                </button>
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

      {/* Google Drive ファイルピッカー */}
      {state.showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => {
            if (state.showDrivePicker === 'add') {
              dispatch({ type: 'SET_FIELD', field: 'addForm', value: { ...state.addForm, fileUrl: data.url, fileName: data.name } })
            } else if (state.showDrivePicker === 'edit') {
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

export default PastPaperView
