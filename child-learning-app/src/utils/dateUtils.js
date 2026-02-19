/**
 * 週の開始日（日曜日）を取得
 * @param {Date} date - 基準となる日付
 * @returns {Date} - 週の開始日（日曜日）
 */
export function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

/**
 * 日付をYYYY-MM-DD形式の文字列にフォーマット
 * @param {Date} date - フォーマットする日付
 * @returns {string} - YYYY-MM-DD形式の文字列
 */
export function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 日付に指定した日数を加算
 * @param {Date} date - 基準となる日付
 * @param {number} days - 加算する日数
 * @returns {Date} - 新しい日付
 */
export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 * @returns {string} - 今日の日付
 */
export function getTodayString() {
  return formatDate(new Date())
}

/**
 * 2つの日付の差を日数で取得
 * @param {Date} date1 - 1つ目の日付
 * @param {Date} date2 - 2つ目の日付
 * @returns {number} - 日数の差（date1 - date2）
 */
export function daysDifference(date1, date2) {
  return Math.round((date1 - date2) / MS_PER_DAY)
}

/**
 * 現在時刻をISOString形式で取得（createdAt/updatedAt等に使用）
 * @returns {string} - ISO 8601形式の文字列
 */
export function nowISO() {
  return new Date().toISOString()
}

/**
 * ミリ秒/日の定数
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 経過日数を人間が読みやすいテキストに変換
 * @param {number} days - 経過日数
 * @returns {string} - 読みやすいテキスト
 */
export function getDaysSinceText(days) {
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  return `${Math.floor(days / 30)}ヶ月前`
}
