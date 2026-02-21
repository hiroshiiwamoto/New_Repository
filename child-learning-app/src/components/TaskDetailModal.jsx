// タスク詳細モーダル — タスクのメタ情報 + PDF + 問題クリップ
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { subjectEmojis, subjectColors, taskTypes } from '../utils/constants'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { getProblemsBySource } from '../utils/problems'
import ProblemClipList from './ProblemClipList'

export default function TaskDetailModal({ task, userId, onEdit, onClose }) {
  const [problems, setProblems] = useState([])
  const subjectColor = subjectColors[task.subject] || '#007AFF'

  const getEmbedUrl = (fileUrl) => {
    if (!fileUrl) return null
    const match = fileUrl.match(/\/file\/d\/([^/]+)/)
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : fileUrl
  }

  const loadProblems = useCallback(async () => {
    if (!userId || !task.id) return
    const result = await getProblemsBySource(userId, 'task', task.id)
    if (result.success) setProblems(result.data)
  }, [userId, task.id])

  useEffect(() => { loadProblems() }, [loadProblems])

  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])

  const taskTypeLabel = taskTypes.find(t => t.value === task.taskType)

  const pdfInfo = useMemo(() => {
    const id = task.fileUrl?.match(/\/file\/d\/([^/?]+)/)?.[1]
    return id ? { driveFileId: id, fileName: task.fileName || task.title } : null
  }, [task.fileUrl, task.fileName, task.title])

  return createPortal(
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="task-detail-header" style={{ borderBottomColor: subjectColor }}>
          <div className="task-detail-header-left">
            <span className="task-detail-emoji">{subjectEmojis[task.subject]}</span>
            <h3 className="task-detail-title">{task.title}</h3>
          </div>
          <button className="task-detail-close" onClick={onClose}>&times;</button>
        </div>

        <div className="task-detail-body">
          {/* メタ情報 */}
          <div className="task-detail-meta">
            <div className="task-detail-meta-row">
              <span className="task-detail-badge" style={{ color: subjectColor, background: `${subjectColor}18` }}>
                {task.subject}
              </span>
              {taskTypeLabel && (
                <span className="task-detail-type-badge">
                  {taskTypeLabel.emoji} {taskTypeLabel.label}
                </span>
              )}
              {task.priority && (
                <span className={`task-detail-priority priority-${task.priority}`}>
                  {task.priority}
                </span>
              )}
              {task.completed && (
                <span className="task-detail-done-badge">完了</span>
              )}
            </div>

            {task.grade && (
              <div className="task-detail-field">
                <span className="task-detail-label">学年</span>
                <span className="task-detail-value">{task.grade}</span>
              </div>
            )}

            {task.dueDate && (
              <div className="task-detail-field">
                <span className="task-detail-label">期限</span>
                <span className="task-detail-value">{task.dueDate}</span>
              </div>
            )}

            {task.unitIds?.length > 0 && (
              <div className="task-detail-field">
                <span className="task-detail-label">単元</span>
                <div className="task-detail-units">
                  {task.unitIds.map(id => (
                    <span key={id} className="task-detail-unit-badge">
                      {unitNameMap[id] || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF プレビュー */}
          {task.fileUrl && (
            <div className="task-detail-pdf-section">
              <div className="task-detail-pdf-header">
                <span>📄 {task.fileName || 'PDF'}</span>
                <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="task-detail-pdf-link">
                  新しいタブで開く
                </a>
              </div>
              <div className="task-detail-pdf-embed">
                <iframe
                  src={getEmbedUrl(task.fileUrl)}
                  title={`PDF: ${task.title}`}
                />
              </div>
            </div>
          )}

          {/* 問題クリップ */}
          <ProblemClipList
            userId={userId}
            problems={problems}
            onReload={loadProblems}
            sourceType="task"
            sourceId={task.id}
            subject={task.subject || ''}
            defaultUnitIds={task.unitIds || []}
            pdfInfo={pdfInfo}
            taskGenInfo={null}
            defaultExpanded={true}
            collapsible={false}
          />
        </div>

        {/* フッター */}
        <div className="task-detail-footer">
          {onEdit && (
            <button
              className="task-detail-edit-btn"
              onClick={() => { onClose(); onEdit(task) }}
            >
              ✏️ 編集
            </button>
          )}
          <button className="task-detail-close-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
