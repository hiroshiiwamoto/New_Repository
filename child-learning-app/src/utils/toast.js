// シンプルなToast通知システム

let toastContainer = null

// Toast通知を表示
export function showToast(message, type = 'info') {
  // コンテナがなければ作成
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }

  // Toastエレメントを作成
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`

  // アイコンを設定
  const icon = getIcon(type)

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `

  // コンテナに追加
  toastContainer.appendChild(toast)

  // アニメーション開始
  setTimeout(() => {
    toast.classList.add('toast-show')
  }, 10)

  // 3秒後に削除
  setTimeout(() => {
    toast.classList.remove('toast-show')
    setTimeout(() => {
      if (toastContainer && toastContainer.contains(toast)) {
        toastContainer.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

// タイプに応じたアイコンを取得
function getIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[type] || icons.info
}

// ショートハンド関数
export const toast = {
  success: (message) => showToast(message, 'success'),
  error: (message) => showToast(message, 'error'),
  warning: (message) => showToast(message, 'warning'),
  info: (message) => showToast(message, 'info'),
}
