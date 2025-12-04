import './TestScoreView.css'

function ScoreCard({ score, onEdit, onDelete }) {
  // 得点率を計算
  const getPercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return null
    return Math.round((score / maxScore) * 100)
  }

  return (
    <div className="score-card">
      <div className="card-header">
        <div className="test-info">
          <h3 className="test-name">{score.testName}</h3>
          <span className="test-date">
            {new Date(score.testDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="card-actions">
          <button
            className="edit-btn"
            onClick={() => onEdit(score)}
            title="編集"
          >
            ✏️
          </button>
          <button
            className="delete-btn"
            onClick={() => onDelete(score)}
            title="削除"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 4科目・2科目の成績 */}
      <div className="summary-scores">
        {score.fourSubjects?.deviation && (
          <div className="summary-item four-subjects">
            <span className="summary-label">4科目</span>
            <span className="summary-deviation">偏差値 {score.fourSubjects.deviation}</span>
            {score.fourSubjects.rank && score.fourSubjects.totalStudents && (
              <span className="summary-rank">
                {score.fourSubjects.rank}位/{score.fourSubjects.totalStudents}人
              </span>
            )}
          </div>
        )}
        {score.twoSubjects?.deviation && (
          <div className="summary-item two-subjects">
            <span className="summary-label">2科目</span>
            <span className="summary-deviation">偏差値 {score.twoSubjects.deviation}</span>
            {score.twoSubjects.rank && score.twoSubjects.totalStudents && (
              <span className="summary-rank">
                {score.twoSubjects.rank}位/{score.twoSubjects.totalStudents}人
              </span>
            )}
          </div>
        )}
      </div>

      {/* 科目別得点 */}
      <div className="subject-scores">
        {['kokugo', 'sansu', 'rika', 'shakai'].map(subject => {
          const subjectLabels = { kokugo: '国語', sansu: '算数', rika: '理科', shakai: '社会' }
          const subjectScore = score.scores?.[subject]
          const subjectMax = score.maxScores?.[subject]
          const deviation = score.deviations?.[subject]

          if (!subjectScore && !deviation) return null

          return (
            <div key={subject} className="subject-item">
              <span className="subject-label">{subjectLabels[subject]}</span>
              {subjectScore && subjectMax && (
                <span className="subject-score">
                  {subjectScore}/{subjectMax}
                  {getPercentage(subjectScore, subjectMax) && (
                    <span className="percentage">
                      ({getPercentage(subjectScore, subjectMax)}%)
                    </span>
                  )}
                </span>
              )}
              {deviation && (
                <span className="subject-deviation">偏差値 {deviation}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* コース・クラス・メモ */}
      {(score.course || score.className || score.notes) && (
        <div className="additional-info">
          {score.course && <span className="course">コース: {score.course}</span>}
          {score.className && <span className="class">クラス: {score.className}</span>}
          {score.notes && <p className="notes">{score.notes}</p>}
        </div>
      )}
    </div>
  )
}

export default ScoreCard
