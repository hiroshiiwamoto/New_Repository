import { useState, useEffect, useMemo, useCallback } from 'react'
import './PastPaperView.css'
import { subjects, unitsDatabase, grades } from '../utils/unitsDatabase'
import {
  getSessionsByTaskId,
  addPastPaperSession,
  getNextAttemptNumber,
  deleteSessionsByTaskId
} from '../utils/pastPaperSessions'
import { subjectColors, subjectEmojis } from '../utils/constants'
import { toast } from '../utils/toast'

function PastPaperView({ tasks, user, customUnits = [], onAddTask, onUpdateTask, onDeleteTask }) {
  const [viewMode, setViewMode] = useState('school') // 'school' or 'unit'
  const [selectedSubject, setSelectedSubject] = useState('算数')
  const [sessions, setSessions] = useState({}) // taskId -> sessions[]
  const [showSessionForm, setShowSessionForm] = useState(null) // taskId
  const [sessionForm, setSessionForm] = useState({
    studiedAt: new Date().toISOString().split('T')[0],
    score: '',
    totalScore: '',
    timeSpent: '',
    notes: ''
  })
  const [showAddForm, setShowAddForm] = useState(false) // 過去問追加フォーム
  const [addForm, setAddForm] = useState({
    schoolName: '',
    year: '',
    round: '',
    subject: '算数',  // フォーム内で独立して科目を管理
    grade: '4年生',
    unitId: '',  // 単一の単元ID
    fileUrl: ''  // GoogleドライブやPDFのURL
  })
  const [editingTaskId, setEditingTaskId] = useState(null) // 編集中の過去問タスクID
  const [editForm, setEditForm] = useState({
    schoolName: '',
    year: '',
    round: '',
    subject: '算数',
    grade: '4年生',
    unitId: '',  // 単一の単元ID
    fileUrl: ''  // GoogleドライブやPDFのURL
  })
  const [expandedSessions, setExpandedSessions] = useState({}) // 学習記録の展開状態 (taskId -> boolean)

  // 過去問タスクのみフィルタリング（学年無関係）
  const pastPaperTasks = useMemo(() => {
    const filtered = tasks.filter(
      t => t.taskType === 'pastpaper' &&
           t.subject === selectedSubject
    )

    // デバッグ情報を出力
    console.log('=== 過去問デバッグ情報 ===')
    console.log('科目:', selectedSubject)
    console.log('過去問タスク数:', filtered.length)
    console.log('customUnits:', customUnits)
    filtered.forEach((task, index) => {
      console.log(`\n過去問 ${index + 1}:`, {
        id: task.id,
        title: task.title,
        schoolName: task.schoolName || '(空)',
        year: task.year,
        round: task.round,
        unitId: task.unitId,
        grade: task.grade
      })
    })
    console.log('========================\n')

    return filtered
  }, [tasks, selectedSubject, customUnits])

  // セッションデータを読み込み
  const loadSessions = useCallback(async () => {
    if (!user) return

    const sessionData = {}
    for (const task of pastPaperTasks) {
      const result = await getSessionsByTaskId(user.uid, task.id)
      if (result.success) {
        sessionData[task.id] = result.data
      }
    }
    setSessions(sessionData)
  }, [user, pastPaperTasks])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 削除されたカスタム単元への参照をクリーンアップ
  useEffect(() => {
    if (!user || !onUpdateTask) return

    // customUnitsに存在しないIDを持つunitIdを持つタスクを探す
    const customUnitIds = customUnits.map(u => u.id)

    pastPaperTasks.forEach(task => {
      if (task.unitId && task.unitId.startsWith('custom_')) {
        // カスタム単元が削除されている場合
        if (!customUnitIds.includes(task.unitId)) {
          console.warn(`⚠️ タスク「${task.title}」に削除された単元への参照があります:`, task.unitId)

          // 単元IDをクリア
          onUpdateTask(task.id, { unitId: '' })
          toast.info(`「${task.title}」の削除された単元への参照を修正しました`)
        }
      }
    })
  }, [user, pastPaperTasks, customUnits, onUpdateTask])

  // 学校別にグループ化
  const groupBySchool = () => {
    const grouped = {}
    console.log('\n=== 学校別グループ化デバッグ ===')
    pastPaperTasks.forEach(task => {
      const school = task.schoolName || '学校名未設定'
      console.log(`タスク「${task.title}」→ 学校「${school}」`)
      if (!grouped[school]) {
        grouped[school] = []
      }
      grouped[school].push(task)
    })
    console.log('グループ化結果:', Object.keys(grouped))
    console.log('===========================\n')
    return grouped
  }

  // 単元別にグループ化
  const groupByUnit = () => {
    const grouped = {}
    console.log('\n=== 単元別グループ化デバッグ ===')
    pastPaperTasks.forEach(task => {
      if (task.unitId) {
        console.log(`タスク「${task.title}」の単元:`, task.unitId)
        if (!grouped[task.unitId]) {
          grouped[task.unitId] = []
        }
        grouped[task.unitId].push(task)
      } else {
        console.log(`タスク「${task.title}」は未分類（unitIdが空）`)
        if (!grouped['未分類']) {
          grouped['未分類'] = []
        }
        grouped['未分類'].push(task)
      }
    })
    console.log('グループ化結果:', Object.keys(grouped))
    console.log('===========================\n')
    return grouped
  }

  // 単元IDから単元名を取得
  const getUnitName = (unitId) => {
    // customUnitsから検索
    const customUnit = customUnits.find(u => u.id === unitId)
    if (customUnit) {
      console.log(`単元ID「${unitId}」→ カスタム単元「${customUnit.name}」`)
      return customUnit.name
    }

    // unitsDatabaseから検索
    for (const subject of subjects) {
      const gradeData = unitsDatabase[subject]
      if (gradeData) {
        for (const grade in gradeData) {
          const units = gradeData[grade]
          const unit = units.find(u => u.id === unitId)
          if (unit) {
            console.log(`単元ID「${unitId}」→ デフォルト単元「${unit.name}」`)
            return unit.name
          }
        }
      }
    }

    console.warn(`⚠️ 単元ID「${unitId}」が見つかりません！IDをそのまま表示します`)
    return unitId
  }

  // セッション記録フォームを開く
  const handleOpenSessionForm = (taskId) => {
    setShowSessionForm(taskId)
    setSessionForm({
      studiedAt: new Date().toISOString().split('T')[0],
      score: '',
      totalScore: '',
      timeSpent: '',
      notes: ''
    })
  }

  // セッション記録を保存
  const handleSaveSession = async (taskId) => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }

    const attemptNumber = await getNextAttemptNumber(user.uid, taskId)

    const sessionData = {
      ...sessionForm,
      attemptNumber,
      score: sessionForm.score ? parseInt(sessionForm.score) : null,
      totalScore: sessionForm.totalScore ? parseInt(sessionForm.totalScore) : null,
      timeSpent: sessionForm.timeSpent ? parseInt(sessionForm.timeSpent) : null,
    }

    const result = await addPastPaperSession(user.uid, taskId, sessionData)

    if (result.success) {
      // Firestoreから最新データを再読み込み
      await loadSessions()
      setShowSessionForm(null)
      toast.success('学習記録を保存しました')
    } else {
      toast.error('保存に失敗しました: ' + result.error)
    }
  }

  // 得点率を計算
  const getScorePercentage = (session) => {
    if (session.score !== null && session.totalScore && session.totalScore > 0) {
      return Math.round((session.score / session.totalScore) * 100)
    }
    return null
  }

  // 単元を選択
  const selectUnit = (unitId) => {
    setAddForm({
      ...addForm,
      unitId: unitId
    })
  }

  // 過去問タスクを追加
  const handleAddPastPaper = async () => {
    if (!addForm.schoolName || !addForm.year || !addForm.round) {
      toast.error('学校名、年度、回を入力してください')
      return
    }

    const newTask = {
      title: `${addForm.schoolName} ${addForm.year} ${addForm.round}`,
      taskType: 'pastpaper',
      subject: addForm.subject,  // フォーム内の科目を使用
      grade: '全学年', // 過去問は学年無関係
      schoolName: addForm.schoolName,
      year: addForm.year,
      round: addForm.round,
      unitId: addForm.unitId,  // 単一の単元ID
      fileUrl: addForm.fileUrl,  // 問題ファイルのURL
      dueDate: '',
      priority: 'medium'
    }

    await onAddTask(newTask)
    setAddForm({ schoolName: '', year: '', round: '', subject: '算数', grade: '4年生', unitId: '', fileUrl: '' })
    setShowAddForm(false)
    toast.success('過去問を追加しました')
  }

  // 過去問タスクを削除
  const handleDeletePastPaper = async (taskId, taskTitle) => {
    if (!user) {
      toast.error('ログインが必要です')
      return
    }

    // 確認ダイアログ
    const confirmed = window.confirm(
      `「${taskTitle}」を削除しますか？\n\nこの過去問に関連する学習記録もすべて削除されます。`
    )

    if (!confirmed) return

    try {
      // 先に関連するセッションデータを削除
      const sessionResult = await deleteSessionsByTaskId(user.uid, taskId)

      if (!sessionResult.success) {
        toast.error('学習記録の削除に失敗しました: ' + sessionResult.error)
        return
      }

      // タスクを削除
      await onDeleteTask(taskId)

      toast.success('過去問を削除しました')
    } catch (error) {
      toast.error('削除に失敗しました: ' + error.message)
    }
  }

  // 過去問タスクの編集を開始
  const handleStartEdit = (task) => {
    setEditingTaskId(task.id)
    setEditForm({
      schoolName: task.schoolName || '',
      year: task.year || '',
      round: task.round || '',
      subject: task.subject || '算数',
      grade: task.grade || '4年生',
      unitId: task.unitId || '',
      fileUrl: task.fileUrl || ''
    })
  }

  // 過去問タスクの編集をキャンセル
  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditForm({
      schoolName: '',
      year: '',
      round: '',
      subject: '算数',
      grade: '4年生',
      unitId: '',
      fileUrl: ''
    })
  }

  // 過去問タスクの編集を保存
  const handleSaveEdit = async () => {
    if (!editForm.schoolName || !editForm.year || !editForm.round) {
      toast.error('学校名、年度、回を入力してください')
      return
    }

    const updatedTask = {
      title: `${editForm.schoolName} ${editForm.year} ${editForm.round}`,
      schoolName: editForm.schoolName,
      year: editForm.year,
      round: editForm.round,
      subject: editForm.subject,
      unitId: editForm.unitId,
      fileUrl: editForm.fileUrl
    }

    await onUpdateTask(editingTaskId, updatedTask)
    setEditingTaskId(null)
    toast.success('過去問を更新しました')
  }

  // 編集フォームで単元を選択
  const selectEditUnit = (unitId) => {
    setEditForm({
      ...editForm,
      unitId: unitId
    })
  }

  // 学習記録の展開/折りたたみをトグル
  const toggleSessionExpanded = (taskId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  const groupedData = viewMode === 'school' ? groupBySchool() : groupByUnit()

  return (
    <div className="pastpaper-view">
      {/* フィルター */}
      <div className="view-filters">
        <div className="filter-group">
          <label>表示モード:</label>
          <button
            className={`mode-btn ${viewMode === 'school' ? 'active' : ''}`}
            onClick={() => setViewMode('school')}
          >
            🏫 学校別
          </button>
          <button
            className={`mode-btn ${viewMode === 'unit' ? 'active' : ''}`}
            onClick={() => setViewMode('unit')}
          >
            📚 単元別
          </button>
        </div>

        <div className="subject-buttons">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`subject-btn ${selectedSubject === subject ? 'active' : ''}`}
              onClick={() => setSelectedSubject(subject)}
              style={{
                borderColor: selectedSubject === subject ? subjectColors[subject] : '#e2e8f0',
                background: selectedSubject === subject ? `${subjectColors[subject]}15` : 'white',
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
            <h2>📄 過去問管理</h2>
            <p className="view-description">
              過去問の学習記録を管理します。同じ過去問を何度でも演習できます。
            </p>
          </div>
          <button
            className="add-pastpaper-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ 閉じる' : '+ 過去問を追加'}
          </button>
        </div>
      </div>

      {/* 過去問追加フォーム */}
      {showAddForm && (
        <div className="add-pastpaper-form">
          <h3>📝 新しい過去問を追加</h3>

          {/* 科目選択（最優先） */}
          <div className="add-form-section">
            <label className="section-label">科目:</label>
            <div className="subject-selector-inline">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  className={`subject-btn ${addForm.subject === subject ? 'active' : ''}`}
                  onClick={() => {
                    // 科目変更時に単元選択をクリア
                    setAddForm({
                      ...addForm,
                      subject,
                      relatedUnits: []  // 科目が変わったら単元選択をリセット
                    })
                  }}
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

          <div className="add-form-field" style={{ marginBottom: '12px' }}>
            <label>学校名:</label>
            <input
              type="text"
              placeholder="例: 開成中学校"
              value={addForm.schoolName}
              onChange={(e) => setAddForm({ ...addForm, schoolName: e.target.value })}
            />
          </div>

          <div className="add-form-grid-two-cols">
            <div className="add-form-field">
              <label>年度:</label>
              <input
                type="text"
                placeholder="例: 2024年度"
                value={addForm.year}
                onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
              />
            </div>
            <div className="add-form-field">
              <label>回:</label>
              <input
                type="text"
                placeholder="例: 第1回"
                value={addForm.round}
                onChange={(e) => setAddForm({ ...addForm, round: e.target.value })}
              />
            </div>
          </div>

          {/* 問題ファイルURL */}
          <div className="add-form-section">
            <label className="section-label">📎 問題ファイル（任意）:</label>
            <input
              type="url"
              className="file-url-input"
              placeholder="GoogleドライブやPDFのURLを貼り付け"
              value={addForm.fileUrl}
              onChange={(e) => setAddForm({ ...addForm, fileUrl: e.target.value })}
            />
            <small className="input-hint">
              Googleドライブの共有リンクやPDFのURLを入力してください
            </small>
          </div>

          {/* 学年選択 */}
          <div className="add-form-section">
            <label className="section-label">学年（単元選択用）:</label>
            <div className="grade-selector-inline">
              {grades.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className={`grade-btn-small ${addForm.grade === grade ? 'active' : ''}`}
                  onClick={() => setAddForm({ ...addForm, grade })}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* 単元選択 */}
          <div className="add-form-section">
            <label className="section-label">単元（任意）:</label>
            <div className="units-checkbox-grid">
              {/* デフォルト単元 */}
              {unitsDatabase[addForm.subject]?.[addForm.grade]?.map((unit) => (
                <label key={unit.id} className="unit-checkbox-label">
                  <input
                    type="radio"
                    name="unitId"
                    checked={addForm.unitId === unit.id}
                    onChange={() => selectUnit(unit.id)}
                  />
                  <span>{unit.name}</span>
                </label>
              ))}
              {/* カスタム単元 */}
              {customUnits
                .filter(u => u.subject === addForm.subject && u.grade === addForm.grade)
                .map((unit) => (
                  <label key={unit.id} className="unit-checkbox-label custom">
                    <input
                      type="radio"
                      name="unitId"
                      checked={addForm.unitId === unit.id}
                      onChange={() => selectUnit(unit.id)}
                    />
                    <span>⭐ {unit.name}</span>
                  </label>
                ))}
            </div>
            {addForm.unitId && (
              <div className="selected-units-summary">
                選択中: {getUnitName(addForm.unitId)}
              </div>
            )}
          </div>

          <div className="add-form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowAddForm(false)
                setAddForm({ schoolName: '', year: '', round: '', subject: '算数', grade: '4年生', unitId: '', fileUrl: '' })
              }}
            >
              キャンセル
            </button>
            <button
              className="btn-primary"
              onClick={handleAddPastPaper}
            >
              ✓ 追加する
            </button>
          </div>
        </div>
      )}

      {/* タスク一覧 */}
      <div className="pastpaper-content">
        {Object.keys(groupedData).length === 0 ? (
          <div className="no-data">
            📝 この条件の過去問タスクがありません
            <br />
            <small>タスク追加画面で「📄 過去問」タイプのタスクを作成してください</small>
          </div>
        ) : (
          Object.entries(groupedData).map(([key, taskList]) => (
            <div key={key} className="pastpaper-group">
              <h3 className="group-title">
                {viewMode === 'school' ? `🏫 ${key}` : `📚 ${getUnitName(key)}`}
                <span className="task-count">({taskList.length}問)</span>
              </h3>

              <div className="task-cards">
                {taskList.map(task => {
                  const taskSessions = (sessions[task.id] || []).sort((a, b) => a.attemptNumber - b.attemptNumber)
                  const lastSession = taskSessions[taskSessions.length - 1]

                  return (
                    <div key={task.id} className="pastpaper-card">
                      {editingTaskId === task.id ? (
                        // 編集モード
                        <div className="edit-form-container">
                          <h4>📝 過去問を編集</h4>

                          {/* 科目選択 */}
                          <div className="edit-form-section">
                            <label className="section-label">科目:</label>
                            <div className="subject-selector-inline">
                              {subjects.map((subject) => (
                                <button
                                  key={subject}
                                  type="button"
                                  className={`subject-btn ${editForm.subject === subject ? 'active' : ''}`}
                                  onClick={() => {
                                    setEditForm({
                                      ...editForm,
                                      subject,
                                      unitId: ''
                                    })
                                  }}
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

                          <div className="edit-form-field" style={{ marginBottom: '12px' }}>
                            <label>学校名:</label>
                            <input
                              type="text"
                              value={editForm.schoolName}
                              onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                            />
                          </div>

                          <div className="edit-form-grid-two-cols">
                            <div className="edit-form-field">
                              <label>年度:</label>
                              <input
                                type="text"
                                value={editForm.year}
                                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                              />
                            </div>
                            <div className="edit-form-field">
                              <label>回:</label>
                              <input
                                type="text"
                                value={editForm.round}
                                onChange={(e) => setEditForm({ ...editForm, round: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* 問題ファイルURL */}
                          <div className="edit-form-section">
                            <label className="section-label">📎 問題ファイル（任意）:</label>
                            <input
                              type="url"
                              className="file-url-input"
                              placeholder="GoogleドライブやPDFのURLを貼り付け"
                              value={editForm.fileUrl}
                              onChange={(e) => setEditForm({ ...editForm, fileUrl: e.target.value })}
                            />
                            <small className="input-hint">
                              Googleドライブの共有リンクやPDFのURLを入力してください
                            </small>
                          </div>

                          {/* 学年選択 */}
                          <div className="edit-form-section">
                            <label className="section-label">学年（単元選択用）:</label>
                            <div className="grade-selector-inline">
                              {grades.map((grade) => (
                                <button
                                  key={grade}
                                  type="button"
                                  className={`grade-btn-small ${editForm.grade === grade ? 'active' : ''}`}
                                  onClick={() => setEditForm({ ...editForm, grade })}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 単元選択 */}
                          <div className="edit-form-section">
                            <label className="section-label">単元:</label>
                            <div className="units-checkbox-grid">
                              {unitsDatabase[editForm.subject]?.[editForm.grade]?.map((unit) => (
                                <label key={unit.id} className="unit-checkbox-label">
                                  <input
                                    type="radio"
                                    name="editUnitId"
                                    checked={editForm.unitId === unit.id}
                                    onChange={() => selectEditUnit(unit.id)}
                                  />
                                  <span>{unit.name}</span>
                                </label>
                              ))}
                              {customUnits
                                .filter(u => u.subject === editForm.subject && u.grade === editForm.grade)
                                .map((unit) => (
                                  <label key={unit.id} className="unit-checkbox-label custom">
                                    <input
                                      type="radio"
                                      name="editUnitId"
                                      checked={editForm.unitId === unit.id}
                                      onChange={() => selectEditUnit(unit.id)}
                                    />
                                    <span>⭐ {unit.name}</span>
                                  </label>
                                ))}
                            </div>
                            {editForm.unitId && (
                              <div className="selected-units-summary">
                                選択中: {getUnitName(editForm.unitId)}
                              </div>
                            )}
                          </div>

                          <div className="edit-form-actions">
                            <button className="btn-secondary" onClick={handleCancelEdit}>
                              キャンセル
                            </button>
                            <button className="btn-primary" onClick={handleSaveEdit}>
                              ✓ 保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 通常表示モード
                        <>
                          <div className="card-header">
                            <div className="task-title">
                              <span className="task-name">
                                {task.title}
                                {task.unitId && (
                                  <span className="unit-tag" style={{ marginLeft: '8px' }}>
                                    {getUnitName(task.unitId)}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="card-header-actions">
                              <div className="attempt-count">
                                {taskSessions.length}回演習済み
                              </div>
                              {task.fileUrl && (
                                <a
                                  href={task.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="file-link-btn"
                                  title="問題ファイルを開く"
                                >
                                  📎
                                </a>
                              )}
                              <button
                                className="edit-pastpaper-btn"
                                onClick={() => handleStartEdit(task)}
                                title="この過去問を編集"
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-pastpaper-btn"
                                onClick={() => handleDeletePastPaper(task.id, task.title)}
                                title="この過去問を削除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* 最新の学習記録（編集モードでない場合のみ表示） */}
                      {editingTaskId !== task.id && lastSession && (
                        <div className="last-session">
                          <span className="session-label">最新:</span>
                          <span className="session-date">
                            {new Date(lastSession.studiedAt).toLocaleDateString('ja-JP')}
                          </span>
                          {getScorePercentage(lastSession) !== null && (
                            <span className="session-score">
                              {getScorePercentage(lastSession)}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* 学習記録の展開/折りたたみボタン（編集モードでなく、セッションがある場合のみ表示） */}
                      {editingTaskId !== task.id && taskSessions.length > 0 && (
                        <button
                          className="toggle-sessions-btn"
                          onClick={() => toggleSessionExpanded(task.id)}
                        >
                          {expandedSessions[task.id] ? '▼' : '▶'} 学習記録 ({taskSessions.length}回)
                        </button>
                      )}

                      {/* セッション一覧（編集モードでなく、展開されている場合のみ表示） */}
                      {editingTaskId !== task.id && expandedSessions[task.id] && taskSessions.length > 0 && (
                        <div className="sessions-list">
                          {taskSessions.map(session => (
                            <div key={session.firestoreId} className="session-item">
                              <span className="session-attempt">{session.attemptNumber}回目</span>
                              <span className="session-date">
                                {new Date(session.studiedAt).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              {session.score !== null && session.totalScore && (
                                <span className="session-score">
                                  {session.score}/{session.totalScore} ({getScorePercentage(session)}%)
                                </span>
                              )}
                              {session.timeSpent && (
                                <span className="session-time">{session.timeSpent}分</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* セッション記録フォーム（編集モードでない場合のみ表示） */}
                      {editingTaskId !== task.id && showSessionForm === task.id ? (
                        <div className="session-form">
                          <h4>📝 学習記録を追加</h4>
                          <div className="form-grid">
                            <div className="form-field">
                              <label>実施日:</label>
                              <input
                                type="date"
                                value={sessionForm.studiedAt}
                                onChange={(e) => setSessionForm({ ...sessionForm, studiedAt: e.target.value })}
                              />
                            </div>
                            <div className="form-field">
                              <label>得点:</label>
                              <div className="score-inputs">
                                <input
                                  type="number"
                                  placeholder="得点"
                                  value={sessionForm.score}
                                  onChange={(e) => setSessionForm({ ...sessionForm, score: e.target.value })}
                                />
                                <span>/</span>
                                <input
                                  type="number"
                                  placeholder="満点"
                                  value={sessionForm.totalScore}
                                  onChange={(e) => setSessionForm({ ...sessionForm, totalScore: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="form-field">
                              <label>所要時間（分）:</label>
                              <input
                                type="number"
                                placeholder="分"
                                value={sessionForm.timeSpent}
                                onChange={(e) => setSessionForm({ ...sessionForm, timeSpent: e.target.value })}
                              />
                            </div>
                            <div className="form-field full">
                              <label>メモ:</label>
                              <textarea
                                placeholder="間違えた問題、気づきなど..."
                                value={sessionForm.notes}
                                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                rows="3"
                              />
                            </div>
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => setShowSessionForm(null)}
                            >
                              キャンセル
                            </button>
                            <button
                              className="btn-primary"
                              onClick={() => handleSaveSession(task.id)}
                            >
                              ✓ 記録する
                            </button>
                          </div>
                        </div>
                      ) : editingTaskId !== task.id ? (
                        <button
                          className="add-session-btn"
                          onClick={() => handleOpenSessionForm(task.id)}
                        >
                          + 学習記録を追加
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PastPaperView
