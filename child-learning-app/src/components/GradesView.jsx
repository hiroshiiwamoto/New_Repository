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

function getEmptyForm() {
  return {
    testName: '',
    testDate: getTodayString(),
    grade: '4年生',
    // 4科目合計
    fourSubjects: { score: '', average: '', deviation: '', rank: '', totalStudents: '' },
    // 男女別4科目合計
    fourSubjectsGender: { deviation: '', rank: '', totalStudents: '' },
    // 科目別
    sansu:  { score: '', average: '', deviation: '', rank: '' },
    kokugo: { score: '', average: '', deviation: '', rank: '' },
    rika:   { score: '', average: '', deviation: '', rank: '' },
    shakai: { score: '', average: '', deviation: '', rank: '' },
    // 2科目合計
    twoSubjects: { score: '', average: '', deviation: '', rank: '', totalStudents: '' },
    // 男女別2科目合計
    twoSubjectsGender: { deviation: '', rank: '', totalStudents: '' },
    // 男女別算数
    sansuGender: { deviation: '', rank: '', totalStudents: '' },
    // 男女別国語
    kokugoGender: { deviation: '', rank: '', totalStudents: '' },
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
  const fileInputRef = useRef(null)

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

  // フォーム更新ヘルパー
  const updateField = (section, field, value) => {
    setScoreForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  // 合計行（得点・平均点・偏差値・順位/人）
  function renderSummaryRow(sectionKey, label) {
    const data = scoreForm[sectionKey]
    return (
      <div className="form-section">
        <h4>{label}</h4>
        <div className="form-row summary-row">
          <div className="form-field">
            <label>得点</label>
            <input type="number" placeholder="得点" value={data.score}
              onChange={(e) => updateField(sectionKey, 'score', e.target.value)} />
          </div>
          <div className="form-field">
            <label>平均点</label>
            <input type="number" step="0.1" placeholder="平均点" value={data.average}
              onChange={(e) => updateField(sectionKey, 'average', e.target.value)} />
          </div>
          <div className="form-field">
            <label>偏差値</label>
            <input type="number" step="0.1" placeholder="偏差値" value={data.deviation}
              onChange={(e) => updateField(sectionKey, 'deviation', e.target.value)} />
          </div>
          <div className="form-field">
            <label>順位</label>
            <div className="score-input-group">
              <input type="number" placeholder="順位" value={data.rank}
                onChange={(e) => updateField(sectionKey, 'rank', e.target.value)} />
              <span>/</span>
              <input type="number" placeholder="人数" value={data.totalStudents}
                onChange={(e) => updateField(sectionKey, 'totalStudents', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 男女別行（偏差値・順位/人）
  function renderGenderRow(sectionKey, label) {
    const data = scoreForm[sectionKey]
    return (
      <div className="form-section">
        <h4>{label}</h4>
        <div className="form-row summary-row">
          <div className="form-field">
            <label>偏差値</label>
            <input type="number" step="0.1" placeholder="偏差値" value={data.deviation}
              onChange={(e) => updateField(sectionKey, 'deviation', e.target.value)} />
          </div>
          <div className="form-field">
            <label>順位</label>
            <div className="score-input-group">
              <input type="number" placeholder="順位" value={data.rank}
                onChange={(e) => updateField(sectionKey, 'rank', e.target.value)} />
              <span>/</span>
              <input type="number" placeholder="人数" value={data.totalStudents}
                onChange={(e) => updateField(sectionKey, 'totalStudents', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 科目別行（得点・平均点・偏差値・順位）
  function renderSubjectRow(sectionKey, label) {
    const data = scoreForm[sectionKey]
    return (
      <div className="form-row subject-row" key={sectionKey}>
        <div className="form-field">
          <label>{label}</label>
          <input type="number" placeholder="得点" value={data.score}
            onChange={(e) => updateField(sectionKey, 'score', e.target.value)} />
        </div>
        <div className="form-field">
          <label>平均点</label>
          <input type="number" step="0.1" placeholder="平均点" value={data.average}
            onChange={(e) => updateField(sectionKey, 'average', e.target.value)} />
        </div>
        <div className="form-field">
          <label>偏差値</label>
          <input type="number" step="0.1" placeholder="偏差値" value={data.deviation}
            onChange={(e) => updateField(sectionKey, 'deviation', e.target.value)} />
        </div>
        <div className="form-field">
          <label>順位</label>
          <input type="number" placeholder="順位" value={data.rank}
            onChange={(e) => updateField(sectionKey, 'rank', e.target.value)} />
        </div>
      </div>
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

          {/* 2. 4科目合計 */}
          {renderSummaryRow('fourSubjects', '4科目合計')}

          {/* 3. 男女別4科目合計 */}
          {renderGenderRow('fourSubjectsGender', '男女別4科目合計')}

          {/* 4-7. 科目別（算数→国語→理科→社会） */}
          <div className="form-section">
            <h4>科目別</h4>
            {renderSubjectRow('sansu', '算数')}
            {renderSubjectRow('kokugo', '国語')}
            {renderSubjectRow('rika', '理科')}
            {renderSubjectRow('shakai', '社会')}
          </div>

          {/* 8. 2科目合計 */}
          {renderSummaryRow('twoSubjects', '2科目合計')}

          {/* 9. 男女別2科目合計 */}
          {renderGenderRow('twoSubjectsGender', '男女別2科目合計')}

          {/* 10. 男女別算数 */}
          {renderGenderRow('sansuGender', '男女別算数')}

          {/* 11. 男女別国語 */}
          {renderGenderRow('kokugoGender', '男女別国語')}

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
