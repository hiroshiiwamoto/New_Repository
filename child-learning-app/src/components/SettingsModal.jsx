import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getStorageUsage, deleteOrphanFiles } from '../utils/storageUsage'
import { toast } from '../utils/toast'
import Loading from './Loading'
import './SettingsModal.css'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function SettingsModal({ userId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    loadUsage()
  }, [userId])

  const loadUsage = async () => {
    setLoading(true)
    const result = await getStorageUsage(userId)
    if (result.success) {
      setUsage(result.data)
    } else {
      setUsage(null)
    }
    setLoading(false)
  }

  const handleCleanup = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setCleaning(true)
    const result = await deleteOrphanFiles(usage.orphanFiles)
    if (result.success) {
      toast.success(`${result.deletedCount}件の不要画像を削除しました`)
      setConfirmDelete(false)
      await loadUsage()
    } else {
      toast.error('削除に失敗しました')
    }
    setCleaning(false)
  }

  return createPortal(
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3 className="settings-title">設定</h3>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h4 className="settings-section-title">ストレージ使用量</h4>
            {loading ? (
              <Loading message="使用量を確認中..." />
            ) : usage ? (
              <div className="storage-info">
                <div className="storage-stat">
                  <span className="storage-label">画像ファイル数</span>
                  <span className="storage-value">{usage.totalFiles}件</span>
                </div>
                <div className="storage-stat">
                  <span className="storage-label">合計サイズ</span>
                  <span className="storage-value">{formatBytes(usage.totalBytes)}</span>
                </div>
                {usage.orphanFiles.length > 0 && (
                  <div className="storage-orphan-section">
                    <div className="storage-orphan-info">
                      <span className="storage-orphan-label">
                        不要な画像: {usage.orphanFiles.length}件 ({formatBytes(usage.orphanBytes)})
                      </span>
                      <p className="storage-orphan-desc">
                        問題データから参照されていない画像ファイルです
                      </p>
                    </div>
                    <button
                      className={`storage-cleanup-btn ${confirmDelete ? 'confirm' : ''}`}
                      onClick={handleCleanup}
                      disabled={cleaning}
                    >
                      {cleaning ? '削除中...'
                        : confirmDelete ? '本当に削除する'
                        : '不要画像を削除'}
                    </button>
                  </div>
                )}
                {usage.orphanFiles.length === 0 && usage.totalFiles > 0 && (
                  <p className="storage-clean-msg">不要な画像はありません</p>
                )}
                {usage.totalFiles === 0 && (
                  <p className="storage-clean-msg">画像ファイルはありません</p>
                )}
              </div>
            ) : (
              <p className="storage-error">使用量の取得に失敗しました</p>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-close-btn" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
