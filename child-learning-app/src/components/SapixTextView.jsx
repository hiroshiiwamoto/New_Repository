import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import './SapixTextView.css'
import { subjects, grades } from '../utils/unitsDatabase'
import { subjectColors, subjectEmojis } from '../utils/constants'
import { getSapixTexts, addSapixText, updateSapixText, deleteSapixText } from '../utils/sapixTexts'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { toast } from '../utils/toast'
import DriveFilePicker from './DriveFilePicker'
import UnitTagPicker from './UnitTagPicker'
import { addLessonLogWithStats, EVALUATION_SCORES, EVALUATION_LABELS } from '../utils/lessonLogs'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import {
  addProblem,
  getProblemsBySource,
  updateProblem,
  deleteProblem,
  deleteProblemsBySource,
  reviewStatusInfo,
  missTypeLabel,
} from '../utils/problems'
import { addTaskToFirestore } from '../utils/firestore'
import PdfCropper from './PdfCropper'

function SapixTextView({ user }) {
  const [texts, setTexts] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('算数')

  // 単元IDから単元名へのマップ
  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingPDF, setViewingPDF] = useState(null)
  const [fullscreenPDF, setFullscreenPDF] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(null) // 'add' | 'edit' | null
  const [expandedText, setExpandedText] = useState(null) // スキャンテキスト展開中のID
  const [evaluating, setEvaluating] = useState(null) // 評価処理中の firestoreId

  // ── 問題ログ関連 ──────────────────────────────────────────
  const [problems, setProblems] = useState({})            // textId -> problems[]
  const [expandedProblems, setExpandedProblems] = useState({}) // textId -> boolean
  const [showProblemForm, setShowProblemForm] = useState(null)  // textId or null
  const [problemForm, setProblemForm] = useState({
    problemNumber: '', unitIds: [], isCorrect: false, missType: 'understanding',
    difficulty: null, imageUrl: null,
  })
  const [showPdfCropper, setShowPdfCropper] = useState(null)    // textId or null
  const [creatingTask, setCreatingTask] = useState(null)         // textId or null

  const [addForm, setAddForm] = useState({
    textName: '',
    textNumber: '',
    subject: '算数',
    grade: '4年生',
    unitIds: [],
    fileUrl: '',
    fileName: '',
    scannedText: '',
    studyDate: '',
  })

  const [editForm, setEditForm] = useState({
    textName: '',
    textNumber: '',
    subject: '算数',
    grade: '4年生',
    unitIds: [],
    fileUrl: '',
    fileName: '',
    scannedText: '',
    studyDate: '',
  })

  const addFileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  // テキスト一覧を読み込み
  const loadTexts = useCallback(async () => {
    if (!user) return
    const result = await getSapixTexts(user.uid)
    if (result.success) {
      setTexts(result.data)
    }
  }, [user])

  useEffect(() => {
    loadTexts()
  }, [loadTexts])

  // 科目でフィルタリング
  const filteredTexts = texts.filter(t => t.subject === selectedSubject)

  // PDF アップロード
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

  // ── 問題ログ CRUD ────────────────────────────────────────
  const loadProblems = async (textId) => {
    if (!user) return
    const result = await getProblemsBySource(user.uid, 'textbook', textId)
    if (result.success) {
      setProblems(prev => ({ ...prev, [textId]: result.data }))
    }
  }

  const toggleProblemExpanded = async (textId) => {
    const next = !expandedProblems[textId]
    setExpandedProblems(prev => ({ ...prev, [textId]: next }))
    if (next && !problems[textId]) await loadProblems(textId)
  }

  const handleAddProblem = async (text) => {
    if (!problemForm.problemNumber.trim()) {
      toast.error('問題番号を入力してください')
      return
    }
    const result = await addProblem(user.uid, {
      sourceType: 'textbook',
      sourceId: text.firestoreId,
      subject: text.subject,
      problemNumber: problemForm.problemNumber.trim(),
      unitIds: problemForm.unitIds.length ? problemForm.unitIds : (text.unitIds || []),
      isCorrect: problemForm.isCorrect,
      missType: problemForm.isCorrect ? null : problemForm.missType,
      difficulty: problemForm.difficulty,
      imageUrl: problemForm.imageUrl,
    })
    if (result.success) {
      await loadProblems(text.firestoreId)
      setProblemForm({ problemNumber: '', unitIds: [], isCorrect: false, missType: 'understanding', difficulty: null, imageUrl: null })
      setShowProblemForm(null)
      toast.success('問題を追加しました')
    } else {
      toast.error('保存に失敗しました')
    }
  }

  const handleUpdateProblemStatus = async (textId, problemId, reviewStatus) => {
    await updateProblem(user.uid, problemId, { reviewStatus })
    await loadProblems(textId)
  }

  const handleDeleteProblem = async (textId, problemId) => {
    await deleteProblem(user.uid, problemId)
    await loadProblems(textId)
    toast.success('削除しました')
  }

  const handlePdfCropComplete = (textId) => (imageUrl) => {
    setShowPdfCropper(null)
    setProblemForm(prev => ({ ...prev, imageUrl }))
    setShowProblemForm(textId)
    toast.success('問題画像を取り込みました。残りの情報を入力して追加してください。')
  }

  // 間違い問題から解き直しタスクを生成
  const handleCreateReviewTask = async (text) => {
    const wrong = (problems[text.firestoreId] || []).filter(p => !p.isCorrect)
    if (wrong.length === 0) {
      toast.error('不正解の問題がありません')
      return
    }
    setCreatingTask(text.firestoreId)
    try {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      await addTaskToFirestore(user.uid, {
        id: Date.now() + Math.random(),
        title: `【解き直し】${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
        subject: text.subject,
        grade: text.grade || '',
        unitIds: text.unitIds || [],
        taskType: 'review',
        priority: 'A',
        dueDate: nextWeek.toISOString().split('T')[0],
        fileUrl: text.fileUrl || '',
        fileName: text.fileName || '',
        completed: false,
        problemIds: wrong.map(p => p.firestoreId),
        generatedFrom: { type: 'textbook', id: text.firestoreId },
        createdAt: new Date().toISOString(),
      })
      toast.success(`解き直しタスクを作成しました（${wrong.length}問）`)
    } catch {
      toast.error('タスク作成に失敗しました')
    } finally {
      setCreatingTask(null)
    }
  }

  // 評価ボタン（🔵/🟡/🔴）押下
  const handleEvaluate = async (text, evalKey) => {
    if (!text.unitIds?.length) {
      toast.error('単元タグが設定されていません。編集から単元タグを追加してください。')
      return
    }
    setEvaluating(text.firestoreId)
    try {
      const result = await addLessonLogWithStats(user.uid, {
        unitIds: text.unitIds,
        sourceType: 'sapixTask',
        sourceId: text.firestoreId,
        sourceName: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
        date: new Date(),
        performance: EVALUATION_SCORES[evalKey],
        evaluationKey: evalKey,
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
      setEvaluating(null)
    }
  }

  // テキスト追加
  const handleAdd = async () => {
    if (!addForm.textName.trim()) {
      toast.error('テキスト名を入力してください')
      return
    }
    const result = await addSapixText(user.uid, {
      textName: addForm.textName.trim(),
      textNumber: addForm.textNumber.trim(),
      subject: addForm.subject,
      grade: addForm.grade,
      unitIds: addForm.unitIds,
      fileUrl: addForm.fileUrl,
      fileName: addForm.fileName,
      scannedText: addForm.scannedText,
      studyDate: addForm.studyDate,
    })
    if (result.success) {
      toast.success('SAPIXテキストを追加しました')
      setAddForm({ textName: '', textNumber: '', subject: '算数', grade: '4年生', unitIds: [], fileUrl: '', fileName: '', scannedText: '', studyDate: '' })
      setShowAddForm(false)
      await loadTexts()
    } else {
      toast.error('追加に失敗しました: ' + result.error)
    }
  }

  // テキスト編集開始
  const handleStartEdit = (text) => {
    setEditingId(text.firestoreId)
    setEditForm({
      textName: text.textName || '',
      textNumber: text.textNumber || '',
      subject: text.subject || '算数',
      grade: text.grade || '4年生',
      unitIds: text.unitIds || (text.unitId ? [text.unitId] : []),
      fileUrl: text.fileUrl || '',
      fileName: text.fileName || '',
      scannedText: text.scannedText || '',
      studyDate: text.studyDate || '',
    })
  }

  // テキスト編集保存
  const handleSaveEdit = async () => {
    if (!editForm.textName.trim()) {
      toast.error('テキスト名を入力してください')
      return
    }
    const result = await updateSapixText(user.uid, editingId, {
      textName: editForm.textName.trim(),
      textNumber: editForm.textNumber.trim(),
      subject: editForm.subject,
      grade: editForm.grade,
      unitIds: editForm.unitIds,
      fileUrl: editForm.fileUrl,
      fileName: editForm.fileName,
      scannedText: editForm.scannedText,
      studyDate: editForm.studyDate,
    })
    if (result.success) {
      toast.success('更新しました')
      setEditingId(null)
      await loadTexts()
    } else {
      toast.error('更新に失敗しました: ' + result.error)
    }
  }

  // テキスト削除
  const handleDelete = async (text) => {
    if (!window.confirm(`「${text.textName}」を削除しますか？`)) return
    await deleteProblemsBySource(user.uid, 'textbook', text.firestoreId)
    const result = await deleteSapixText(user.uid, text.firestoreId)
    if (result.success) {
      toast.success('削除しました')
      if (viewingPDF?.id === text.firestoreId) setViewingPDF(null)
      await loadTexts()
    } else {
      toast.error('削除に失敗しました: ' + result.error)
    }
  }

  // PDFビューワー
  const handleViewPDF = (text) => {
    if (viewingPDF?.id === text.firestoreId) {
      setViewingPDF(null)
    } else {
      setViewingPDF({ id: text.firestoreId, fileUrl: text.fileUrl, title: text.textName })
    }
  }

  // フォームの単元タグピッカー（共通）
  const renderUnitSelector = (form, setForm) => {
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
                onClick={() => setForm(prev => ({ ...prev, grade: g }))}
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
            onChange={(unitIds) => setForm(prev => ({ ...prev, unitIds }))}
          />
        </div>
      </>
    )
  }

  // PDFアップロード/選択UI（共通）
  const renderFileUpload = (form, setForm, target) => (
    <div className="sapix-form-section">
      <label className="sapix-section-label">問題PDF（任意）:</label>
      {form.fileUrl ? (
        <div className="sapix-file-preview">
          <span>📎</span>
          <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">
            {form.fileName || (form.fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : form.fileUrl)}
          </a>
          <button type="button" onClick={() => setForm(prev => ({ ...prev, fileUrl: '', fileName: '' }))}>&times;</button>
        </div>
      ) : (
        <div className="sapix-file-upload-area">
          <input
            ref={target === 'add' ? addFileInputRef : editFileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => { handlePDFUpload(e.target.files[0], target); e.target.value = '' }}
          />
          <button
            type="button"
            className="sapix-upload-btn"
            onClick={() => (target === 'add' ? addFileInputRef : editFileInputRef).current?.click()}
            disabled={uploading}
          >
            {uploading ? 'アップロード中...' : '新規アップロード'}
          </button>
          <span className="sapix-or">または</span>
          <button
            type="button"
            className="sapix-drive-btn"
            onClick={() => setShowDrivePicker(target)}
          >
            Driveから選択
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
          {subjects.map(subject => (
            <button
              key={subject}
              className={`pastpaper-subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
                padding: '12px', fontSize: '0.9rem',
                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px', whiteSpace: 'nowrap',
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
          <button className="add-pastpaper-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ 閉じる' : '+ テキスト追加'}
          </button>
        </div>
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div className="add-pastpaper-form">
          <h3>📝 新しいSAPIXテキストを追加</h3>

          {/* 科目選択 */}
          <div className="sapix-form-section">
            <label className="sapix-section-label">科目:</label>
            <div className="subject-selector-inline">
              {subjects.map(subject => (
                <button
                  key={subject}
                  type="button"
                  className={`subject-btn ${addForm.subject === subject ? 'active' : ''}`}
                  onClick={() => setAddForm(prev => ({ ...prev, subject, unitIds: [] }))}
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

          <div className="add-form-grid-two-cols">
            <div className="add-form-field">
              <label>テキスト名:</label>
              <input
                type="text"
                placeholder="例: デイリーサピックス"
                value={addForm.textName}
                onChange={(e) => setAddForm(prev => ({ ...prev, textName: e.target.value }))}
              />
            </div>
            <div className="add-form-field">
              <label>番号:</label>
              <input
                type="text"
                placeholder="例: No.23"
                value={addForm.textNumber}
                onChange={(e) => setAddForm(prev => ({ ...prev, textNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="add-form-field">
            <label>学習日（任意）:</label>
            <input
              type="date"
              value={addForm.studyDate}
              onChange={(e) => setAddForm(prev => ({ ...prev, studyDate: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
            />
          </div>

          {renderFileUpload(addForm, setAddForm, 'add')}
          {renderUnitSelector(addForm, setAddForm)}

          {/* スキャンテキスト */}
          <div className="sapix-form-section">
            <label className="sapix-section-label">スキャンテキスト（任意）:</label>
            <textarea
              className="sapix-scanned-text-input"
              placeholder="OCRでスキャンしたテキストをここに貼り付け..."
              value={addForm.scannedText}
              onChange={(e) => setAddForm(prev => ({ ...prev, scannedText: e.target.value }))}
              rows="5"
            />
          </div>

          <div className="add-form-actions">
            <button
              className="btn-secondary"
              onClick={() => { setShowAddForm(false); setAddForm({ textName: '', textNumber: '', subject: '算数', grade: '4年生', unitIds: [], fileUrl: '', fileName: '', scannedText: '', studyDate: '' }) }}
            >
              キャンセル
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
          <div className="no-data">
            📘 この科目のSAPIXテキストがありません
            <br />
            <small>「+ テキスト追加」からテキストを登録してください</small>
          </div>
        ) : (
          filteredTexts.map(text => (
            <div key={text.firestoreId} className="sapix-text-card">
              {editingId === text.firestoreId ? (
                /* 編集モード */
                <div className="edit-form-container">
                  <h4>📝 テキストを編集</h4>
                  <div className="sapix-form-section">
                    <label className="sapix-section-label">科目:</label>
                    <div className="subject-selector-inline">
                      {subjects.map(subject => (
                        <button
                          key={subject}
                          type="button"
                          className={`subject-btn ${editForm.subject === subject ? 'active' : ''}`}
                          onClick={() => setEditForm(prev => ({ ...prev, subject, unitIds: [] }))}
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
                  <div className="add-form-grid-two-cols">
                    <div className="add-form-field">
                      <label>テキスト名:</label>
                      <input type="text" value={editForm.textName} onChange={(e) => setEditForm(prev => ({ ...prev, textName: e.target.value }))} />
                    </div>
                    <div className="add-form-field">
                      <label>番号:</label>
                      <input type="text" value={editForm.textNumber} onChange={(e) => setEditForm(prev => ({ ...prev, textNumber: e.target.value }))} />
                    </div>
                  </div>
                  <div className="add-form-field">
                    <label>学習日（任意）:</label>
                    <input
                      type="date"
                      value={editForm.studyDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, studyDate: e.target.value }))}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                  {renderFileUpload(editForm, setEditForm, 'edit')}
                  {renderUnitSelector(editForm, setEditForm)}
                  <div className="sapix-form-section">
                    <label className="sapix-section-label">スキャンテキスト:</label>
                    <textarea
                      className="sapix-scanned-text-input"
                      value={editForm.scannedText}
                      onChange={(e) => setEditForm(prev => ({ ...prev, scannedText: e.target.value }))}
                      rows="5"
                    />
                  </div>
                  <div className="edit-form-actions">
                    <button className="btn-secondary" onClick={() => setEditingId(null)}>キャンセル</button>
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
                          className={`pdf-view-btn ${viewingPDF?.id === text.firestoreId ? 'active' : ''}`}
                          onClick={() => handleViewPDF(text)}
                        >
                          {viewingPDF?.id === text.firestoreId ? '✕ 閉じる' : '📄 PDF表示'}
                        </button>
                      )}
                      {text.scannedText && (
                        <button
                          className={`sapix-scan-toggle ${expandedText === text.firestoreId ? 'active' : ''}`}
                          onClick={() => setExpandedText(expandedText === text.firestoreId ? null : text.firestoreId)}
                        >
                          {expandedText === text.firestoreId ? '✕ テキスト閉じる' : '📝 テキスト表示'}
                        </button>
                      )}
                      <button className="edit-pastpaper-btn" onClick={() => handleStartEdit(text)} title="編集">✏️</button>
                      <button className="delete-pastpaper-btn" onClick={() => handleDelete(text)} title="削除">🗑️</button>
                    </div>
                  </div>

                  {/* PDFプレビュー */}
                  {viewingPDF?.id === text.firestoreId && (
                    <div className="pdf-preview-panel">
                      <div className="pdf-preview-header">
                        <span className="pdf-preview-title">📄 {viewingPDF.title}</span>
                        <div className="pdf-preview-actions">
                          <button
                            className="pdf-fullscreen-btn"
                            onClick={() => setFullscreenPDF({ fileUrl: viewingPDF.fileUrl, title: viewingPDF.title })}
                          >
                            ⛶
                          </button>
                          <a href={viewingPDF.fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-newtab-btn">
                            新しいタブで開く
                          </a>
                          <button className="pdf-preview-close" onClick={() => setViewingPDF(null)}>&times;</button>
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

                  {/* 評価ボタン */}
                  <div className="sapix-eval-row">
                    <span className="sapix-eval-label">評価:</span>
                    {['blue', 'yellow', 'red'].map(key => (
                      <button
                        key={key}
                        className="sapix-eval-btn"
                        disabled={evaluating === text.firestoreId}
                        onClick={() => handleEvaluate(text, key)}
                        title={EVALUATION_LABELS[key]}
                      >
                        {key === 'blue' ? '🔵' : key === 'yellow' ? '🟡' : '🔴'}
                      </button>
                    ))}
                    {evaluating === text.firestoreId && (
                      <span className="sapix-eval-saving">記録中...</span>
                    )}
                  </div>

                  {/* ── 問題ログセクション ─────────────────────── */}
                  <div className="problem-log-section">
                    <button
                      className="toggle-problems-btn"
                      onClick={() => toggleProblemExpanded(text.firestoreId)}
                    >
                      {expandedProblems[text.firestoreId] ? '▼' : '▶'} 問題記録
                      {problems[text.firestoreId]?.length > 0 && (
                        <span className="problem-count-badge">
                          {problems[text.firestoreId].length}問
                        </span>
                      )}
                    </button>

                    {expandedProblems[text.firestoreId] && (
                      <div className="problem-log-body">
                        {/* 問題一覧 */}
                        {(problems[text.firestoreId] || []).length === 0 ? (
                          <p className="no-problems-msg">まだ問題が記録されていません</p>
                        ) : (
                          <div className="problem-list">
                            {(problems[text.firestoreId] || []).map(problem => {
                              const st = reviewStatusInfo(problem.reviewStatus)
                              return (
                                <div
                                  key={problem.firestoreId}
                                  className={`problem-item ${problem.isCorrect ? 'correct' : 'incorrect'}`}
                                >
                                  <div className="problem-item-left">
                                    <span className="problem-correctness">
                                      {problem.isCorrect ? '○' : '✗'}
                                    </span>
                                    <span className="problem-number">第{problem.problemNumber}問</span>
                                    {!problem.isCorrect && problem.missType && (
                                      <span className="problem-miss-type">{missTypeLabel(problem.missType)}</span>
                                    )}
                                    {problem.unitIds?.length > 0 && (
                                      <div className="problem-units">
                                        {problem.unitIds.map(id => (
                                          <span key={id} className="unit-tag">
                                            {unitNameMap[id] || id}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {problem.imageUrl && (
                                      <a href={problem.imageUrl} target="_blank" rel="noopener noreferrer" className="problem-image-link">
                                        <img src={problem.imageUrl} alt="問題画像" className="problem-thumbnail" />
                                      </a>
                                    )}
                                  </div>
                                  <div className="problem-item-right">
                                    {!problem.isCorrect && (
                                      <select
                                        className="review-status-select"
                                        value={problem.reviewStatus}
                                        style={{ background: st.bg, color: st.color }}
                                        onChange={(e) =>
                                          handleUpdateProblemStatus(text.firestoreId, problem.firestoreId, e.target.value)
                                        }
                                      >
                                        <option value="pending">未完了</option>
                                        <option value="retry">要再挑戦</option>
                                        <option value="done">解き直し済</option>
                                      </select>
                                    )}
                                    <button
                                      className="problem-delete-btn"
                                      onClick={() => handleDeleteProblem(text.firestoreId, problem.firestoreId)}
                                      title="削除"
                                    >×</button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* 問題追加フォーム */}
                        {showProblemForm === text.firestoreId ? (
                          <div className="problem-form">
                            <h4>問題を追加</h4>
                            <div className="problem-form-field">
                              <label>問題番号:</label>
                              <input
                                type="text"
                                placeholder="例: 1, 2(1), 大問3"
                                value={problemForm.problemNumber}
                                onChange={(e) => setProblemForm(prev => ({ ...prev, problemNumber: e.target.value }))}
                              />
                            </div>
                            <div className="problem-form-field">
                              <label>正誤:</label>
                              <div className="correctness-toggle">
                                <button type="button" className={`correct-btn ${problemForm.isCorrect ? 'active' : ''}`}
                                  onClick={() => setProblemForm(prev => ({ ...prev, isCorrect: true }))}>
                                  ○ 正解
                                </button>
                                <button type="button" className={`incorrect-btn ${!problemForm.isCorrect ? 'active' : ''}`}
                                  onClick={() => setProblemForm(prev => ({ ...prev, isCorrect: false }))}>
                                  ✗ 不正解
                                </button>
                              </div>
                            </div>
                            {!problemForm.isCorrect && (
                              <div className="problem-form-field">
                                <label>ミスの種類:</label>
                                <div className="miss-type-btns">
                                  {[
                                    { value: 'understanding', label: '理解不足' },
                                    { value: 'careless',      label: 'ケアレス' },
                                    { value: 'not_studied',   label: '未習' },
                                  ].map(opt => (
                                    <button key={opt.value} type="button"
                                      className={`miss-type-btn ${problemForm.missType === opt.value ? 'active' : ''}`}
                                      onClick={() => setProblemForm(prev => ({ ...prev, missType: opt.value }))}>
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="problem-form-field">
                              <label>問題画像（任意）:</label>
                              {problemForm.imageUrl ? (
                                <div className="image-preview-row">
                                  <img src={problemForm.imageUrl} alt="問題プレビュー" className="problem-image-preview" />
                                  <button type="button" className="btn-secondary"
                                    onClick={() => setProblemForm(prev => ({ ...prev, imageUrl: null }))}>削除</button>
                                </div>
                              ) : (
                                <button type="button" className="crop-open-btn"
                                  onClick={() => { setShowProblemForm(null); setShowPdfCropper(text.firestoreId) }}>
                                  ✂ PDFから切り抜く
                                </button>
                              )}
                            </div>
                            <div className="problem-form-actions">
                              <button className="btn-secondary"
                                onClick={() => { setShowProblemForm(null); setProblemForm({ problemNumber: '', unitIds: [], isCorrect: false, missType: 'understanding', difficulty: null, imageUrl: null }) }}>
                                キャンセル
                              </button>
                              <button className="btn-primary" onClick={() => handleAddProblem(text)}>
                                ✓ 追加する
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="problem-log-actions">
                            <button className="add-problem-btn"
                              onClick={() => { setProblemForm({ problemNumber: '', unitIds: text.unitIds || [], isCorrect: false, missType: 'understanding', difficulty: null, imageUrl: null }); setShowProblemForm(text.firestoreId) }}>
                              + 問題を追加
                            </button>
                            {(problems[text.firestoreId] || []).some(p => !p.isCorrect) && (
                              <button
                                className="create-task-btn"
                                disabled={creatingTask === text.firestoreId}
                                onClick={() => handleCreateReviewTask(text)}
                              >
                                {creatingTask === text.firestoreId ? '作成中...' : '→ 解き直しタスクを生成'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* ─────────────────────────────────────────────── */}

                  {/* スキャンテキスト表示 */}
                  {expandedText === text.firestoreId && text.scannedText && (
                    <div className="sapix-scanned-text-display">
                      <div className="sapix-scanned-text-header">
                        <span>📝 スキャンテキスト</span>
                        <button onClick={() => setExpandedText(null)}>&times;</button>
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
      {fullscreenPDF && (
        <div className="pdf-fullscreen-overlay" onClick={() => setFullscreenPDF(null)}>
          <div className="pdf-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-fullscreen-header">
              <span className="pdf-fullscreen-title">📄 {fullscreenPDF.title}</span>
              <div className="pdf-fullscreen-actions">
                <a href={fullscreenPDF.fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-open-newtab-btn">
                  新しいタブで開く
                </a>
                <button className="pdf-fullscreen-close" onClick={() => setFullscreenPDF(null)}>&times;</button>
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

      {/* Drive ファイルピッカー */}
      {showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => {
            if (showDrivePicker === 'add') {
              setAddForm(prev => ({ ...prev, fileUrl: data.url, fileName: data.name }))
            } else {
              setEditForm(prev => ({ ...prev, fileUrl: data.url, fileName: data.name }))
            }
            setShowDrivePicker(null)
          }}
          onClose={() => setShowDrivePicker(null)}
        />
      )}

      {/* PDF切り抜きモーダル */}
      {showPdfCropper && (() => {
        const cropText = texts.find(t => t.firestoreId === showPdfCropper)
        const driveFileId = cropText?.fileUrl?.match(/\/file\/d\/([^/?]+)/)?.[1] || null
        const attachedPdf = driveFileId
          ? { driveFileId, fileName: cropText.fileName || cropText.textName, firestoreId: null }
          : null
        return (
          <PdfCropper
            userId={user.uid}
            attachedPdf={attachedPdf}
            onCropComplete={handlePdfCropComplete(showPdfCropper)}
            onClose={() => {
              setShowPdfCropper(null)
              setShowProblemForm(showPdfCropper)
            }}
          />
        )
      })()}
    </div>
  )
}

export default SapixTextView
