import { useState, useEffect } from 'react'
import './TargetSchoolView.css'
import {
  getAllTargetSchools,
  addTargetSchool,
  updateTargetSchool,
  deleteTargetSchool,
  getDaysUntilExam
} from '../utils/targetSchools'
import { toast } from '../utils/toast'
import EmptyState from './EmptyState'

function TargetSchoolView({ user }) {
  const [schools, setSchools] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [form, setForm] = useState(getEmptyForm())

  function getEmptyForm() {
    return {
      name: '',
      examDate: '',
      examDate2: '',
      applicationDeadline: '',
      resultDate: '',
      enrollmentDeadline: '',
      targetDeviation: '',
      passScore: '',
      maxScore: '',
      examSubjects: ['国語', '算数', '理科', '社会'],
      priority: 1,
      notes: ''
    }
  }

  useEffect(() => {
    if (!user) return
    loadSchools()
  }, [user])

  const loadSchools = async () => {
    const result = await getAllTargetSchools(user.uid)
    if (result.success) {
      setSchools(result.data)
    }
  }

  const handleOpenForm = () => {
    setEditingSchool(null)
    setForm(getEmptyForm())
    setShowForm(true)
  }

  const handleEdit = (school) => {
    setEditingSchool(school)
    setForm({
      name: school.name || '',
      examDate: school.examDate || '',
      examDate2: school.examDate2 || '',
      applicationDeadline: school.applicationDeadline || '',
      resultDate: school.resultDate || '',
      enrollmentDeadline: school.enrollmentDeadline || '',
      targetDeviation: school.targetDeviation || '',
      passScore: school.passScore || '',
      maxScore: school.maxScore || '',
      examSubjects: school.examSubjects || ['国語', '算数', '理科', '社会'],
      priority: school.priority || 1,
      notes: school.notes || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }
    if (!form.name) {
      toast.error('学校名は必須です')
      return
    }

    const result = editingSchool
      ? await updateTargetSchool(user.uid, editingSchool.id, form)
      : await addTargetSchool(user.uid, form)

    if (result.success) {
      await loadSchools()
      setShowForm(false)
      toast.success(editingSchool ? '更新しました' : '追加しました')
    } else {
      toast.error('保存に失敗しました: ' + result.error)
    }
  }

  const handleDelete = async (school) => {
    if (!window.confirm(`「${school.name}」を削除しますか？`)) return

    const result = await deleteTargetSchool(user.uid, school.id)
    if (result.success) {
      setSchools(schools.filter(s => s.id !== school.id))
      toast.success('削除しました')
    } else {
      toast.error('削除に失敗しました: ' + result.error)
    }
  }

  const toggleSubject = (subject) => {
    const subjects = form.examSubjects.includes(subject)
      ? form.examSubjects.filter(s => s !== subject)
      : [...form.examSubjects, subject]
    setForm({ ...form, examSubjects: subjects })
  }

  const getCountdownClass = (days) => {
    if (days === null) return ''
    if (days <= 0) return 'exam-passed'
    if (days <= 30) return 'exam-urgent'
    if (days <= 90) return 'exam-soon'
    return 'exam-normal'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    })
  }

  // 最も近い受験日の学校を先頭に
  const sortedSchools = [...schools].sort((a, b) => {
    const daysA = getDaysUntilExam(a.examDate)
    const daysB = getDaysUntilExam(b.examDate)
    if (daysA === null && daysB === null) return (a.priority || 0) - (b.priority || 0)
    if (daysA === null) return 1
    if (daysB === null) return -1
    if (daysA <= 0 && daysB > 0) return 1
    if (daysA > 0 && daysB <= 0) return -1
    return daysA - daysB
  })

  return (
    <div className="target-school-view">
      {/* カウントダウンヘッダー */}
      {sortedSchools.length > 0 && (
        <div className="countdown-header">
          {sortedSchools
            .filter(s => getDaysUntilExam(s.examDate) !== null && getDaysUntilExam(s.examDate) > 0)
            .slice(0, 3)
            .map(school => {
              const days = getDaysUntilExam(school.examDate)
              return (
                <div key={school.id} className={`countdown-card ${getCountdownClass(days)}`}>
                  <div className="countdown-school-name">{school.name}</div>
                  <div className="countdown-number">{days}</div>
                  <div className="countdown-label">日</div>
                  <div className="countdown-date">{formatDate(school.examDate)}</div>
                </div>
              )
            })}
        </div>
      )}

      <div className="school-view-header">
        <h2>🏫 志望校管理</h2>
        <button className="add-school-btn" onClick={handleOpenForm}>
          + 志望校を追加
        </button>
      </div>

      {/* 志望校カード一覧 */}
      {sortedSchools.length === 0 ? (
        <EmptyState
          icon="🏫"
          message="志望校を追加して受験スケジュールを管理しましょう"
          hint="受験日、出願締切、合格最低点などを記録できます"
        />
      ) : (
        <div className="schools-list">
          {sortedSchools.map(school => {
            const daysUntilExam = getDaysUntilExam(school.examDate)
            const daysUntilExam2 = getDaysUntilExam(school.examDate2)

            return (
              <div key={school.id} className="school-card">
                <div className="school-card-header">
                  <div className="school-info">
                    <span className="school-priority">
                      {school.priority === 1 ? '第1志望' : school.priority === 2 ? '第2志望' : school.priority === 3 ? '第3志望' : `第${school.priority}志望`}
                    </span>
                    <h3 className="school-name">{school.name}</h3>
                  </div>
                  <div className="school-actions">
                    <button className="edit-btn" onClick={() => handleEdit(school)} title="編集">✏️</button>
                    <button className="delete-btn" onClick={() => handleDelete(school)} title="削除">🗑️</button>
                  </div>
                </div>

                {/* 受験日カウントダウン */}
                {daysUntilExam !== null && (
                  <div className={`exam-countdown ${getCountdownClass(daysUntilExam)}`}>
                    {daysUntilExam > 0 ? (
                      <>受験日まで <strong>{daysUntilExam}日</strong></>
                    ) : daysUntilExam === 0 ? (
                      <strong>本日が受験日です！</strong>
                    ) : (
                      <span className="exam-done">受験済み</span>
                    )}
                  </div>
                )}

                {/* スケジュール情報 */}
                <div className="school-schedule">
                  <div className="schedule-grid">
                    {school.examDate && (
                      <div className="schedule-item">
                        <span className="schedule-label">受験日(1回目)</span>
                        <span className="schedule-value">{formatDate(school.examDate)}</span>
                      </div>
                    )}
                    {school.examDate2 && (
                      <div className="schedule-item">
                        <span className="schedule-label">受験日(2回目)</span>
                        <span className="schedule-value">
                          {formatDate(school.examDate2)}
                          {daysUntilExam2 !== null && daysUntilExam2 > 0 && (
                            <span className="days-badge">あと{daysUntilExam2}日</span>
                          )}
                        </span>
                      </div>
                    )}
                    {school.applicationDeadline && (
                      <div className="schedule-item">
                        <span className="schedule-label">出願締切</span>
                        <span className="schedule-value">{formatDate(school.applicationDeadline)}</span>
                      </div>
                    )}
                    {school.resultDate && (
                      <div className="schedule-item">
                        <span className="schedule-label">合格発表</span>
                        <span className="schedule-value">{formatDate(school.resultDate)}</span>
                      </div>
                    )}
                    {school.enrollmentDeadline && (
                      <div className="schedule-item">
                        <span className="schedule-label">入学手続締切</span>
                        <span className="schedule-value">{formatDate(school.enrollmentDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 目標情報 */}
                <div className="school-targets">
                  {school.targetDeviation && (
                    <div className="target-item">
                      <span className="target-label">目標偏差値</span>
                      <span className="target-value deviation">{school.targetDeviation}</span>
                    </div>
                  )}
                  {school.passScore && (
                    <div className="target-item">
                      <span className="target-label">合格最低点</span>
                      <span className="target-value">
                        {school.passScore}
                        {school.maxScore && <span className="max-score">/{school.maxScore}</span>}
                      </span>
                    </div>
                  )}
                </div>

                {/* 受験科目 */}
                {school.examSubjects && school.examSubjects.length > 0 && (
                  <div className="exam-subjects">
                    {school.examSubjects.map(subject => (
                      <span key={subject} className="subject-chip">{subject}</span>
                    ))}
                  </div>
                )}

                {/* メモ */}
                {school.notes && (
                  <div className="school-notes">
                    <p>{school.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 追加/編集フォーム */}
      {showForm && (
        <div className="modal-overlay-common" onClick={() => setShowForm(false)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSchool ? '✏️ 志望校を編集' : '➕ 志望校を追加'}</h3>

            <div className="form-section">
              <h4>基本情報</h4>
              <div className="form-row">
                <div className="form-field">
                  <label>学校名 *</label>
                  <input
                    type="text"
                    placeholder="例: 開成中学校"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>志望順位</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>第{n}志望</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>スケジュール</h4>
              <div className="form-row">
                <div className="form-field">
                  <label>受験日(1回目)</label>
                  <input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>受験日(2回目)</label>
                  <input
                    type="date"
                    value={form.examDate2}
                    onChange={(e) => setForm({ ...form, examDate2: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>出願締切</label>
                  <input
                    type="date"
                    value={form.applicationDeadline}
                    onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>合格発表</label>
                  <input
                    type="date"
                    value={form.resultDate}
                    onChange={(e) => setForm({ ...form, resultDate: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>入学手続締切</label>
                  <input
                    type="date"
                    value={form.enrollmentDeadline}
                    onChange={(e) => setForm({ ...form, enrollmentDeadline: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>目標</h4>
              <div className="form-row">
                <div className="form-field">
                  <label>目標偏差値</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="例: 65"
                    value={form.targetDeviation}
                    onChange={(e) => setForm({ ...form, targetDeviation: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>合格最低点</label>
                  <input
                    type="number"
                    placeholder="例: 200"
                    value={form.passScore}
                    onChange={(e) => setForm({ ...form, passScore: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>満点</label>
                  <input
                    type="number"
                    placeholder="例: 400"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>受験科目</h4>
              <div className="subject-toggles">
                {['国語', '算数', '理科', '社会'].map(subject => (
                  <button
                    key={subject}
                    type="button"
                    className={`subject-toggle ${form.examSubjects.includes(subject) ? 'active' : ''}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h4>メモ</h4>
              <div className="form-field full">
                <textarea
                  rows="3"
                  placeholder="入試の特徴、対策ポイントなど..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {editingSchool ? '✓ 更新' : '✓ 追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TargetSchoolView
