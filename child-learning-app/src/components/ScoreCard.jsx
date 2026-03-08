import './TestScoreView.css'

function ScoreCard({ score, onEdit, onDelete, onDeleteRequest, onDeleteCancel, isPendingDelete }) {
  const rows = [
    { key: 'fourSubjects', genderKey: 'fourSubjectsGender', label: '4科目合計' },
    { key: 'twoSubjects', genderKey: 'twoSubjectsGender', label: '2科目合計' },
    { key: 'sansu', genderKey: 'sansuGender', label: '算数' },
    { key: 'kokugo', genderKey: 'kokugoGender', label: '国語' },
    { key: 'rika', genderKey: 'rikaGender', label: '理科' },
    { key: 'shakai', genderKey: 'shakaiGender', label: '社会' },
  ]

  const hasAnyData = rows.some(({ key }) => score[key]?.score || score[key]?.deviation)

  // 4科目偏差値 → なければ2科目偏差値
  const mainDeviation = score.fourSubjects?.deviation || score.twoSubjects?.deviation
  const mainDeviationLabel = score.fourSubjects?.deviation ? '4科' : '2科'

  return (
    <div className="score-card">
      <div className="card-header">
        <div className="card-header-left">
          <h3 className="test-name">{score.testName}</h3>
          <span className="test-date">
            {new Date(score.testDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="card-header-center">
          {mainDeviation && (
            <span className="card-deviation-badge">
              {mainDeviationLabel} {mainDeviation}
            </span>
          )}
        </div>
        <div className="card-actions">
          <button className="edit-btn" onClick={() => onEdit(score)} title="編集">
            ✏️
          </button>
          {isPendingDelete ? (
            <span className="delete-confirm-inline">
              <button className="delete-confirm-yes" onClick={() => onDelete(score)}>削除</button>
              <button className="delete-confirm-no" onClick={onDeleteCancel}>戻す</button>
            </span>
          ) : (
            <button className="delete-btn" onClick={() => onDeleteRequest(score.id)} title="削除">
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* 成績テーブル */}
      {hasAnyData && (
        <div className="grades-table-wrapper">
          <table className="grades-table scorecard-table">
            <thead>
              <tr>
                <th rowSpan="2"></th>
                <th colSpan="4">全体</th>
                <th colSpan="3">男女別</th>
              </tr>
              <tr>
                <th>得点</th>
                <th>平均</th>
                <th>偏差値</th>
                <th>順位</th>
                <th>平均</th>
                <th>偏差値</th>
                <th>順位</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, genderKey, label }) => {
                const data = score[key]
                const gData = score[genderKey]
                if (!data?.score && !data?.deviation) return null
                return (
                  <tr key={key}>
                    <th className="grades-table-label">{label}</th>
                    <td>{data.score && `${data.score}${data.totalScore ? `/${data.totalScore}` : ''}`}</td>
                    <td>{data.average || ''}</td>
                    <td>{data.deviation || ''}</td>
                    <td>{data.rank && `${data.rank}${data.totalStudents ? `/${data.totalStudents}` : ''}`}</td>
                    <td>{gData?.average || ''}</td>
                    <td>{gData?.deviation || ''}</td>
                    <td>{gData?.rank && `${gData.rank}${gData.totalStudents ? `/${gData.totalStudents}` : ''}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 成績表PDF */}
      {score.pdfUrl && (
        <div className="additional-info">
          <span className="task-file-icon">📎</span>
          <a href={score.pdfUrl} target="_blank" rel="noopener noreferrer" className="task-file-link">
            {score.pdfFileName || '成績表PDF'}
          </a>
        </div>
      )}

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
