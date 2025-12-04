/**
 * 理解度レベルを星表示に変換
 * @param {number} level - 理解度レベル (1-5)
 * @returns {string} - 星の文字列（例: "★★★☆☆"）
 */
export function getMasteryStars(level) {
  return '★'.repeat(level) + '☆'.repeat(5 - level)
}

/**
 * 得点率を計算
 * @param {number} score - 得点
 * @param {number} maxScore - 満点
 * @returns {number|null} - 得点率（%）またはnull
 */
export function getPercentage(score, maxScore) {
  if (!score || !maxScore || maxScore === 0) return null
  return Math.round((score / maxScore) * 100)
}
