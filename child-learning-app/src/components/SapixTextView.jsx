import { useState, useEffect, useRef, useCallback } from 'react'
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

function SapixTextView({ user }) {
  const [texts, setTexts] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingPDF, setViewingPDF] = useState(null)
  const [fullscreenPDF, setFullscreenPDF] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(null) // 'add' | 'edit' | null
  const [expandedText, setExpandedText] = useState(null) // スキャンテキスト展開中のID
  const [evaluating, setEvaluating] = useState(null) // 評価処理中の firestoreId

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

  // 評価ボタン（🔵/🟡/🔴）押下
  const handleEvaluate = async (text, evalKey) => {
    if (!text.unitIds?.length) {
      toast.error('単元タグが設定されていません。編集から単元タグを追加してください。')
      return
    }
    setEvaluating(text.firestoreId)
    try {
      await addLessonLogWithStats(user.uid, {
        unitIds: text.unitIds,
        sourceType: 'sapixTask',
        sourceId: text.firestoreId,
        sourceName: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
        date: new Date(),
        performance: EVALUATION_SCORES[evalKey],
        evaluationKey: evalKey,
      })
      toast.success(`評価を記録しました: ${EVALUATION_LABELS[evalKey]}`)
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
                  onClick={() => setAddForm(prev => ({ ...prev, subject, unitId: '' }))}
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
                          onClick={() => setEditForm(prev => ({ ...prev, subject, unitId: '' }))}
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
                            <span key={uid} className="sapix-unit-badge">{uid}</span>
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
    </div>
  )
}

export default SapixTextView
