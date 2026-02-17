import { useState, useEffect, useRef } from 'react'
import './TaskForm.css'
import PastPaperFields from './PastPaperFields'
import UnitTagPicker from './UnitTagPicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { toast } from '../utils/toast'
import DriveFilePicker from './DriveFilePicker'

function TaskForm({ onAddTask, onUpdateTask, editingTask, onCancelEdit, customUnits = [], onAddCustomUnit }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('算数')
  const [unitIds, setUnitIds] = useState([]) // マスター単元タグ（複数選択）
  const [taskType, setTaskType] = useState('daily')
  const [priority, setPriority] = useState('B')
  const [dueDate, setDueDate] = useState('')

  // PDF/ファイル関連
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const fileInputRef = useRef(null)

  // 過去問用のフィールド
  const [schoolName, setSchoolName] = useState('')
  const [year, setYear] = useState('')
  const [round, setRound] = useState('第1回')
  const [relatedUnits, setRelatedUnits] = useState([]) // 関連単元ID配列

  // 編集モードの場合、フォームに値を設定
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '')
      setSubject(editingTask.subject || '算数')
      // 旧 unitId（単一）との後方互換
      setUnitIds(
        editingTask.unitIds?.length ? editingTask.unitIds
          : editingTask.unitId ? [editingTask.unitId]
          : []
      )
      setTaskType(editingTask.taskType || 'daily')
      setPriority(editingTask.priority || 'B')
      setDueDate(editingTask.dueDate || '')
      setFileUrl(editingTask.fileUrl || '')
      setFileName(editingTask.fileName || '')
      // 過去問フィールド
      setSchoolName(editingTask.schoolName || '')
      setYear(editingTask.year || '')
      setRound(editingTask.round || '第1回')
      setRelatedUnits(editingTask.relatedUnits || [])
    }
  }, [editingTask])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (title.trim()) {
      const taskData = {
        title: title.trim(),
        subject,
        grade: '全学年',
        unitIds,           // マスター単元タグ（配列）
        unitId: unitIds[0] || '', // 後方互換
        taskType,
        priority,
        dueDate: dueDate || null,
        fileUrl: fileUrl || '',
        fileName: fileName || '',
      }

      // 過去問の場合、追加情報を含める
      if (taskType === 'pastpaper') {
        taskData.schoolName = schoolName.trim()
        taskData.year = year.trim()
        taskData.round = round
        taskData.relatedUnits = relatedUnits
      }

      if (editingTask) {
        onUpdateTask(editingTask.id, taskData)
      } else {
        onAddTask(taskData)
      }

      // フォームをリセット
      setTitle('')
      setUnitIds([])
      setFileUrl('')
      setFileName('')
      // 過去問フィールドをリセット
      setSchoolName('')
      setYear('')
      setRound('第1回')
      setRelatedUnits([])
      if (editingTask && onCancelEdit) {
        onCancelEdit()
      }
    }
  }

  const handleCancel = () => {
    setTitle('')
    setUnitIds([])
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  // PDF を Google Drive にアップロード
  const handlePDFUpload = async (file) => {
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
      setFileUrl(viewUrl)
      setFileName(file.name)
      toast.success('PDFをGoogle Driveにアップロードしました')
    } catch (error) {
      toast.error('アップロードエラー: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const taskTypes = [
    { value: 'daily', label: 'デイリー復習', emoji: '📖' },
    { value: 'basic', label: '基礎トレ', emoji: '✏️' },
    { value: 'test', label: 'テスト対策', emoji: '📝' },
    { value: 'pastpaper', label: '過去問', emoji: '📄' },
    { value: 'weakness', label: '弱点補強', emoji: '💪' },
  ]

  const priorities = [
    { value: 'A', label: 'A (最重要)', color: '#ef4444' },
    { value: 'B', label: 'B (重要)', color: '#f59e0b' },
    { value: 'C', label: 'C (通常)', color: '#3b82f6' },
  ]

  const subjects = ['国語', '算数', '理科', '社会']

  return (
    <form className="task-form sapix-form" onSubmit={handleSubmit}>
      <h2>{editingTask ? '✏️ タスクを編集' : '✏️ 学習タスクを追加'}</h2>

      <div className="form-row two-cols">
        <div className="form-group">
          <label htmlFor="subject">科目</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setUnitIds([])
            }}
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>単元タグ（マスター単元から選択）</label>
        <UnitTagPicker
          value={unitIds}
          onChange={setUnitIds}
          placeholder="単元を検索..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="title">学習内容</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: デイリーサピックス No.23 p.12-15"
          required
        />
      </div>

      <div className="form-group">
        <label>タスク種別</label>
        <div className="task-type-buttons">
          {taskTypes.map(t => (
            <button
              key={t.value}
              type="button"
              className={`type-btn ${taskType === t.value ? 'active' : ''}`}
              onClick={() => setTaskType(t.value)}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 過去問の場合の追加フィールド */}
      {taskType === 'pastpaper' && (
        <PastPaperFields
          schoolName={schoolName}
          setSchoolName={setSchoolName}
          year={year}
          setYear={setYear}
          round={round}
          setRound={setRound}
          relatedUnits={relatedUnits}
          onToggleRelatedUnit={(uid) => setRelatedUnits(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
          )}
          currentUnits={[]}
        />
      )}

      {/* 問題ファイル */}
      <div className="form-group">
        <label>問題ファイル（任意）</label>
        {fileUrl ? (
          <div className="task-file-url-preview">
            <span className="task-file-icon">📎</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
              {fileName || (fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : fileUrl)}
            </a>
            <button
              type="button"
              className="task-file-clear-btn"
              onClick={() => { setFileUrl(''); setFileName('') }}
            >
              &times;
            </button>
          </div>
        ) : (
          <div className="task-file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                handlePDFUpload(e.target.files[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="task-pdf-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'アップロード中...' : '新規アップロード'}
            </button>
            <span className="task-file-or">または</span>
            <button
              type="button"
              className="task-drive-select-btn"
              onClick={() => setShowDrivePicker(true)}
            >
              Driveから選択
            </button>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group half">
          <label>優先度</label>
          <div className="priority-buttons">
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                className={`priority-btn ${priority === p.value ? 'active' : ''}`}
                style={{
                  borderColor: priority === p.value ? p.color : '#e0e0e0',
                  backgroundColor: priority === p.value ? p.color : 'white',
                  color: priority === p.value ? 'white' : '#333'
                }}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group half">
          <label htmlFor="dueDate">📅 実施日（任意）</label>
          <input
            type="date"
            id="dueDate"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn sapix-btn">
          {editingTask ? '✓ 更新' : '➕ タスクを追加'}
        </button>
        {editingTask && (
          <button type="button" className="cancel-btn" onClick={handleCancel}>
            ✕ キャンセル
          </button>
        )}
      </div>
      {/* Google Drive ファイルピッカー */}
      {showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => {
            setFileUrl(data.url)
            setFileName(data.name)
            setShowDrivePicker(false)
          }}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </form>
  )
}

export default TaskForm
