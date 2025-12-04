// 科目の絵文字
export const subjectEmojis = {
  '国語': '📖',
  '算数': '🔢',
  '理科': '🔬',
  '社会': '🌍',
}

// 科目のカラー
export const subjectColors = {
  '国語': '#10b981',
  '算数': '#ef4444',
  '理科': '#3b82f6',
  '社会': '#f59e0b',
}

// 優先度の定義
export const priorities = [
  { value: 'A', label: 'A (最重要)', color: '#ef4444' },
  { value: 'B', label: 'B (重要)', color: '#f59e0b' },
  { value: 'C', label: 'C (通常)', color: '#3b82f6' },
]

// タスク種別の定義
export const taskTypes = [
  { value: 'daily', label: 'デイリー復習', emoji: '📖' },
  { value: 'basic', label: '基礎トレ', emoji: '✏️' },
  { value: 'test', label: 'テスト対策', emoji: '📝' },
  { value: 'pastpaper', label: '過去問', emoji: '📄' },
  { value: 'weakness', label: '弱点補強', emoji: '💪' },
]

// 曜日の名前
export const weekDayNames = ['日', '月', '火', '水', '木', '金', '土']
