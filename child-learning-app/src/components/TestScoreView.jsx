import { useState, useEffect, useRef } from 'react'
import './TestScoreView.css'
import { getTodayString } from '../utils/dateUtils'
import {
  getAllTestScores,
  addTestScore,
  updateTestScore,
  getProblemsForTestScore,
  testTypes,
} from '../utils/testScores'
import {
  updateProblem,
  deleteProblem,
} from '../utils/problems'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { MAX_FILE_SIZE } from '../utils/constants'
import { toast } from '../utils/toast'
import ProblemClipList from './ProblemClipList'
import DriveFilePicker from './DriveFilePicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'
import { grades } from '../utils/unitsDatabase'
import EmptyState from './EmptyState'

const SUBJECTS = ['算数', '国語', '理科', '社会']

const EMPTY_ADD_FORM = { testName: '', testDate: '', grade: '4年生', subjectPdfs: {} }

/** Google Drive URL から driveFileId を抽出 */
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
}

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedScore, setSelectedScore] = useState(null)
  const [uploadingSubject, setUploadingSubject] = useState(null) // アップロード中の科目
  const [drivePickerSubject, setDrivePickerSubject] = useState(null) // Drive選択中の科目
  const [problemsCache, setProblemsCache] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM })
  const [addUploading, setAddUploading] = useState(null) // 追加フォームでアップロード中の科目
  const [addDrivePickerSubject, setAddDrivePickerSubject] = useState(null) // 追加フォームでDrive選択中の科目

  const subjectFileInputRefs = useRef({}) // 科目別ファイルinput参照
  const addFileInputRefs = useRef({}) // 追加フォーム用科目別ファイルinput参照


  useEffect(() => {
    if (!user) return
    getAllTestScores(user.uid).then(result => {
      if (result.success) setScores(result.data)
    })
  }, [user])

  useEffect(() => {
    if (!user || !selectedScore) return
    getProblemsForTestScore(user.uid, selectedScore).then(merged => {
      setProblemsCache(merged)
    })
  }, [user, selectedScore?.id])

  useEffect(() => {
    if (!selectedScore) return
    const updated = scores.find(s => s.id === selectedScore.id)
    if (updated) setSelectedScore(updated)
  }, [scores])

  // ============================================================
  // テスト追加
  // ============================================================

  const handleAddTest = async () => {
    if (!addForm.testName.trim()) {
      toast.error('テスト名を入力してください')
      return
    }
    const result = await addTestScore(user.uid, {
      testName: addForm.testName.trim(),
      testDate: addForm.testDate || getTodayString(),
      grade: addForm.grade,
      subjectPdfs: addForm.subjectPdfs,
    })
    if (result.success) {
      toast.success('テストを追加しました')
      setAddForm({ ...EMPTY_ADD_FORM })
      setShowAddForm(false)
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
    } else {
      toast.error('追加に失敗しました: ' + result.error)
    }
  }

  // 追加フォーム用PDFアップロード
  const handleAddFormUploadPdf = async (subject, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('PDFファイルのみアップロード可能です')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
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
    setAddUploading(subject)
    try {
      const driveResult = await uploadPDFToDrive(file, () => {})
      const fileUrl = `https://drive.google.com/file/d/${driveResult.driveFileId}/view`
      setAddForm(prev => ({
        ...prev,
        subjectPdfs: { ...prev.subjectPdfs, [subject]: { fileUrl, fileName: file.name } }
      }))
      toast.success(`${subject}：「${file.name}」をアップロードしました`)
    } catch (e) {
      toast.error('アップロードエラー: ' + e.message)
    } finally {
      setAddUploading(null)
      if (addFileInputRefs.current[subject]) {
        addFileInputRefs.current[subject].value = ''
      }
    }
  }

  // 追加フォーム用DriveFilePicker選択
  const handleAddFormDriveSelect = ({ url, name }) => {
    const subject = addDrivePickerSubject
    if (!subject || !url) return
    setAddForm(prev => ({
      ...prev,
      subjectPdfs: { ...prev.subjectPdfs, [subject]: { fileUrl: url, fileName: name } }
    }))
    setAddDrivePickerSubject(null)
    toast.success(`${subject}：「${name}」を紐付けました`)
  }

  // ============================================================
  // 問題キャッシュリロード（CRUD 後に呼ぶ）
  // ============================================================

  const reloadProblems = async (score = selectedScore) => {
    if (!user || !score) return
    const merged = await getProblemsForTestScore(user.uid, score)
    setProblemsCache(merged)
  }

  // ============================================================
  // ヘルパー
  // ============================================================

  // 科目別PDF: { subject: { fileUrl, fileName } }
  function getSubjectPdfs(score) {
    return score?.subjectPdfs || {}
  }

  // subject の PDF情報を返す（{ fileUrl, fileName } | null）
  function getPdfForSubject(subject) {
    return getSubjectPdfs(selectedScore)[subject] || null
  }






  // ============================================================
  // PDF紐付けハンドラ
  // ============================================================

  const handleUploadSubjectPdf = async (subject, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('PDFファイルのみアップロード可能です')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
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
    setUploadingSubject(subject)
    try {
      const driveResult = await uploadPDFToDrive(file, () => {})
      const fileUrl = `https://drive.google.com/file/d/${driveResult.driveFileId}/view`
      await saveSubjectPdf(subject, fileUrl, file.name)
      toast.success(`${subject}：「${file.name}」をアップロードしました`)
    } catch (e) {
      toast.error('アップロードエラー: ' + e.message)
    } finally {
      setUploadingSubject(null)
      if (subjectFileInputRefs.current[subject]) {
        subjectFileInputRefs.current[subject].value = ''
      }
    }
  }

  // DriveFilePickerからの選択（{ url, name } を受け取る）
  const handleDrivePickerSelect = async ({ url, name }) => {
    const subject = drivePickerSubject
    if (!subject || !url) return
    await saveSubjectPdf(subject, url, name)
    setDrivePickerSubject(null)
    toast.success(`${subject}：「${name}」を紐付けました`)
  }

  // 科目PDFの保存共通処理（fileUrl + fileName のみ保存）
  const saveSubjectPdf = async (subject, fileUrl, fileName) => {
    const updated = {
      ...getSubjectPdfs(selectedScore),
      [subject]: { fileUrl, fileName }
    }
    const result = await updateTestScore(user.uid, selectedScore.id, { subjectPdfs: updated })
    if (result.success) {
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
    } else {
      toast.error('保存に失敗しました')
    }
  }

  const handleDetachPdf = async (subject) => {
    const updated = { ...getSubjectPdfs(selectedScore) }
    delete updated[subject]
    const result = await updateTestScore(user.uid, selectedScore.id, { subjectPdfs: updated })
    if (result.success) {
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
    }
  }

  // ============================================================
  // RENDER - テスト選択リスト
  // ============================================================

  if (!selectedScore) {
    const sortedScores = [...scores].sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
    return (
      <div className="testscore-view">
        <div className="test-selector-header">
          <div className="header-title-row">
            <div>
              <h3 className="test-selector-title">テストを選択して問題を分析</h3>
              <p className="test-selector-desc">テスト名をタップすると、問題別記録が表示されます</p>
            </div>
            <button className="add-pastpaper-btn" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '✕ 閉じる' : '+ テスト追加'}
            </button>
          </div>
        </div>

        {/* テスト追加フォーム */}
        {showAddForm && (
          <div className="add-pastpaper-form">
            <h3>📝 新しいテストを追加</h3>

            <div className="add-form-field" style={{ marginBottom: '12px' }}>
              <label>テスト名:</label>
              <input
                type="text"
                list="test-type-list"
                placeholder="例: 組分けテスト"
                value={addForm.testName}
                onChange={(e) => setAddForm(prev => ({ ...prev, testName: e.target.value }))}
              />
              <datalist id="test-type-list">
                {testTypes.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div className="add-form-grid-two-cols">
              <div className="add-form-field">
                <label>テスト日:</label>
                <input
                  type="date"
                  value={addForm.testDate}
                  onChange={(e) => setAddForm(prev => ({ ...prev, testDate: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div className="add-form-field">
                <label>学年:</label>
                <select
                  value={addForm.grade}
                  onChange={(e) => setAddForm(prev => ({ ...prev, grade: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                >
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* 科目別PDF */}
            <div className="add-form-section" style={{ marginTop: '16px' }}>
              <label className="section-label">📎 科目別PDF（任意）:</label>
              <div className="subject-pdf-slots">
                {SUBJECTS.map(subject => {
                  const pdf = addForm.subjectPdfs[subject]
                  const isUploading = addUploading === subject
                  return (
                    <div key={subject} className="subject-pdf-slot">
                      <input
                        type="file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        ref={el => { addFileInputRefs.current[subject] = el }}
                        onChange={e => handleAddFormUploadPdf(subject, e.target.files[0])}
                      />
                      <span className="subject-pdf-slot-name">{subject}</span>
                      {pdf ? (
                        <div className="subject-pdf-slot-linked">
                          <a
                            href={pdf.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="subject-pdf-slot-filename"
                            title={pdf.fileName}
                          >
                            {pdf.fileName}
                          </a>
                          <button
                            className="pdf-attach-change"
                            onClick={() => addFileInputRefs.current[subject]?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? '...' : '変更'}
                          </button>
                          <button
                            className="pdf-attach-remove"
                            onClick={() => setAddForm(prev => {
                              const updated = { ...prev.subjectPdfs }
                              delete updated[subject]
                              return { ...prev, subjectPdfs: updated }
                            })}
                          >✕</button>
                        </div>
                      ) : (
                        <div className="subject-pdf-slot-buttons">
                          <button
                            className="pdf-attach-add"
                            onClick={() => addFileInputRefs.current[subject]?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? 'アップロード中...' : '新規アップロード'}
                          </button>
                          <button
                            className="pdf-attach-drive"
                            onClick={() => setAddDrivePickerSubject(subject)}
                            disabled={isUploading}
                          >
                            Driveから選択
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="add-form-actions">
              <button
                className="btn-secondary"
                onClick={() => { setShowAddForm(false); setAddForm({ ...EMPTY_ADD_FORM }) }}
              >
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleAddTest}>
                追加する
              </button>
            </div>
          </div>
        )}

        {/* DriveFilePicker（追加フォーム用） */}
        {addDrivePickerSubject && (
          <DriveFilePicker
            onSelect={handleAddFormDriveSelect}
            onClose={() => setAddDrivePickerSubject(null)}
          />
        )}

        {sortedScores.length === 0 && !showAddForm ? (
          <EmptyState
            icon="📋"
            message="テストデータがありません"
            hint="「+ テスト追加」または「成績」タブから追加してください"
          />
        ) : (
          <div className="test-select-list">
            {sortedScores.map(score => (
              <button
                key={score.id}
                className="test-select-item"
                onClick={() => setSelectedScore(score)}
              >
                <div className="test-select-info">
                  <span className="test-select-name">{score.testName}</span>
                  <span className="test-select-date">{score.testDate}</span>
                  <span className="test-select-grade">{score.grade}</span>
                </div>
                <div className="test-select-badges">
                  {score.fourSubjects?.deviation && (
                    <span className="badge-deviation">偏差値 {score.fourSubjects.deviation}</span>
                  )}
                </div>
                <span className="test-select-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー
  // ============================================================

  return (
    <div className="testscore-view">
      {/* 詳細ヘッダー */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => setSelectedScore(null)}>
          ← テスト一覧
        </button>
        <div className="detail-title-area">
          <h2 className="detail-test-name">{selectedScore.testName}</h2>
          <span className="detail-test-date">{selectedScore.testDate}</span>
          {selectedScore.fourSubjects?.deviation && (
            <span className="detail-deviation-badge">
              4科偏差値 {selectedScore.fourSubjects.deviation}
            </span>
          )}
        </div>
      </div>

      {/* 科目別PDF紐付けバー */}
      <div className="subject-pdf-bar">
        <span className="subject-pdf-bar-label">📎 科目別PDF（問題用紙）</span>
        <div className="subject-pdf-slots">
          {SUBJECTS.map(subject => {
            const pdf = getPdfForSubject(subject)
            const isUploading = uploadingSubject === subject
            return (
              <div key={subject} className="subject-pdf-slot">
                {/* 隠しファイルinput */}
                <input
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  ref={el => { subjectFileInputRefs.current[subject] = el }}
                  onChange={e => handleUploadSubjectPdf(subject, e.target.files[0])}
                />
                <span className="subject-pdf-slot-name">{subject}</span>
                {pdf ? (
                  <div className="subject-pdf-slot-linked">
                    <a
                      href={pdf.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="subject-pdf-slot-filename"
                      title={pdf.fileName}
                    >
                      {pdf.fileName}
                    </a>
                    <button
                      className="pdf-attach-change"
                      onClick={() => subjectFileInputRefs.current[subject]?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? '...' : '変更'}
                    </button>
                    <button className="pdf-attach-remove" onClick={() => handleDetachPdf(subject)}>✕</button>
                  </div>
                ) : (
                  <div className="subject-pdf-slot-buttons">
                    <button
                      className="pdf-attach-add"
                      onClick={() => subjectFileInputRefs.current[subject]?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? 'アップロード中...' : '新規アップロード'}
                    </button>
                    <button
                      className="pdf-attach-drive"
                      onClick={() => setDrivePickerSubject(subject)}
                      disabled={isUploading}
                    >
                      Driveから選択
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* DriveFilePicker（科目別） */}
      {drivePickerSubject && (
        <DriveFilePicker
          onSelect={handleDrivePickerSelect}
          onClose={() => setDrivePickerSubject(null)}
        />
      )}

      {/* 問題クリップ */}
      <ProblemClipList
        userId={user.uid}
        problems={problemsCache}
        onReload={() => reloadProblems()}
        sourceType="test"
        sourceId={selectedScore.id}
        subject=""
        multiSubject
        subjects={SUBJECTS}
        showCorrectRate
        showPoints
        collapsible={false}
        defaultExpanded
        getSubjectPdf={(subj) => {
          const pdf = getPdfForSubject(subj)
          if (!pdf) return null
          const driveFileId = extractDriveFileId(pdf.fileUrl)
          return driveFileId ? { driveFileId, fileName: pdf.fileName, fileUrl: pdf.fileUrl } : null
        }}
        taskGenInfo={{
          title: selectedScore.testName,
          grade: selectedScore.grade,
          sourceRef: { type: 'test', id: selectedScore.id },
        }}
        onAfterAdd={async (problemData) => {
          // 弱点分析用に lessonLog も作成（単元が選択されている場合のみ）
          if (problemData.unitIds && problemData.unitIds.length > 0) {
            const evaluationKey = problemData.isCorrect ? 'blue' : 'red'
            await addLessonLogWithStats(user.uid, {
              unitIds: problemData.unitIds,
              subject: problemData.subject,
              sourceType: 'test',
              sourceId: selectedScore.id,
              sourceName: `${selectedScore.testName} 問${problemData.problemNumber}`,
              date: selectedScore.testDate ? new Date(selectedScore.testDate) : new Date(),
              performance: EVALUATION_SCORES[evaluationKey],
              evaluationKey,
              missType: problemData.isCorrect ? null : (problemData.missType || 'understanding'),
              notes: `正答率: ${problemData.correctRate || 0}%`,
            })
          }
        }}
        onUpdateStatus={async (problemId, reviewStatus) => {
          const problem = problemsCache.find(p => p.id === problemId)
          if (problem) {
            await updateProblem(user.uid, problem.id, typeof reviewStatus === 'object' ? reviewStatus : { reviewStatus })
          }
        }}
        onDelete={async (problemId) => {
          const problem = problemsCache.find(p => p.id === problemId)
          if (problem) {
            await deleteProblem(user.uid, problem.id)
          }
        }}
      />
    </div>
  )
}

export default TestScoreView
