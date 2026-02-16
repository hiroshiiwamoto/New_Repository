import { useState, useEffect, useRef } from 'react'
import './TaskForm.css'
import { unitsDatabase, grades } from '../utils/unitsDatabase'
import CustomUnitForm from './CustomUnitForm'
import PastPaperFields from './PastPaperFields'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { toast } from '../utils/toast'
import DriveFilePicker from './DriveFilePicker'

function TaskForm({ onAddTask, onUpdateTask, editingTask, onCancelEdit, customUnits = [], onAddCustomUnit }) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('算数')
  const [grade, setGrade] = useState('4年生')
  const [unitId, setUnitId] = useState('')
  const [taskType, setTaskType] = useState('daily')
  const [priority, setPriority] = useState('B')
  const [dueDate, setDueDate] = useState('')
  const [showCustomUnitForm, setShowCustomUnitForm] = useState(false)
  const [customUnitName, setCustomUnitName] = useState('')
  const [customUnitCategory, setCustomUnitCategory] = useState('過去問')
  const [lastAddedCustomUnit, setLastAddedCustomUnit] = useState(null) // 最近追加したカスタム単元を一時保存

  // PDF/ファイル関連
  const [fileUrl, setFileUrl] = useState('')
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
      setGrade(editingTask.grade || '4年生')
      setUnitId(editingTask.unitId || '')
      setTaskType(editingTask.taskType || 'daily')
      setPriority(editingTask.priority || 'B')
      setDueDate(editingTask.dueDate || '')
      setFileUrl(editingTask.fileUrl || '')
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
      const unitName = getUnitName(unitId)
      const taskData = {
        title: title.trim(),
        subject,
        grade,
        unitId,
        unit: unitName,
        taskType,
        priority,
        dueDate: dueDate || null,
        fileUrl: fileUrl || '',
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
      setUnitId('')
      setFileUrl('')
      setLastAddedCustomUnit(null) // 一時保存した単元情報をクリア
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

  const getUnitName = (unitId) => {
    if (!unitId) return ''

    // 最近追加したカスタム単元を優先的にチェック（状態更新が間に合わない場合の対策）
    if (lastAddedCustomUnit && lastAddedCustomUnit.id === unitId) {
      return lastAddedCustomUnit.name
    }

    // デフォルト単元から検索
    const defaultUnits = unitsDatabase[subject]?.[grade] || []
    const defaultUnit = defaultUnits.find(u => u.id === unitId)
    if (defaultUnit) {
      return defaultUnit.name
    }

    // カスタム単元から検索
    const customUnit = customUnits.find(u => u.id === unitId)
    if (customUnit) {
      return customUnit.name
    }
    return ''
  }

  const handleAddCustomUnit = async () => {
    if (!customUnitName.trim()) {
      alert('単元名を入力してください')
      return
    }

    if (!onAddCustomUnit) {
      alert('カスタム単元の追加機能が利用できません')
      return
    }

    const { generateCustomUnitId } = await import('../utils/customUnits')
    const unitId = generateCustomUnitId(subject, grade, customUnitName)

    const unitData = {
      id: unitId,
      subject,
      grade,
      name: customUnitName.trim(),
      category: customUnitCategory,
    }

    const result = await onAddCustomUnit(unitData)

    if (result.success) {
      // 最近追加したカスタム単元として保存（状態更新が間に合わない場合の対策）
      const addedUnitName = customUnitName.trim()
      setLastAddedCustomUnit({ id: result.data.id, name: addedUnitName })

      // フォームをリセット
      setCustomUnitName('')
      setCustomUnitCategory('過去問')
      setShowCustomUnitForm(false)
      // 追加した単元を選択
      setUnitId(result.data.id)
      alert(`✅ 単元「${addedUnitName}」を追加しました`)
    } else {
      alert(`❌ カスタム単元の追加に失敗しました: ${result.error || '不明なエラー'}`)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setUnitId('')
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
      toast.success('PDFをGoogle Driveにアップロードしました')
    } catch (error) {
      toast.error('アップロードエラー: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 関連単元のトグル処理
  const handleToggleRelatedUnit = (unitId) => {
    if (relatedUnits.includes(unitId)) {
      setRelatedUnits(relatedUnits.filter(id => id !== unitId))
    } else {
      setRelatedUnits([...relatedUnits, unitId])
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

  // デフォルト単元とカスタム単元を統合
  const defaultUnits = unitsDatabase[subject]?.[grade] || []
  const filteredCustomUnits = customUnits.filter(u => u.subject === subject && u.grade === grade)
  const currentUnits = [...defaultUnits, ...filteredCustomUnits]

  return (
    <form className="task-form sapix-form" onSubmit={handleSubmit}>
      <h2>{editingTask ? '✏️ タスクを編集' : '✏️ 学習タスクを追加'}</h2>

      <div className="form-row three-cols">
        <div className="form-group">
          <label htmlFor="subject">科目</label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setUnitId('')
            }}
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="grade">学年</label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value)
              setUnitId('')
            }}
          >
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="unit">単元</label>
          <div className="unit-select-container">
            <select
              id="unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">選択してください</option>
              {defaultUnits.length > 0 && (
                <optgroup label="標準単元">
                  {defaultUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.category})
                    </option>
                  ))}
                </optgroup>
              )}
              {filteredCustomUnits.length > 0 && (
                <optgroup label="カスタム単元">
                  {filteredCustomUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.category})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              type="button"
              className="add-custom-unit-btn"
              onClick={() => setShowCustomUnitForm(!showCustomUnitForm)}
              title="カスタム単元を追加"
            >
              ➕
            </button>
          </div>
        </div>
      </div>

      {/* カスタム単元追加フォーム */}
      {showCustomUnitForm && (
        <CustomUnitForm
          customUnitName={customUnitName}
          setCustomUnitName={setCustomUnitName}
          customUnitCategory={customUnitCategory}
          setCustomUnitCategory={setCustomUnitCategory}
          onAdd={handleAddCustomUnit}
          onCancel={() => {
            setShowCustomUnitForm(false)
            setCustomUnitName('')
            setCustomUnitCategory('過去問')
          }}
        />
      )}

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
          onToggleRelatedUnit={handleToggleRelatedUnit}
          currentUnits={currentUnits}
        />
      )}

      {/* 問題ファイル */}
      <div className="form-group">
        <label>問題ファイル（任意）</label>
        {fileUrl ? (
          <div className="task-file-url-preview">
            <span className="task-file-icon">📎</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
              {fileUrl.includes('drive.google.com') ? 'Google Drive のファイル' : fileUrl}
            </a>
            <button
              type="button"
              className="task-file-clear-btn"
              onClick={() => setFileUrl('')}
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
          onSelect={(url) => {
            setFileUrl(url)
            setShowDrivePicker(false)
          }}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </form>
  )
}

export default TaskForm
