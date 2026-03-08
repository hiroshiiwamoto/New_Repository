import { useState, useMemo, useRef } from 'react'
import './TestScoreView.css'
import { getTodayString } from '../utils/dateUtils'
import { grades } from '../utils/unitsDatabase'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  deleteTestScore,
  testTypes
} from '../utils/testScores'
import ScoreCard from './ScoreCard'
import DeviationChart from './DeviationChart'
import { toast } from '../utils/toast'
import { LABELS, TOAST } from '../utils/messages'
import EmptyState from './EmptyState'
import { useFirestoreQuery } from '../hooks/useFirestoreQuery'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { MAX_FILE_SIZE } from '../utils/constants'
import { extractScoresFromImage, getGeminiUsage } from '../utils/scoreOcr'

const scoreFields = { score: '', totalScore: '', average: '', deviation: '', rank: '', totalStudents: '' }

function getEmptyForm() {
  return {
    testName: '',
    testDate: getTodayString(),
    grade: '4年生',
    fourSubjects: { ...scoreFields },
    fourSubjectsGender: { ...scoreFields },
    sansu:  { ...scoreFields },
    kokugo: { ...scoreFields },
    rika:   { ...scoreFields },
    shakai: { ...scoreFields },
    twoSubjects: { ...scoreFields },
    twoSubjectsGender: { ...scoreFields },
    sansuGender: { ...scoreFields },
    kokugoGender: { ...scoreFields },
    rikaGender: { ...scoreFields },
    shakaiGender: { ...scoreFields },
    // 成績表PDF
    pdfUrl: '',
    pdfFileName: '',
    // その他
    course: '',
    className: '',
    notes: ''
  }
}

// 編集用にスコアデータをフォーム形式に変換
function scoreToForm(score) {
  const empty = getEmptyForm()
  const result = {}
  for (const key of Object.keys(empty)) {
    if (typeof empty[key] === 'object') {
      result[key] = {}
      for (const field of Object.keys(empty[key])) {
        result[key][field] = score[key]?.[field] || ''
      }
    } else {
      result[key] = score[key] || ''
    }
  }
  return result
}

