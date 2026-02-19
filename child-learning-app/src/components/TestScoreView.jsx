import { useState, useEffect, useRef } from 'react'
import './TestScoreView.css'
import {
  getAllTestScores,
  updateTestScore,
  getProblemsForTestScore,
} from '../utils/testScores'
import {
  addProblem,
  updateProblem,
  deleteProblem,
} from '../utils/problems'
import { addLessonLogWithStats, EVALUATION_SCORES } from '../utils/lessonLogs'
import { getSapixTexts } from '../utils/sapixTexts'
import { addTaskToFirestore } from '../utils/firestore'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { toast } from '../utils/toast'
import PdfCropper from './PdfCropper'
import DriveFilePicker from './DriveFilePicker'
import { uploadPDFToDrive, checkDriveAccess } from '../utils/googleDriveStorage'
import { refreshGoogleAccessToken } from './Auth'

const SUBJECTS = ['算数', '国語', '理科', '社会']

/** Google Drive URL から driveFileId を抽出 */
function extractDriveFileId(fileUrl) {
  if (!fileUrl) return null
  const match = fileUrl.match(/\/file\/d\/([^/?]+)/)
  return match ? match[1] : null
}

function TestScoreView({ user }) {
  const [scores, setScores] = useState([])
  const [selectedScore, setSelectedScore] = useState(null)
  const [showProblemForm, setShowProblemForm] = useState(false)
  const [problemForm, setProblemForm] = useState(getEmptyProblemForm())
  const [sapixTexts, setSapixTexts] = useState([])

  const [creatingTasks, setCreatingTasks] = useState(false)
  const [showPdfCropper, setShowPdfCropper] = useState(null) // null | 科目名
  const [uploadingSubject, setUploadingSubject] = useState(null) // アップロード中の科目
  const [drivePickerSubject, setDrivePickerSubject] = useState(null) // Drive選択中の科目
  const [problemsCache, setProblemsCache] = useState([])   // embedded + collection のマージ済み問題一覧

  const subjectFileInputRefs = useRef({}) // 科目別ファイルinput参照

  const masterUnits = getStaticMasterUnits()

  function getEmptyProblemForm() {
    return {
      subject: '算数',
      problemNumber: '',
      unitIds: [],
      correctRate: '',
      isCorrect: false,
      missType: null,  // null=正解時, 'understanding'|'careless'|'not_studied' for wrong
      points: '',
      imageUrl: null,
    }
  }

  useEffect(() => {
    if (!user) return
    getAllTestScores(user.uid).then(result => {
      if (result.success) setScores(result.data)
    })
  }, [user])

  useEffect(() => {
    if (!user || !selectedScore) return
    getSapixTexts(user.uid).then(result => {
      if (result.success) setSapixTexts(result.data)
    })
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

  function getRevengeList(score) {
    return getProblemLogs(score)
      .filter(p => !p.isCorrect && parseFloat(p.correctRate) >= 50)
      .sort((a, b) => parseFloat(b.correctRate) - parseFloat(a.correctRate))
  }

  function getLinkedTexts(problem) {
    if (!problem.unitIds?.length) return []
    return sapixTexts.filter(t =>
      t.subject === problem.subject &&  // 科目が一致
      (t.unitIds || []).some(uid => problem.unitIds.includes(uid))
    )
  }

  function getUnitName(unitId) {
    const unit = masterUnits.find(u => u.id === unitId)
    return unit ? unit.name : unitId
  }

  function getUnitsForSubject(subject) {
    return masterUnits.filter(u => u.subject === subject)
  }

  // 科目別PDF: { subject: { fileUrl, fileName } }
  function getSubjectPdfs(score) {
    return score?.subjectPdfs || {}
  }

  // subject の PDF情報を返す（{ fileUrl, fileName } | null）
  function getPdfForSubject(subject) {
    return getSubjectPdfs(selectedScore)[subject] || null
  }

  // 問題追加フォームのデフォルト科目（PDFが紐付いている科目を優先）
  function getDefaultSubject() {
    const pdfs = getSubjectPdfs(selectedScore)
    return SUBJECTS.find(s => pdfs[s]) || '算数'
  }

  function reviewStatusLabel(status) {
    if (status === 'done') return { label: '解き直し済', color: '#16a34a', bg: '#dcfce7' }
    if (status === 'retry') return { label: '要再挑戦', color: '#dc2626', bg: '#fee2e2' }
    return { label: '未完了', color: '#64748b', bg: '#f1f5f9' }
  }

  // ============================================================
  // 問題ログ CRUD
  // ============================================================

  // 新規保存 → problems コレクション
  const handleSaveProblem = async () => {
    if (!problemForm.problemNumber) {
      toast.error('問題番号を入力してください')
      return
    }
    const result = await addProblem(user.uid, {
      sourceType: 'test',
      sourceId: selectedScore.firestoreId,
      subject: problemForm.subject,
      problemNumber: parseInt(problemForm.problemNumber) || problemForm.problemNumber,
      unitIds: problemForm.unitIds,
      isCorrect: problemForm.isCorrect,
      missType: problemForm.isCorrect ? null : (problemForm.missType || 'understanding'),
      correctRate: parseFloat(problemForm.correctRate) || 0,
      points: parseInt(problemForm.points) || null,
      imageUrl: problemForm.imageUrl || null,
    })
    if (result.success) {
      // 弱点分析用に lessonLog も作成（単元が選択されている場合のみ）
      if (problemForm.unitIds && problemForm.unitIds.length > 0) {
        const evaluationKey = problemForm.isCorrect ? 'blue' : 'red'
        await addLessonLogWithStats(user.uid, {
          unitIds: problemForm.unitIds,
          subject: problemForm.subject,  // 科目を追加
          sourceType: 'test',
          sourceId: selectedScore.firestoreId,
          sourceName: `${selectedScore.testName} 問${problemForm.problemNumber}`,
          date: selectedScore.testDate ? new Date(selectedScore.testDate) : new Date(),
          performance: EVALUATION_SCORES[evaluationKey],
          evaluationKey,
          missType: problemForm.isCorrect ? null : (problemForm.missType || 'understanding'),
          notes: `正答率: ${problemForm.correctRate || 0}%`,
        })
      }
      await reloadProblems()
      setProblemForm(getEmptyProblemForm())
      setShowProblemForm(false)
      toast.success('問題を追加しました')
    } else {
      toast.error('保存に失敗しました')
    }
  }

  // 解き直しステータス更新：コレクション問題は updateProblem、embedded は updateTestScore
  const handleUpdateProblemStatus = async (problemId, reviewStatus) => {
    const problem = problemsCache.find(p => p.id === problemId)
    if (problem?._source === 'collection') {
      await updateProblem(user.uid, problem.firestoreId, { reviewStatus })
    } else {
      const updatedProblems = (selectedScore.problemLogs || []).map(p =>
        p.id === problemId ? { ...p, reviewStatus } : p
      )
      await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
    }
    await reloadProblems()
  }

  // 削除：コレクション問題は deleteProblem、embedded は updateTestScore
  const handleDeleteProblem = async (problemId) => {
    const problem = problemsCache.find(p => p.id === problemId)
    if (problem?._source === 'collection') {
      await deleteProblem(user.uid, problem.firestoreId)
    } else {
      const updatedProblems = (selectedScore.problemLogs || []).filter(p => p.id !== problemId)
      await updateTestScore(user.uid, selectedScore.firestoreId, { problemLogs: updatedProblems })
      const refreshResult = await getAllTestScores(user.uid)
      if (refreshResult.success) setScores(refreshResult.data)
    }
    await reloadProblems()
    toast.success('削除しました')
  }

  // ============================================================
  // リベンジタスク作成
  // ============================================================

  const handleCreateRevengeTasks = async () => {
    const revengeList = problemsCache
      .filter(p => !p.isCorrect && parseFloat(p.correctRate) >= 50)
      .sort((a, b) => parseFloat(b.correctRate) - parseFloat(a.correctRate))
    if (revengeList.length === 0) {
      toast.error('リベンジリストが空です（正答率50%以上の不正解問題がありません）')
      return
    }
    setCreatingTasks(true)
    try {
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const dueDate = nextWeek.toISOString().split('T')[0]
      for (const problem of revengeList) {
        const unitNames = problem.unitIds.map(id => getUnitName(id)).join('・')
        await addTaskToFirestore(user.uid, {
          id: Date.now() + Math.random(),
          title: `【解き直し】${selectedScore.testName} 第${problem.problemNumber}問 (${problem.subject})`,
          subject: problem.subject,
          priority: 'A',
          dueDate,
          notes: `正答率 ${problem.correctRate}%${unitNames ? ` / ${unitNames}` : ''}`,
          taskType: 'review',
          completed: false,
          createdAt: new Date().toISOString(),
        })
      }
      toast.success(`${revengeList.length}件の解き直しタスクをスケジュールに追加しました`)
    } catch {
      toast.error('タスク作成に失敗しました')
    } finally {
      setCreatingTasks(false)
    }
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
  // PDF切り出しハンドラ
  // ============================================================

  const handlePdfCropComplete = (imageUrl) => {
    // 切り出し元の科目を problemForm に反映
    const cropSubject = showPdfCropper
    setShowPdfCropper(null)
    setProblemForm(prev => ({
      ...prev,
      imageUrl,
      ...(cropSubject && cropSubject !== prev.subject ? { subject: cropSubject, unitIds: [] } : {})
    }))
    setShowProblemForm(true)
    toast.success('問題画像を取り込みました。残りの情報を入力して追加してください。')
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
          <p className="test-selector-desc">テスト名をタップすると、問題別記録とリベンジリストが表示されます</p>
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
              const revengeCount = getRevengeList(score).length
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
                    {revengeCount > 0 && (
                      <span className="badge-revenge">⚡ {revengeCount}問</span>
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
  const revengeList = problemsCache
    .filter(p => !p.isCorrect && parseFloat(p.correctRate) >= 50)
    .sort((a, b) => parseFloat(b.correctRate) - parseFloat(a.correctRate))
  const unitsForSubject = getUnitsForSubject(problemForm.subject)

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

      {/* アクションバー */}
      <div className="action-bar">
        <div className="action-bar-info">
          <span className="problem-count-badge">記録済み: {problemLogs.length}問</span>
          {revengeList.length > 0 && (
            <span className="revenge-count-badge">リベンジ対象: {revengeList.length}問</span>
          )}
        </div>
        <div className="action-bar-buttons">
          <button
            className="btn-create-tasks"
            onClick={handleCreateRevengeTasks}
            disabled={creatingTasks || revengeList.length === 0}
          >
            {creatingTasks ? '作成中...' : `📅 解き直しタスクを作成 (${revengeList.length}問)`}
          </button>
        </div>
      </div>

      {/* 問題別記録 */}
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">問題別記録</h3>
          <div className="problem-add-btns">
            <button
              className="btn-add-problem"
              onClick={() => { setProblemForm({ ...getEmptyProblemForm(), subject: getDefaultSubject() }); setShowProblemForm(true) }}
            >
              ＋ 問題を追加
            </button>
            <button
              className="btn-pdf-crop"
              onClick={() => setShowPdfCropper(getDefaultSubject())}
              title="PDFから問題を切り出して追加"
            >
              📄 PDFから取り込む
            </button>
          </div>
        </div>

        {problemLogs.length === 0 ? (
          <div className="empty-problems">
            問題を追加して、正答率・単元・正誤を記録しましょう
          </div>
        ) : (
          <div className="problem-table-wrapper">
            <table className="problem-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>教科</th>
                  <th>単元</th>
                  <th>正答率</th>
                  <th>正誤</th>
                  <th>解き直し</th>
                  <th>教材リンク</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {problemLogs
                  .slice()
                  .sort((a, b) => a.problemNumber - b.problemNumber)
                  .map(problem => {
                    const linked = getLinkedTexts(problem)
                    const { color, bg } = reviewStatusLabel(problem.reviewStatus)
                    const correctRateNum = parseFloat(problem.correctRate)
                    const isRevenge = !problem.isCorrect && correctRateNum >= 50
                    return (
                      <tr
                        key={problem.id}
                        className={`problem-row ${!problem.isCorrect ? 'wrong-row' : ''} ${isRevenge ? 'revenge-row' : ''}`}
                      >
                        <td className="cell-num">
                          {problem.problemNumber}
                          {isRevenge && <span className="revenge-marker" title="リベンジ対象">⚡</span>}
                          {problem.imageUrl && (
                            <a
                              href={problem.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="problem-img-thumb-link"
                              title="問題画像を開く"
                            >
                              <img
                                src={problem.imageUrl}
                                alt="問題"
                                className="problem-img-thumb"
                              />
                            </a>
                          )}
                        </td>
                        <td className="cell-subject">
                          <span className={`subject-chip subject-${problem.subject}`}>
                            {problem.subject}
                          </span>
                        </td>
                        <td className="cell-units">
                          {problem.unitIds?.length > 0
                            ? problem.unitIds.map(id => (
                              <span key={id} className="unit-tag">{getUnitName(id)}</span>
                            ))
                            : <span className="no-unit">–</span>
                          }
                        </td>
                        <td className="cell-rate">
                          <span
                            className="correct-rate-badge"
                            style={{
                              background: correctRateNum >= 70 ? '#dcfce7' : correctRateNum >= 40 ? '#fef9c3' : '#fee2e2',
                              color: correctRateNum >= 70 ? '#16a34a' : correctRateNum >= 40 ? '#ca8a04' : '#dc2626',
                            }}
                          >
                            {problem.correctRate}%
                          </span>
                        </td>
                        <td className="cell-correct">
                          {problem.isCorrect ? (
                            <span className="correct-mark">○</span>
                          ) : (
                            <div className="wrong-cell">
                              <span className="wrong-mark">✗</span>
                              {problem.missType === 'careless' && <span className="miss-badge miss-careless">ケアレス</span>}
                              {problem.missType === 'not_studied' && <span className="miss-badge miss-not-studied">未習</span>}
                              {(problem.missType === 'understanding' || problem.missType == null) && (
                                <>
                                  <span className="miss-badge miss-understanding">理解不足</span>
                                  {parseFloat(problem.correctRate) >= 60 && (
                                    <span className="miss-high-accuracy" title="正答率60%以上の問題を間違えています">⚠️</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="cell-status">
                          <select
                            className="status-select"
                            value={problem.reviewStatus || 'pending'}
                            style={{ background: bg, color: color }}
                            onChange={(e) => handleUpdateProblemStatus(problem.id, e.target.value)}
                          >
                            <option value="pending">未完了</option>
                            <option value="done">解き直し済</option>
                            <option value="retry">要再挑戦</option>
                          </select>
                        </td>
                        <td className="cell-links">
                          {linked.length > 0
                            ? linked.map(text => (
                              <a
                                key={text.firestoreId || text.id}
                                href={text.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sapix-text-link"
                                title={text.textName}
                              >
                                📄 {text.textNumber || text.textName}
                              </a>
                            ))
                            : <span className="no-link">–</span>
                          }
                        </td>
                        <td className="cell-delete">
                          <button
                            className="btn-delete-problem"
                            onClick={() => handleDeleteProblem(problem.id)}
                            title="削除"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* リベンジリスト */}
      <div className="section-card revenge-section">
        <div className="section-header">
          <h3 className="section-title">
            ⚡ リベンジリスト
            <span className="revenge-subtitle">正答率 50%以上なのに失点した問題</span>
          </h3>
        </div>

        {revengeList.length === 0 ? (
          <div className="empty-problems">
            リベンジ対象の問題はありません（問題を追加してください）
          </div>
        ) : (
          <div className="revenge-list">
            {revengeList.map((problem, idx) => {
              const linked = getLinkedTexts(problem)
              const unitNames = problem.unitIds?.map(id => getUnitName(id)).join('・') || '単元なし'
              return (
                <div key={problem.id} className="revenge-item">
                  <div className="revenge-rank">#{idx + 1}</div>
                  <div className="revenge-info">
                    <div className="revenge-title">
                      第{problem.problemNumber}問
                      <span className={`subject-chip subject-${problem.subject}`}>{problem.subject}</span>
                    </div>
                    <div className="revenge-meta">
                      <span className="revenge-rate">正答率 <strong>{problem.correctRate}%</strong></span>
                      <span className="revenge-units">{unitNames}</span>
                    </div>
                    {linked.length > 0 && (
                      <div className="revenge-links">
                        {linked.map(text => (
                          <a
                            key={text.firestoreId || text.id}
                            href={text.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sapix-text-link"
                          >
                            📄 {text.textNumber || text.textName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="revenge-status">
                    <select
                      className="status-select"
                      value={problem.reviewStatus || 'pending'}
                      onChange={(e) => handleUpdateProblemStatus(problem.id, e.target.value)}
                    >
                      <option value="pending">未完了</option>
                      <option value="done">解き直し済</option>
                      <option value="retry">要再挑戦</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 問題追加フォーム */}
      {showProblemForm && (
        <div className="form-overlay" onClick={() => setShowProblemForm(false)}>
          <div className="form-container problem-form-container" onClick={e => e.stopPropagation()}>
            <h3>問題を追加</h3>

            <div className="form-row">
              <div className="form-field">
                <label>教科</label>
                <select
                  value={problemForm.subject}
                  onChange={(e) => setProblemForm({ ...problemForm, subject: e.target.value, unitIds: [] })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>問題番号 *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="例: 5"
                  value={problemForm.problemNumber}
                  onChange={(e) => setProblemForm({ ...problemForm, problemNumber: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>配点（任意）</label>
                <input
                  type="number"
                  min="0"
                  placeholder="例: 6"
                  value={problemForm.points}
                  onChange={(e) => setProblemForm({ ...problemForm, points: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>全体正答率（%）</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="例: 72"
                  value={problemForm.correctRate}
                  onChange={(e) => setProblemForm({ ...problemForm, correctRate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>ハルキの正誤</label>
                <div className="correct-radio-group">
                  <label className={`radio-btn radio-correct ${problemForm.isCorrect ? 'active' : ''}`}>
                    <input
                      type="radio"
                      checked={problemForm.isCorrect === true}
                      onChange={() => setProblemForm({ ...problemForm, isCorrect: true, missType: null })}
                    />
                    ○ 正解
                  </label>
                  <label className={`radio-btn radio-wrong ${!problemForm.isCorrect ? 'active' : ''}`}>
                    <input
                      type="radio"
                      checked={problemForm.isCorrect === false}
                      onChange={() => setProblemForm({ ...problemForm, isCorrect: false })}
                    />
                    ✗ 不正解
                  </label>
                </div>
              </div>
            </div>

            {!problemForm.isCorrect && (
              <div className="form-field">
                <label>ミスの種類</label>
                <div className="miss-type-btns">
                  {[
                    { key: 'understanding', label: '理解不足', icon: '🧠', desc: '弱点マップに反映' },
                    { key: 'careless', label: 'ケアレスミス', icon: '😅', desc: 'マップ反映なし' },
                    { key: 'not_studied', label: '未習', icon: '📚', desc: 'マップ反映なし' },
                  ].map(({ key, label, icon, desc }) => (
                    <button
                      key={key}
                      type="button"
                      className={`miss-type-btn miss-${key} ${problemForm.missType === key ? 'selected' : ''}`}
                      onClick={() => setProblemForm({ ...problemForm, missType: key })}
                    >
                      <span className="miss-type-icon">{icon}</span>
                      <span className="miss-type-label">{label}</span>
                      <span className="miss-type-desc">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {problemForm.imageUrl && (
              <div className="form-field">
                <label>問題画像</label>
                <div className="problem-form-image-preview">
                  <img src={problemForm.imageUrl} alt="問題画像" />
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={() => setProblemForm(prev => ({ ...prev, imageUrl: null }))}
                  >
                    ✕ 削除
                  </button>
                </div>
              </div>
            )}

            {unitsForSubject.length > 0 && (
              <div className="form-field">
                <label>単元タグ（複数選択可）</label>
                <div className="unit-checkbox-grid">
                  {unitsForSubject.map(unit => (
                    <label key={unit.id} className={`unit-checkbox-label ${problemForm.unitIds.includes(unit.id) ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={problemForm.unitIds.includes(unit.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked
                            ? [...problemForm.unitIds, unit.id]
                            : problemForm.unitIds.filter(id => id !== unit.id)
                          setProblemForm({ ...problemForm, unitIds: newIds })
                        }}
                      />
                      <span>{unit.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowProblemForm(false)}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleSaveProblem}>
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfCropper && (
        <PdfCropper
          key={showPdfCropper}
          userId={user.uid}
          attachedPdf={(() => {
            const pdf = getPdfForSubject(showPdfCropper)
            if (!pdf) return null
            const driveFileId = extractDriveFileId(pdf.fileUrl)
            return driveFileId ? { driveFileId, fileName: pdf.fileName, firestoreId: null } : null
          })()}
          onCropComplete={handlePdfCropComplete}
          onClose={() => setShowPdfCropper(null)}
          headerSlot={
            <div className="pdf-cropper-subject-tabs">
              {SUBJECTS.map(subject => {
                const hasPdf = !!getPdfForSubject(subject)
                return (
                  <button
                    key={subject}
                    className={`pdf-cropper-subject-tab ${showPdfCropper === subject ? 'active' : ''} ${!hasPdf ? 'no-pdf' : ''}`}
                    onClick={() => hasPdf && setShowPdfCropper(subject)}
                    disabled={!hasPdf}
                    title={hasPdf ? `${subject}のPDFから切り出す` : `${subject}のPDFが未添付です`}
                  >
                    {subject}{!hasPdf && '（未添付）'}
                  </button>
                )
              })}
            </div>
          }
        />
      )}
    </div>
  )
}

export default TestScoreView
