import { useState, useEffect, useRef } from 'react'
import './TestScoreView.css'
import {
  getAllTestScores,
  updateTestScore,
  getProblemsForTestScore,
} from '../utils/testScores'
import {
  updateProblem,
  deleteProblem,
} from '../utils/problems'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { toast } from '../utils/toast'
import ProblemClipList from './ProblemClipList'
import DriveFilePicker from './DriveFilePicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'

const SUBJECTS = ['算数', '国語', '理科', '社会']

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedScore, setSelectedScore] = useState(null)
  const [uploadingSubject, setUploadingSubject] = useState(null) // アップロード中の科目
  const [drivePickerSubject, setDrivePickerSubject] = useState(null) // Drive選択中の科目
  const [problemsCache, setProblemsCache] = useState([])   // embedded + collection のマージ済み問題一覧

  const subjectFileInputRefs = useRef({}) // 科目別ファイルinput参照


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
  }, [user, selectedScore?.firestoreId])

  useEffect(() => {
    if (!selectedScore) return
    const updated = scores.find(s => s.firestoreId === selectedScore.firestoreId)
    if (updated) setSelectedScore(updated)
  }, [scores])

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

  function getProblemLogs(score) {
    return score?.problemLogs || []
  }


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
    const result = await updateTestScore(user.uid, selectedScore.firestoreId, { subjectPdfs: updated })
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
    const result = await updateTestScore(user.uid, selectedScore.firestoreId, { subjectPdfs: updated })
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
          <h3 className="test-selector-title">テストを選択して問題を分析</h3>
          <p className="test-selector-desc">テスト名をタップすると、問題別記録が表示されます</p>
        </div>

        {sortedScores.length === 0 ? (
          <div className="no-data">
            📋 テストデータがありません
            <small>「成績」タブから成績を追加してください</small>
          </div>
        ) : (
          <div className="test-select-list">
            {sortedScores.map(score => {
              const problems = getProblemLogs(score)
              return (
                <button
                  key={score.firestoreId}
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
                    {problems.length > 0 && (
                      <span className="badge-problems">{problems.length}問記録済</span>
                    )}
                  </div>
                  <span className="test-select-arrow">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER - 詳細ビュー
  // ============================================================

  const problemLogs = problemsCache

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
        problems={problemLogs}
        onReload={() => reloadProblems()}
        sourceType="test"
        sourceId={selectedScore.firestoreId}
        subject=""
        multiSubject
        subjects={SUBJECTS}
        showCorrectRate
        showPoints
        collapsible={false}
        defaultExpanded
        taskGenInfo={{
          title: selectedScore.testName,
          grade: selectedScore.grade,
          sourceRef: { type: 'test', id: selectedScore.firestoreId },
        }}
        onAfterAdd={async (problemData) => {
          // 弱点分析用に lessonLog も作成（単元が選択されている場合のみ）
          if (problemData.unitIds && problemData.unitIds.length > 0) {
            const evaluationKey = problemData.isCorrect ? 'blue' : 'red'
            await addLessonLogWithStats(user.uid, {
              unitIds: problemData.unitIds,
              subject: problemData.subject,
              sourceType: 'test',
              sourceId: selectedScore.firestoreId,
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
          if (problem?._source === 'collection') {
            await updateProblem(user.uid, problem.firestoreId, typeof reviewStatus === 'object' ? reviewStatus : { reviewStatus })
          } else {
            const updates = typeof reviewStatus === 'object' ? reviewStatus : { reviewStatus }
            const updatedProblems = (selectedScore.problemLogs || []).map(p =>
              p.id === problemId ? { ...p, ...updates } : p
            )
            await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
            const refreshResult = await getAllTestScores(user.uid)
            if (refreshResult.success) setScores(refreshResult.data)
          }
        }}
        onDelete={async (problemId) => {
          const problem = problemsCache.find(p => p.id === problemId)
          if (problem?._source === 'collection') {
            await deleteProblem(user.uid, problem.firestoreId)
          } else {
            const updatedProblems = (selectedScore.problemLogs || []).filter(p => p.id !== problemId)
            await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
            const refreshResult = await getAllTestScores(user.uid)
            if (refreshResult.success) setScores(refreshResult.data)
          }
        }}
      />
    </div>
  )
}

export default TestScoreView
