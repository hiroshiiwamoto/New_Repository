import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import './PastPaperView.css'
import { subjects } from '../utils/unitsDatabase'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import {
  getSessionsByTaskId,
  addPastPaperSession,
  getNextAttemptNumber,
  deleteSessionsByTaskId
} from '../utils/pastPaperSessions'
import { subjectColors, subjectEmojis } from '../utils/constants'
import { toast } from '../utils/toast'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import DriveFilePicker from './DriveFilePicker'

const MASTER_CATEGORY_ORDER = ['計算', '数の性質', '規則性', '特殊算', '速さ', '割合', '比', '平面図形', '立体図形', '場合の数', 'グラフ・論理']

const EMPTY_ADD_FORM = { schoolName: '', year: '', subject: '算数', unitIds: [], fileUrl: '', fileName: '' }
const EMPTY_EDIT_FORM = { schoolName: '', year: '', subject: '算数', unitIds: [], fileUrl: '', fileName: '' }

// タスクの unitIds を正規化（旧 unitId との後方互換）
const getTaskUnitIds = (task) =>
  task.unitIds?.length ? task.unitIds : (task.unitId ? [task.unitId] : [])

function PastPaperView({ tasks, user, customUnits = [], onAddTask, onUpdateTask, onDeleteTask }) {
  const [viewMode, setViewMode] = useState('school') // 'school' or 'unit'
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [masterUnits, setMasterUnits] = useState([])
  const [sessions, setSessions] = useState({}) // taskId -> sessions[]
  const [showSessionForm, setShowSessionForm] = useState(null) // taskId
  const [sessionForm, setSessionForm] = useState({
    studiedAt: new Date().toISOString().split('T')[0],
    score: '',
    totalScore: '',
    timeSpent: '',
    notes: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM })
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM })
  const [expandedSessions, setExpandedSessions] = useState({}) // taskId -> boolean
  const [uploading, setUploading] = useState(false)
  const [uploadTarget, setUploadTarget] = useState(null) // 'add' | taskId | null
  const [showDrivePicker, setShowDrivePicker] = useState(null) // 'add' | 'edit' | null
  const [viewingPDF, setViewingPDF] = useState(null) // { taskId, fileUrl, title }
  const [fullscreenPDF, setFullscreenPDF] = useState(null) // { fileUrl, title }
  const addFileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  // マスター単元を読み込み
  useEffect(() => {
    setMasterUnits(getStaticMasterUnits())
  }, [])

  // PDF を Google Drive にアップロードする共通処理
  const handlePDFUpload = async (file, target) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('PDFファイルのみアップロード可能です')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('ファイルサイズは20MB以下にしてください')
      return
    }

    const hasAccess = await checkDriveAccess()
    if (!hasAccess) {
      const token = await refreshGoogleAccessToken()
      if (!token) {
        toast.error('Google Drive に接続してからアップロードしてください')
        return
      }
    }

    setUploading(true)
    setUploadTarget(target)
    try {
      const result = await uploadPDFToDrive(file, () => {})
      const viewUrl = `https://drive.google.com/file/d/${result.driveFileId}/view`

      if (target === 'add') {
        setAddForm(prev => ({ ...prev, fileUrl: viewUrl, fileName: file.name }))
      } else {
        setEditForm(prev => ({ ...prev, fileUrl: viewUrl, fileName: file.name }))
      }
      toast.success('PDFをGoogle Driveにアップロードしました')
    } catch (error) {
      toast.error('アップロードエラー: ' + error.message)
    } finally {
      setUploading(false)
      setUploadTarget(null)
    }
  }

  // 過去問タスクのみフィルタリング
  const pastPaperTasks = useMemo(() => {
    return tasks.filter(
      t => t.taskType === 'pastpaper' && t.subject === selectedSubject
    )
  }, [tasks, selectedSubject])

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
    setSessions(sessionData)
  }, [user, pastPaperTasks])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 学校別にグループ化
  const groupBySchool = () => {
    const grouped = {}
    pastPaperTasks.forEach(task => {
      const school = task.schoolName || '学校名未設定'
      if (!grouped[school]) grouped[school] = []
      grouped[school].push(task)
    })
    return grouped
  }

  // 単元別にグループ化（複数unitIds対応）
  const groupByUnit = () => {
    const grouped = {}
    pastPaperTasks.forEach(task => {
      const ids = getTaskUnitIds(task)
      if (ids.length === 0) {
        grouped['未分類'] = [...(grouped['未分類'] || []), task]
      } else {
        ids.forEach(id => {
          grouped[id] = [...(grouped[id] || []), task]
        })
      }
    })
    return grouped
  }

  // 単元IDから単元名を取得
  const getUnitName = (unitId) => {
    const mu = masterUnits.find(u => u.id === unitId)
    if (mu) return mu.name
    const cu = customUnits.find(u => u.id === unitId)
    if (cu) return cu.name
    return unitId
  }

  // セッション記録フォームを開く
  const handleOpenSessionForm = (taskId) => {
    setShowSessionForm(taskId)
    setSessionForm({
      studiedAt: new Date().toISOString().split('T')[0],
      score: '',
      totalScore: '',
      timeSpent: '',
      notes: ''
    })
  }

  // セッション記録を保存
  const handleSaveSession = async (taskId) => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }

    const attemptNumber = await getNextAttemptNumber(user.uid, taskId)

    const sessionData = {
      ...sessionForm,
      attemptNumber,
      score: sessionForm.score ? parseInt(sessionForm.score) : null,
      totalScore: sessionForm.totalScore ? parseInt(sessionForm.totalScore) : null,
      timeSpent: sessionForm.timeSpent ? parseInt(sessionForm.timeSpent) : null,
    }

    const result = await addPastPaperSession(user.uid, taskId, sessionData)

    if (result.success) {
      await loadSessions()
      setShowSessionForm(null)
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
    if (!addForm.schoolName || !addForm.year) {
      toast.error('学校名と年度を入力してください')
      return
    }

    const newTask = {
      title: `${addForm.schoolName} ${addForm.year}`,
      taskType: 'pastpaper',
      subject: addForm.subject,
      grade: '全学年',
      schoolName: addForm.schoolName,
      year: addForm.year,
      unitIds: addForm.unitIds,
      fileUrl: addForm.fileUrl,
      fileName: addForm.fileName,
      dueDate: '',
      priority: 'medium'
    }

    await onAddTask(newTask)
    setAddForm({ ...EMPTY_ADD_FORM })
    setShowAddForm(false)
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
      await onDeleteTask(taskId)
      toast.success('過去問を削除しました')
    } catch (error) {
      toast.error('削除に失敗しました: ' + error.message)
    }
  }

  // 過去問タスクの編集を開始
  const handleStartEdit = (task) => {
    setEditingTaskId(task.id)
    setEditForm({
      schoolName: task.schoolName || '',
      year: task.year || '',
      subject: task.subject || '算数',
      unitIds: getTaskUnitIds(task),
      fileUrl: task.fileUrl || '',
      fileName: task.fileName || ''
    })
  }

  // 過去問タスクの編集をキャンセル
  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditForm({ ...EMPTY_EDIT_FORM })
  }

  // 過去問タスクの編集を保存
  const handleSaveEdit = async () => {
    if (!editForm.schoolName || !editForm.year) {
      toast.error('学校名と年度を入力してください')
      return
    }

    const updatedTask = {
      title: `${editForm.schoolName} ${editForm.year}`,
      schoolName: editForm.schoolName,
      year: editForm.year,
      subject: editForm.subject,
      unitIds: editForm.unitIds,
      fileUrl: editForm.fileUrl,
      fileName: editForm.fileName
    }

    await onUpdateTask(editingTaskId, updatedTask)
    setEditingTaskId(null)
    toast.success('過去問を更新しました')
  }

  // addForm の単元タグをトグル
  const toggleAddUnit = (unitId) => {
    setAddForm(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId]
    }))
  }

  // editForm の単元タグをトグル
  const toggleEditUnit = (unitId) => {
    setEditForm(prev => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter(id => id !== unitId)
        : [...prev.unitIds, unitId]
    }))
  }

  // 単元タグセレクター（共通UI）
  const renderUnitTagSelector = (subject, selectedIds, onToggle) => {
    const subjectUnits = masterUnits.filter(u => (u.subject || '算数') === subject)
    if (subjectUnits.length === 0) {
      return (
        <p className="unit-tags-empty">この教科の単元はまだ準備中です</p>
      )
    }
    return MASTER_CATEGORY_ORDER.map(cat => {
      const catUnits = subjectUnits.filter(u => u.category === cat)
      if (catUnits.length === 0) return null
      return (
        <div key={cat} className="unit-tag-category">
          <div className="unit-tag-cat-label">{cat}</div>
          <div className="unit-tag-list">
            {catUnits.map(unit => (
              <button
                key={unit.id}
                type="button"
                className={`unit-tag-btn${selectedIds.includes(unit.id) ? ' selected' : ''}`}
                onClick={() => onToggle(unit.id)}
              >
                {unit.name}
              </button>
            ))}
          </div>
        </div>
      )
    }).filter(Boolean)
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
    if (viewingPDF?.taskId === task.id) {
      setViewingPDF(null)
    } else {
      setViewingPDF({ taskId: task.id, fileUrl: task.fileUrl, title: task.title })
    }
  }

  // 学習記録の展開/折りたたみをトグル
  const toggleSessionExpanded = (taskId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  // ファイルエリア（新規アップロード or Driveから選択）
  const renderFileArea = (form, setForm, target) => {
    const isAdd = target === 'add'
    const fileInputRef = isAdd ? addFileInputRef : editFileInputRef

    if (form.fileUrl) {
      return (
        <div className="file-url-preview">
          <span className="file-url-preview-icon">📎</span>
          <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
            {form.fileName || (form.fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : form.fileUrl)}
          </a>
          <button
            type="button"
            className="clear-url-btn"
            onClick={() => setForm(prev => ({ ...prev, fileUrl: '', fileName: '' }))}
          >
            &times;
          </button>
        </div>
      )
    }

    return (
      <div className="file-upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            handlePDFUpload(e.target.files[0], target)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="pdf-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading && uploadTarget === target}
        >
          {uploading && uploadTarget === target ? 'アップロード中...' : '新規アップロード'}
        </button>
        <span className="file-or-divider">または</span>
        <button
          type="button"
          className="drive-select-btn"
          onClick={() => setShowDrivePicker(isAdd ? 'add' : 'edit')}
        >
          <svg width="16" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
            <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
          </svg>
          Driveから選択
        </button>
      </div>
    )
  }

  const groupedData = viewMode === 'school' ? groupBySchool() : groupByUnit()

  return (
    <div className="pastpaper-view">
      {/* フィルター */}
      <div className="dashboard-header">
        <div className="selection-area">
          <label>表示モード:</label>
          <button
            className={`grade-btn ${viewMode === 'school' ? 'active' : ''}`}
            onClick={() => setViewMode('school')}
          >
            学校別
          </button>
          <button
            className={`grade-btn ${viewMode === 'unit' ? 'active' : ''}`}
            onClick={() => setViewMode('unit')}
          >
            単元別
          </button>
        </div>

        <div className="subject-grid">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`pastpaper-subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
                padding: '12px',
                fontSize: '0.9rem',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                whiteSpace: 'nowrap',
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
            <h2>📄 過去問管理</h2>
            <p className="view-description">
              過去問の学習記録を管理します。同じ過去問を何度でも演習できます。
            </p>
          </div>
          <button
            className="add-pastpaper-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ 閉じる' : '+ 過去問を追加'}
          </button>
        </div>
      </div>

      {/* 過去問追加フォーム */}
      {showAddForm && (
        <div className="add-pastpaper-form">
          <h3>📝 新しい過去問を追加</h3>

          {/* 科目選択 */}
          <div className="add-form-section">
            <label className="section-label">科目:</label>
            <div className="subject-selector-inline">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  className={`subject-btn ${addForm.subject === subject ? 'active' : ''}`}
                  onClick={() => setAddForm({ ...addForm, subject, unitIds: [] })}
                  style={{
                    borderColor: addForm.subject === subject ? subjectColors[subject] : '#e2e8f0',
                    background: addForm.subject === subject ? `${subjectColors[subject]}15` : 'white',
                  }}
                >
                  <span className="subject-emoji">{subjectEmojis[subject]}</span>
                  <span>{subject}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 学校名 */}
          <div className="add-form-field" style={{ marginBottom: '12px' }}>
            <label>学校名:</label>
            <input
              type="text"
              placeholder="例: 開成中学校"
              value={addForm.schoolName}
              onChange={(e) => setAddForm({ ...addForm, schoolName: e.target.value })}
            />
          </div>

          {/* 年度 */}
          <div className="add-form-field" style={{ marginBottom: '16px' }}>
            <label>年度:</label>
            <input
              type="text"
              placeholder="例: 2024年度"
              value={addForm.year}
              onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
            />
          </div>

          {/* 問題ファイル */}
          <div className="add-form-section">
            <label className="section-label">問題ファイル（任意）:</label>
            {renderFileArea(addForm, setAddForm, 'add')}
            <small className="input-hint">
              PDFを新規アップロード、またはGoogle Driveの既存ファイルを選択
            </small>
          </div>

          {/* 単元タグ */}
          <div className="add-form-section">
            <label className="section-label">
              単元タグ（任意）:
              {addForm.unitIds.length > 0 && (
                <span className="unit-selected-count">{addForm.unitIds.length}個選択中</span>
              )}
            </label>
            <div className="unit-tags-selector">
              {renderUnitTagSelector(addForm.subject, addForm.unitIds, toggleAddUnit)}
            </div>
          </div>

          <div className="add-form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                setAddForm({ ...EMPTY_ADD_FORM })
              }}
            >
              キャンセル
            </button>
            <button className="btn-primary" onClick={handleAddPastPaper}>
              ✓ 追加する
            </button>
          </div>
        </div>
      )}

      {/* タスク一覧 */}
      <div className="pastpaper-content">
        {Object.keys(groupedData).length === 0 ? (
          <div className="no-data">
            📝 この条件の過去問タスクがありません
            <br />
            <small>「+ 過去問を追加」から追加してください</small>
          </div>
        ) : (
          Object.entries(groupedData).map(([key, taskList]) => (
            <div key={key} className="pastpaper-group">
              <h3 className="group-title">
                {viewMode === 'school' ? `🏫 ${key}` : `📚 ${key === '未分類' ? '未分類' : getUnitName(key)}`}
                <span className="task-count">({taskList.length}問)</span>
              </h3>

              <div className="task-cards">
                {taskList.map(task => {
                  const taskSessions = (sessions[task.id] || []).sort((a, b) => a.attemptNumber - b.attemptNumber)
                  const lastSession = taskSessions[taskSessions.length - 1]
                  const taskUnitIds = getTaskUnitIds(task)

                  return (
                    <div key={task.id} className="pastpaper-card">
                      {editingTaskId === task.id ? (
                        // 編集モード
                        <div className="edit-form-container">
                          <h4>📝 過去問を編集</h4>

                          {/* 科目選択 */}
                          <div className="edit-form-section">
                            <label className="section-label">科目:</label>
                            <div className="subject-selector-inline">
                              {subjects.map((subject) => (
                                <button
                                  key={subject}
                                  type="button"
                                  className={`subject-btn ${editForm.subject === subject ? 'active' : ''}`}
                                  onClick={() => setEditForm({ ...editForm, subject, unitIds: [] })}
                                  style={{
                                    borderColor: editForm.subject === subject ? subjectColors[subject] : '#e2e8f0',
                                    background: editForm.subject === subject ? `${subjectColors[subject]}15` : 'white',
                                  }}
                                >
                                  <span className="subject-emoji">{subjectEmojis[subject]}</span>
                                  <span>{subject}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 学校名 */}
                          <div className="edit-form-field" style={{ marginBottom: '12px' }}>
                            <label>学校名:</label>
                            <input
                              type="text"
                              value={editForm.schoolName}
                              onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                            />
                          </div>

                          {/* 年度 */}
                          <div className="edit-form-field" style={{ marginBottom: '16px' }}>
                            <label>年度:</label>
                            <input
                              type="text"
                              value={editForm.year}
                              onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                            />
                          </div>

                          {/* 問題ファイル */}
                          <div className="edit-form-section">
                            <label className="section-label">問題ファイル（任意）:</label>
                            {renderFileArea(editForm, setEditForm, task.id)}
                            <small className="input-hint">
                              PDFを新規アップロード、またはGoogle Driveの既存ファイルを選択
                            </small>
                          </div>

                          {/* 単元タグ */}
                          <div className="edit-form-section">
                            <label className="section-label">
                              単元タグ（任意）:
                              {editForm.unitIds.length > 0 && (
                                <span className="unit-selected-count">{editForm.unitIds.length}個選択中</span>
                              )}
                            </label>
                            <div className="unit-tags-selector">
                              {renderUnitTagSelector(editForm.subject, editForm.unitIds, toggleEditUnit)}
                            </div>
                          </div>

                          <div className="edit-form-actions">
                            <button className="btn-secondary" onClick={handleCancelEdit}>
                              キャンセル
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
                                  className={`pdf-view-btn ${viewingPDF?.taskId === task.id ? 'active' : ''}`}
                                  onClick={() => handleViewPDF(task)}
                                  title="PDFを表示"
                                >
                                  {viewingPDF?.taskId === task.id ? '✕ 閉じる' : '📄 PDF表示'}
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
                      {editingTaskId !== task.id && viewingPDF?.taskId === task.id && (
                        <div className="pdf-preview-panel">
                          <div className="pdf-preview-header">
                            <span className="pdf-preview-title">📄 {viewingPDF.title}</span>
                            <div className="pdf-preview-actions">
                              <button
                                className="pdf-fullscreen-btn"
                                onClick={() => setFullscreenPDF({ fileUrl: viewingPDF.fileUrl, title: viewingPDF.title })}
                                title="フルスクリーン表示"
                              >
                                ⛶
                              </button>
                              <a
                                href={viewingPDF.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pdf-open-newtab-btn"
                              >
                                新しいタブで開く
                              </a>
                              <button
                                className="pdf-preview-close"
                                onClick={() => setViewingPDF(null)}
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                          <div className="pdf-preview-container">
                            <iframe
                              src={getEmbedUrl(viewingPDF.fileUrl)}
                              title={`PDF: ${viewingPDF.title}`}
                              className="pdf-preview-iframe"
                              allow="autoplay"
                            />
                          </div>
                        </div>
                      )}

                      {/* 最新の学習記録 */}
                      {editingTaskId !== task.id && lastSession && (
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
                      {editingTaskId !== task.id && taskSessions.length > 0 && (
                        <button
                          className="toggle-sessions-btn"
                          onClick={() => toggleSessionExpanded(task.id)}
                        >
                          {expandedSessions[task.id] ? '▼' : '▶'} 学習記録 ({taskSessions.length}回)
                        </button>
                      )}

                      {/* セッション一覧 */}
                      {editingTaskId !== task.id && expandedSessions[task.id] && taskSessions.length > 0 && (
                        <div className="sessions-list">
                          {taskSessions.map(session => (
                            <div key={session.firestoreId} className="session-item">
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
                      {editingTaskId !== task.id && showSessionForm === task.id ? (
                        <div className="session-form">
                          <h4>📝 学習記録を追加</h4>
                          <div className="form-grid">
                            <div className="form-field">
                              <label>実施日:</label>
                              <input
                                type="date"
                                value={sessionForm.studiedAt}
                                onChange={(e) => setSessionForm({ ...sessionForm, studiedAt: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>得点:</label>
                              <div className="score-inputs">
                                <input
                                  type="number"
                                  placeholder="得点"
                                  value={sessionForm.score}
                                  onChange={(e) => setSessionForm({ ...sessionForm, score: e.target.value })}
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  placeholder="満点"
                                  value={sessionForm.totalScore}
                                  onChange={(e) => setSessionForm({ ...sessionForm, totalScore: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="form-field">
                              <label>所要時間（分）:</label>
                              <input
                                type="number"
                                placeholder="分"
                                value={sessionForm.timeSpent}
                                onChange={(e) => setSessionForm({ ...sessionForm, timeSpent: e.target.value })}
                              />
                            </div>
                            <div className="form-field full">
                              <label>メモ:</label>
                              <textarea
                                placeholder="間違えた問題、気づきなど..."
                                value={sessionForm.notes}
                                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                rows="3"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => setShowSessionForm(null)}
                            >
                              キャンセル
                            </button>
                            <button
                              className="btn-primary"
                              onClick={() => handleSaveSession(task.id)}
                            >
                              ✓ 記録する
                            </button>
                          </div>
                        </div>
                      ) : editingTaskId !== task.id ? (
                        <button
                          className="add-session-btn"
                          onClick={() => handleOpenSessionForm(task.id)}
                        >
                          + 学習記録を追加
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PDFフルスクリーン表示 */}
      {fullscreenPDF && (
        <div className="pdf-fullscreen-overlay" onClick={() => setFullscreenPDF(null)}>
          <div className="pdf-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-fullscreen-header">
              <span className="pdf-fullscreen-title">📄 {fullscreenPDF.title}</span>
              <div className="pdf-fullscreen-actions">
                <a
                  href={fullscreenPDF.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-open-newtab-btn"
                >
                  新しいタブで開く
                </a>
                <button
                  className="pdf-fullscreen-close"
                  onClick={() => setFullscreenPDF(null)}
                >
                  &times;
                </button>
              </div>
            </div>
            <iframe
              src={getEmbedUrl(fullscreenPDF.fileUrl)}
              title={`PDF: ${fullscreenPDF.title}`}
              className="pdf-fullscreen-iframe"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Google Drive ファイルピッカー */}
      {showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => {
            if (showDrivePicker === 'add') {
              setAddForm(prev => ({ ...prev, fileUrl: data.url, fileName: data.name }))
            } else if (showDrivePicker === 'edit') {
              setEditForm(prev => ({ ...prev, fileUrl: data.url, fileName: data.name }))
            }
            setShowDrivePicker(null)
          }}
          onClose={() => setShowDrivePicker(null)}
        />
      )}
    </div>
  )
}

export default PastPaperView
