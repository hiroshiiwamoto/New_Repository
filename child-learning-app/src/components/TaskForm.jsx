import { useReducer, useEffect, useRef } from 'react'
import './TaskForm.css'
import PastPaperFields from './PastPaperFields'
import UnitTagPicker from './UnitTagPicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { MAX_FILE_SIZE, SUBJECTS, taskTypes, priorities } from '../utils/constants'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import DriveFilePicker from './DriveFilePicker'

const initialFormState = {
  title: '', subject: '算数', unitIds: [], taskType: 'daily',
  priority: 'B', dueDate: '', fileUrl: '', fileName: '',
  uploading: false, showDrivePicker: false, problemImageUrls: [],
  schoolName: '', year: '', round: '第1回', relatedUnits: [],
}

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value }
    case 'SET_FIELDS': return { ...state, ...action.fields }
    case 'RESET_FORM': return {
      ...initialFormState,
      subject: state.subject, taskType: state.taskType,
      priority: state.priority, dueDate: state.dueDate,
    }
    case 'LOAD_TASK': return {
      ...state,
      title: action.task.title || '',
      subject: action.task.subject || '算数',
      unitIds: action.task.unitIds || [],
      taskType: action.task.taskType || 'daily',
      priority: action.task.priority || 'B',
      dueDate: action.task.dueDate || '',
      fileUrl: action.task.fileUrl || '',
      fileName: action.task.fileName || '',
      problemImageUrls: action.task.problemImageUrls || [],
      schoolName: action.task.schoolName || '',
      year: action.task.year || '',
      round: action.task.round || '第1回',
      relatedUnits: action.task.relatedUnits || [],
    }
    default: return state
  }
}

function TaskForm({ onAddTask, onUpdateTask, editingTask, onCancelEdit }) {
  const [form, dispatch] = useReducer(formReducer, initialFormState)
  const fileInputRef = useRef(null)

  const setField = (field) => (value) => dispatch({ type: 'SET_FIELD', field, value })

  // 編集モードの場合、フォームに値を設定
  useEffect(() => {
    if (editingTask) {
      dispatch({ type: 'LOAD_TASK', task: editingTask })
    }
  }, [editingTask])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.title.trim()) {
      const taskData = {
        title: form.title.trim(),
        subject: form.subject,
        grade: '全学年',
        unitIds: form.unitIds,
        taskType: form.taskType,
        priority: form.priority,
        dueDate: form.dueDate || null,
        fileUrl: form.fileUrl || '',
        fileName: form.fileName || '',
        problemImageUrls: form.problemImageUrls.length ? form.problemImageUrls : [],
      }

      // 過去問の場合、追加情報を含める
      if (form.taskType === 'pastpaper') {
        taskData.schoolName = form.schoolName.trim()
        taskData.year = form.year.trim()
        taskData.round = form.round
        taskData.relatedUnits = form.relatedUnits
      }

      if (editingTask) {
        onUpdateTask(editingTask.id, taskData)
      } else {
        onAddTask(taskData)
      }

      // フォームをリセット
      dispatch({ type: 'RESET_FORM' })
      if (editingTask && onCancelEdit) {
        onCancelEdit()
      }
    }
  }

  const handleCancel = () => {
    dispatch({ type: 'SET_FIELDS', fields: { title: '', unitIds: [] } })
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  // PDF を Google Drive にアップロード
  const handlePDFUpload = async (file) => {
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
      dispatch({ type: 'SET_FIELDS', fields: { fileUrl: viewUrl, fileName: file.name } })
      toast.success(TOAST.UPLOAD_SUCCESS)
    } catch (error) {
      toast.error(TOAST.UPLOAD_ERROR + error.message)
    } finally {
      dispatch({ type: 'SET_FIELD', field: 'uploading', value: false })
    }
  }


  return (
    <form className="task-form sapix-form" onSubmit={handleSubmit}>
      <h2>{editingTask ? '✏️ タスクを編集' : '✏️ 学習タスクを追加'}</h2>

      <div className="form-row two-cols">
        <div className="form-group">
          <label htmlFor="subject">科目</label>
          <select
            id="subject"
            value={form.subject}
            onChange={(e) => dispatch({ type: 'SET_FIELDS', fields: { subject: e.target.value, unitIds: [] } })}
          >
            {SUBJECTS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>単元タグ（マスター単元から選択）</label>
        <UnitTagPicker
          value={form.unitIds}
          onChange={setField('unitIds')}
          placeholder="単元を検索..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="title">学習内容</label>
        <input
          type="text"
          id="title"
          value={form.title}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })}
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
              className={`type-btn ${form.taskType === t.value ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'taskType', value: t.value })}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 過去問の場合の追加フィールド */}
      {form.taskType === 'pastpaper' && (
        <PastPaperFields
          schoolName={form.schoolName}
          setSchoolName={setField('schoolName')}
          year={form.year}
          setYear={setField('year')}
          round={form.round}
          setRound={setField('round')}
          relatedUnits={form.relatedUnits}
          onToggleRelatedUnit={(uid) => dispatch({
            type: 'SET_FIELD', field: 'relatedUnits',
            value: form.relatedUnits.includes(uid)
              ? form.relatedUnits.filter(id => id !== uid)
              : [...form.relatedUnits, uid]
          })}
          currentUnits={[]}
        />
      )}

      {/* 紐付き問題画像（解き直しタスク等・複数対応） */}
      {form.problemImageUrls.length > 0 && (
        <div className="form-group">
          <label>問題画像（{form.problemImageUrls.length}枚）</label>
          <div className="task-problem-image-preview">
            {form.problemImageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`問題画像 ${i + 1}`} className="task-problem-image" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 問題ファイル（解き直しタスクでは非表示） */}
      {form.taskType !== 'review' && <div className="form-group">
        <label>問題ファイル（任意）</label>
        {form.fileUrl ? (
          <div className="task-file-url-preview">
            <span className="task-file-icon">📎</span>
            <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
              {form.fileName || (form.fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : form.fileUrl)}
            </a>
            <button
              type="button"
              className="task-file-clear-btn"
              onClick={() => dispatch({ type: 'SET_FIELDS', fields: { fileUrl: '', fileName: '' } })}
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
              className="hidden-input"
              onChange={(e) => {
                handlePDFUpload(e.target.files[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="task-pdf-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={form.uploading}
            >
              {form.uploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
            </button>
            <span className="task-file-or">または</span>
            <button
              type="button"
              className="task-drive-select-btn"
              onClick={() => dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: true })}
            >
              {LABELS.DRIVE_SELECT}
            </button>
          </div>
        )}
      </div>}

      <div className="form-row">
        <div className="form-group half">
          <label>優先度</label>
          <div className="priority-buttons">
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                className={`priority-btn ${form.priority === p.value ? 'active' : ''}`}
                style={{
                  borderColor: form.priority === p.value ? p.color : '#e0e0e0',
                  backgroundColor: form.priority === p.value ? p.color : 'white',
                  color: form.priority === p.value ? 'white' : '#333'
                }}
                onClick={() => dispatch({ type: 'SET_FIELD', field: 'priority', value: p.value })}
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
            value={form.dueDate}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dueDate', value: e.target.value })}
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
      {form.showDrivePicker && (
        <DriveFilePicker
          onSelect={(data) => dispatch({ type: 'SET_FIELDS', fields: { fileUrl: data.url, fileName: data.name, showDrivePicker: false } })}
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'showDrivePicker', value: false })}
        />
      )}
    </form>
  )
}

export default TaskForm