function GradesView({ user }) {
  const { data: scores, reload: reloadScores } = useFirestoreQuery(
    () => user ? getAllTestScores(user.uid) : null,
    [user]
  )
  const [selectedGrade, setSelectedGrade] = useState('4年生')
  const [showForm, setShowForm] = useState(false)
  const [editingScore, setEditingScore] = useState(null)
  const [scoreForm, setScoreForm] = useState(getEmptyForm())
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  const filteredScores = (scores || []).filter(s => s.grade === selectedGrade && s.status !== 'scheduled')

  const chartData = useMemo(() => {
    return [...filteredScores]
      .filter(s => s.fourSubjects?.deviation || s.twoSubjects?.deviation)
      .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))
  }, [filteredScores])

  const handleOpenForm = () => {
    setEditingScore(null)
    setScoreForm(getEmptyForm())
    setShowForm(true)
  }

  const handleEditScore = (score) => {
    setEditingScore(score)
    setScoreForm(scoreToForm(score))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!user) { toast.error(TOAST.LOGIN_REQUIRED); return }
    if (!scoreForm.testName || !scoreForm.testDate) {
      toast.error('テスト名と実施日は必須です')
      return
    }
    const result = editingScore
      ? await updateTestScore(user.uid, editingScore.id, scoreForm)
      : await addTestScore(user.uid, scoreForm)
    if (result.success) {
      await reloadScores()
      setShowForm(false)
      toast.success(editingScore ? TOAST.UPDATE_SUCCESS : TOAST.SAVE_SUCCESS)
    } else {
      toast.error(TOAST.SAVE_FAILED + ': ' + result.error)
    }
  }

  const handleDeleteRequest = (scoreId) => setPendingDeleteId(scoreId)
  const handleDeleteCancel = () => setPendingDeleteId(null)
  const handleDeleteConfirm = async (score) => {
    setPendingDeleteId(null)
    const result = await deleteTestScore(user.uid, score.id)
    if (result.success) {
      await reloadScores()
      toast.success(TOAST.DELETE_SUCCESS)
    } else {
      toast.error(TOAST.DELETE_FAILED)
    }
  }

  // 成績表PDFアップロード
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
    setUploading(true)
    try {
      const result = await uploadPDFToDrive(file, () => {})
      const viewUrl = `https://drive.google.com/file/d/${result.driveFileId}/view`
      setScoreForm(prev => ({ ...prev, pdfUrl: viewUrl, pdfFileName: file.name }))
      toast.success(TOAST.UPLOAD_SUCCESS)
    } catch (error) {
      toast.error(TOAST.UPLOAD_ERROR + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 画像から成績を自動入力
  const handleImageOcr = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください')
      return
    }
    setOcrLoading(true)
    try {
      const extracted = await extractScoresFromImage(file)
      setScoreForm(prev => {
        const updated = { ...prev }
        if (extracted.testName) updated.testName = extracted.testName
        if (extracted.grade) updated.grade = extracted.grade
        const sections = [
          'fourSubjects', 'fourSubjectsGender',
          'sansu', 'kokugo', 'rika', 'shakai',
          'twoSubjects', 'twoSubjectsGender',
          'sansuGender', 'kokugoGender',
          'rikaGender', 'shakaiGender'
        ]
        for (const key of sections) {
          if (extracted[key]) {
            updated[key] = { ...prev[key] }
            for (const field of Object.keys(extracted[key])) {
              const val = extracted[key][field]
              if (val !== undefined && val !== null) {
                updated[key][field] = String(val)
              }
            }
          }
        }
        return updated
      })
      toast.success('画像から成績を読み取りました')
    } catch (error) {
      toast.error('読み取りエラー: ' + error.message)
    } finally {
      setOcrLoading(false)
    }
  }

  // フォーム更新ヘルパー
  const updateField = (section, field, value) => {
    setScoreForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  // 統一行レンダラー: 得点/合計 平均点 偏差値 順位/受験者数 男女別平均点 男女別偏差値 男女別順位/受験者数
  function renderScoreRow(sectionKey, genderKey, label) {
    const data = scoreForm[sectionKey]
    const genderData = scoreForm[genderKey]
    return (
      <tr key={sectionKey}>
        <th className="grades-table-label">{label}</th>
        <td>
          <div className="score-input-group">
            <input type="number" placeholder="得点" value={data.score}
              onChange={(e) => updateField(sectionKey, 'score', e.target.value)} />
            <span>/</span>
            <input type="number" placeholder="合計" value={data.totalScore}
              onChange={(e) => updateField(sectionKey, 'totalScore', e.target.value)} />
          </div>
        </td>
        <td>
          <input type="number" step="0.1" placeholder="平均" value={data.average}
            onChange={(e) => updateField(sectionKey, 'average', e.target.value)} />
        </td>
        <td>
          <input type="number" step="0.1" placeholder="偏差値" value={data.deviation}
            onChange={(e) => updateField(sectionKey, 'deviation', e.target.value)} />
        </td>
        <td>
          <div className="score-input-group">
            <input type="number" placeholder="順位" value={data.rank}
              onChange={(e) => updateField(sectionKey, 'rank', e.target.value)} />
            <span>/</span>
            <input type="number" placeholder="人数" value={data.totalStudents}
              onChange={(e) => updateField(sectionKey, 'totalStudents', e.target.value)} />
          </div>
        </td>
        <td>
          <input type="number" step="0.1" placeholder="平均" value={genderData.average}
            onChange={(e) => updateField(genderKey, 'average', e.target.value)} />
        </td>
        <td>
          <input type="number" step="0.1" placeholder="偏差値" value={genderData.deviation}
            onChange={(e) => updateField(genderKey, 'deviation', e.target.value)} />
        </td>
        <td>
          <div className="score-input-group">
            <input type="number" placeholder="順位" value={genderData.rank}
              onChange={(e) => updateField(genderKey, 'rank', e.target.value)} />
            <span>/</span>
            <input type="number" placeholder="人数" value={genderData.totalStudents}
              onChange={(e) => updateField(genderKey, 'totalStudents', e.target.value)} />
          </div>
        </td>
      </tr>
    )
  }

  function renderScoreForm() {
    return (
      <div className="modal-overlay-common" onClick={() => setShowForm(false)}>
        <div className="form-container" onClick={(e) => e.stopPropagation()}>
          <h3>{editingScore ? '✏️ 成績を編集' : '➕ 成績を追加'}</h3>

          {/* 1. 基本情報 */}
          <div className="form-section">
            <h4>基本情報</h4>
            <div className="form-row">
              <div className="form-field">
                <label>テスト名 *</label>
                <input
                  type="text"
                  list="grade-test-type-list"
                  placeholder="例: 組分けテスト"
                  value={scoreForm.testName}
                  onChange={(e) => setScoreForm({ ...scoreForm, testName: e.target.value })}
                />
                <datalist id="grade-test-type-list">
                  {testTypes.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="form-field">
                <label>実施日 *</label>
                <input
                  type="date"
                  value={scoreForm.testDate}
                  onChange={(e) => setScoreForm({ ...scoreForm, testDate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>学年</label>
                <select
                  value={scoreForm.grade}
                  onChange={(e) => setScoreForm({ ...scoreForm, grade: e.target.value })}
                >
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 画像から自動入力 */}
          <div className="form-section ocr-section">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden-input"
              onChange={(e) => {
                handleImageOcr(e.target.files[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="btn-ocr"
              onClick={() => imageInputRef.current?.click()}
              disabled={ocrLoading || getGeminiUsage().isOverLimit}
            >
              {ocrLoading ? '読み取り中...' : '画像から自動入力'}
            </button>
            {(() => {
              const usage = getGeminiUsage()
              if (usage.isOverLimit) {
                return (
                  <div className="gemini-usage-alert over-limit">
                    今月のAPI使用上限（{usage.limit}回）に達しました。来月にリセットされます。
                  </div>
                )
              }
              if (usage.isWarning) {
                return (
                  <div className="gemini-usage-alert warning">
                    今月のAPI使用量: {usage.count} / {usage.limit}回（残り{usage.remaining}回）
                  </div>
                )
              }
              if (usage.count > 0) {
                return (
                  <div className="gemini-usage-info">
                    今月の使用: {usage.count} / {usage.limit}回
                  </div>
                )
              }
              return null
            })()}
          </div>

          {/* 成績テーブル */}
          <div className="grades-table-wrapper">
            <table className="grades-table">
              <thead>
                <tr>
                  <th rowSpan="2"></th>
                  <th colSpan="4">全体</th>
                  <th colSpan="3">男女別</th>
                </tr>
                <tr>
                  <th>得点/合計</th>
                  <th>平均点</th>
                  <th>偏差値</th>
                  <th>順位/受験者数</th>
                  <th>平均点</th>
                  <th>偏差値</th>
                  <th>順位/受験者数</th>
                </tr>
              </thead>
              <tbody>
                {renderScoreRow('fourSubjects', 'fourSubjectsGender', '4科目合計')}
                {renderScoreRow('twoSubjects', 'twoSubjectsGender', '2科目合計')}
                <tr className="grades-table-separator"><td colSpan="8"></td></tr>
                {renderScoreRow('sansu', 'sansuGender', '算数')}
                {renderScoreRow('kokugo', 'kokugoGender', '国語')}
                {renderScoreRow('rika', 'rikaGender', '理科')}
                {renderScoreRow('shakai', 'shakaiGender', '社会')}
              </tbody>
            </table>
          </div>

          {/* 12. 成績表PDF */}
          <div className="form-section">
            <h4>成績表PDF</h4>
            {scoreForm.pdfUrl ? (
              <div className="task-file-url-preview">
                <span className="task-file-icon">📎</span>
                <a href={scoreForm.pdfUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
                  {scoreForm.pdfFileName || 'Google Drive のファイル'}
                </a>
                <button
                  type="button"
                  className="task-file-clear-btn"
                  onClick={() => setScoreForm(prev => ({ ...prev, pdfUrl: '', pdfFileName: '' }))}
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
                  disabled={uploading}
                >
                  {uploading ? LABELS.UPLOADING : LABELS.UPLOAD_NEW}
                </button>
              </div>
            )}
          </div>

          {/* 13. その他 */}
          <div className="form-section">
            <h4>その他</h4>
            <div className="form-row">
              <div className="form-field">
                <label>コース</label>
                <input type="text" placeholder="例: α1"
                  value={scoreForm.course}
                  onChange={(e) => setScoreForm({ ...scoreForm, course: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>クラス</label>
                <input type="text" placeholder="例: A組"
                  value={scoreForm.className}
                  onChange={(e) => setScoreForm({ ...scoreForm, className: e.target.value })}
                />
              </div>
            </div>
            <div className="form-field full">
              <label>メモ</label>
              <textarea
                rows="3"
                placeholder="反省点、次回の目標など..."
                value={scoreForm.notes}
                onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              {LABELS.CANCEL}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {editingScore ? '✓ 更新' : '✓ 保存'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="testscore-view">
      <div className="dashboard-header">
        <div className="selection-area">
          <label>学年:</label>
          {grades.map((grade) => (
            <button
              key={grade}
              className={`grade-btn ${selectedGrade === grade ? 'active' : ''}`}
              onClick={() => setSelectedGrade(grade)}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      <button className="add-score-btn" onClick={handleOpenForm}>
        + 成績を追加
      </button>

      {chartData.length >= 2 && (
        <DeviationChart data={chartData} />
      )}

      <div className="scores-content">
        {filteredScores.length === 0 ? (
          <EmptyState
            icon="📊"
            message="この学年のテスト成績がありません"
            hint="上の「+ 成績を追加」ボタンから記録を追加してください"
          />
        ) : (
          <div className="scores-list">
            {filteredScores.map(score => (
              <ScoreCard
                key={score.id}
                score={score}
                onEdit={handleEditScore}
                onDelete={handleDeleteConfirm}
                onDeleteRequest={handleDeleteRequest}
                onDeleteCancel={handleDeleteCancel}
                isPendingDelete={pendingDeleteId === score.id}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && renderScoreForm()}
    </div>
  )
}

export default GradesView
