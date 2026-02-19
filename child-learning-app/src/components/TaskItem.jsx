import { useState } from 'react'
import './TaskItem.css'
import { subjectEmojis, subjectColors } from '../utils/constants'

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const subjectColor = subjectColors[task.subject] || '#007AFF'
  const [showPDF, setShowPDF] = useState(false)
  const [fullscreenPDF, setFullscreenPDF] = useState(false)

  // Google Drive URLから埋め込みプレビューURLを生成
  const getEmbedUrl = (fileUrl) => {
    if (!fileUrl) return null
    const match = fileUrl.match(/\/file\/d\/([^/]+)/)
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`
    }
    return fileUrl
  }

  return (
    <>
      <div
        className={`task-item ${task.completed ? 'completed' : ''}`}
        style={{
          borderColor: subjectColor,
          backgroundColor: `${subjectColor}15`,
          boxShadow: `0 2px 8px ${subjectColor}25`
        }}
      >
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="task-checkbox"
        />
        <span className="subject-emoji">{subjectEmojis[task.subject]}</span>
        <span
          className="subject-badge"
          style={{
            color: subjectColor
          }}
        >{task.subject}</span>
        <span className="task-title">{task.title}</span>
        {task.problemImageUrl && (
          <a href={task.problemImageUrl} target="_blank" rel="noopener noreferrer" className="task-problem-image-link">
            <img src={task.problemImageUrl} alt="問題画像" className="task-problem-image-thumb" />
          </a>
        )}
        <div className="task-actions">
          {task.fileUrl && (
            <button
              className={`task-pdf-btn ${showPDF ? 'active' : ''}`}
              onClick={() => setShowPDF(!showPDF)}
              aria-label="PDF表示"
              title="PDF表示"
            >
              📄
            </button>
          )}
          {onEdit && (
            <button
              className="edit-btn"
              onClick={() => onEdit(task)}
              aria-label="編集"
            >
              ✏️
            </button>
          )}
          <button
            className="delete-btn"
            onClick={() => onDelete(task.id)}
            aria-label="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* インラインPDFプレビュー */}
      {showPDF && task.fileUrl && (
        <div className="task-pdf-preview-panel">
          <div className="task-pdf-preview-header">
            <span className="task-pdf-preview-title">📄 {task.title}</span>
            <div className="task-pdf-preview-actions">
              <button
                className="task-pdf-fullscreen-btn"
                onClick={() => setFullscreenPDF(true)}
                title="フルスクリーン"
              >
                ⛶
              </button>
              <a
                href={task.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="task-pdf-newtab-btn"
              >
                新しいタブ
              </a>
              <button
                className="task-pdf-close-btn"
                onClick={() => setShowPDF(false)}
              >
                &times;
              </button>
            </div>
          </div>
          <div className="task-pdf-preview-container">
            <iframe
              src={getEmbedUrl(task.fileUrl)}
              title={`PDF: ${task.title}`}
              className="task-pdf-preview-iframe"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* フルスクリーンPDF */}
      {fullscreenPDF && task.fileUrl && (
        <div className="task-pdf-fullscreen-overlay" onClick={() => setFullscreenPDF(false)}>
          <div className="task-pdf-fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <div className="task-pdf-fullscreen-header">
              <span className="task-pdf-fullscreen-title">📄 {task.title}</span>
              <div className="task-pdf-fullscreen-actions">
                <a
                  href={task.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="task-pdf-fullscreen-newtab"
                >
                  新しいタブで開く
                </a>
                <button
                  className="task-pdf-fullscreen-close"
                  onClick={() => setFullscreenPDF(false)}
                >
                  &times;
                </button>
              </div>
            </div>
            <iframe
              src={getEmbedUrl(task.fileUrl)}
              title={`PDF: ${task.title}`}
              className="task-pdf-fullscreen-iframe"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default TaskItem
