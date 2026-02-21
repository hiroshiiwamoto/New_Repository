// テキスト詳細モーダル — カレンダー上のSAPIXテキストをクリックした時の詳細表示
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { subjectEmojis, subjectColors } from '../utils/constants'
import { getStaticMasterUnits } from '../utils/importMasterUnits'
import { getProblemsBySource } from '../utils/problems'
import ProblemClipList from './ProblemClipList'
import '../components/TaskItem.css' // task-detail-* スタイルを共有

export default function TextDetailModal({ text, userId, onClose }) {
  const [problems, setProblems] = useState([])
  const subjectColor = subjectColors[text.subject] || '#3b82f6'

  const getEmbedUrl = (fileUrl) => {
    if (!fileUrl) return null
    const match = fileUrl.match(/\/file\/d\/([^/]+)/)
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : fileUrl
  }

  const loadProblems = useCallback(async () => {
    if (!userId || !text.id) return
    const result = await getProblemsBySource(userId, 'textbook', text.id)
    if (result.success) setProblems(result.data)
  }, [userId, text.id])

  useEffect(() => { loadProblems() }, [loadProblems])

  const unitNameMap = useMemo(() => {
    const map = {}
    getStaticMasterUnits().forEach(u => { map[u.id] = u.name })
    return map
  }, [])

  const pdfInfo = useMemo(() => {
    const id = text.fileUrl?.match(/\/file\/d\/([^/?]+)/)?.[1]
    return id ? { driveFileId: id, fileName: text.fileName || text.textName } : null
  }, [text.fileUrl, text.fileName, text.textName])

  return createPortal(
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="task-detail-header" style={{ borderBottomColor: subjectColor }}>
          <div className="task-detail-header-left">
            <span className="task-detail-emoji">{subjectEmojis[text.subject] || '📘'}</span>
            <h3 className="task-detail-title">
              {text.textName}
              {text.textNumber && ` ${text.textNumber}`}
            </h3>
          </div>
          <button className="task-detail-close" onClick={onClose}>&times;</button>
        </div>

        <div className="task-detail-body">
          {/* メタ情報 */}
          <div className="task-detail-meta">
            <div className="task-detail-meta-row">
              <span className="task-detail-badge" style={{ color: subjectColor, background: `${subjectColor}18` }}>
                {text.subject}
              </span>
              {text.grade && (
                <span className="task-detail-type-badge">
                  {text.grade}
                </span>
              )}
              {text.studyDate && (
                <span className="task-detail-type-badge">
                  📅 {text.studyDate}
                </span>
              )}
            </div>

            {text.unitIds?.length > 0 && (
              <div className="task-detail-field">
                <span className="task-detail-label">単元</span>
                <div className="task-detail-units">
                  {text.unitIds.map(id => (
                    <span key={id} className="task-detail-unit-badge">
                      {unitNameMap[id] || id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PDF プレビュー */}
          {text.fileUrl && (
            <div className="task-detail-pdf-section">
              <div className="task-detail-pdf-header">
                <span>📄 {text.fileName || 'PDF'}</span>
                <a href={text.fileUrl} target="_blank" rel="noopener noreferrer" className="task-detail-pdf-link">
                  新しいタブで開く
                </a>
              </div>
              <div className="task-detail-pdf-embed">
                <iframe
                  src={getEmbedUrl(text.fileUrl)}
                  title={`PDF: ${text.textName}`}
                />
              </div>
            </div>
          )}

          {/* 問題クリップ */}
          <ProblemClipList
            userId={userId}
            problems={problems}
            onReload={loadProblems}
            sourceType="textbook"
            sourceId={text.id}
            subject={text.subject || ''}
            defaultUnitIds={text.unitIds || []}
            pdfInfo={pdfInfo}
            taskGenInfo={{
              title: `${text.textName}${text.textNumber ? ' ' + text.textNumber : ''}`,
              grade: text.grade,
              fileUrl: text.fileUrl,
              fileName: text.fileName,
              sourceRef: { type: 'textbook', id: text.id },
            }}
            defaultExpanded={true}
            collapsible={false}
          />
        </div>

        {/* フッター */}
        <div className="task-detail-footer">
          <button className="task-detail-close-btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
