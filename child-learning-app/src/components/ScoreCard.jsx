import './TestScoreView.css'

function ScoreCard({ score, onEdit, onDelete, onDeleteRequest, onDeleteCancel, isPendingDelete }) {
  const subjects = [
    { key: 'sansu', label: '算数' },
    { key: 'kokugo', label: '国語' },
    { key: 'rika', label: '理科' },
    { key: 'shakai', label: '社会' },
  ]

  const genderSections = [
    { key: 'fourSubjectsGender', label: '男女別4科' },
    { key: 'twoSubjectsGender', label: '男女別2科' },
    { key: 'sansuGender', label: '男女別算数' },
    { key: 'kokugoGender', label: '男女別国語' },
  ]

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

      {/* 4科目・2科目サマリー */}
      <div className="summary-scores">
        {score.fourSubjects?.deviation && (
          <div className="summary-item four-subjects">
            <span className="summary-label">4科目</span>
            {score.fourSubjects.score && (
              <span className="summary-score">{score.fourSubjects.score}点</span>
            )}
            <span className="summary-deviation">偏差値 {score.fourSubjects.deviation}</span>
            {score.fourSubjects.rank && (
              <span className="summary-rank">
                {score.fourSubjects.rank}位{score.fourSubjects.totalStudents && `/${score.fourSubjects.totalStudents}人`}
              </span>
            )}
          </div>
        )}
        {score.twoSubjects?.deviation && (
          <div className="summary-item two-subjects">
            <span className="summary-label">2科目</span>
            {score.twoSubjects.score && (
              <span className="summary-score">{score.twoSubjects.score}点</span>
            )}
            <span className="summary-deviation">偏差値 {score.twoSubjects.deviation}</span>
            {score.twoSubjects.rank && (
              <span className="summary-rank">
                {score.twoSubjects.rank}位{score.twoSubjects.totalStudents && `/${score.twoSubjects.totalStudents}人`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 科目別得点 */}
      <div className="subject-scores">
        {subjects.map(({ key, label }) => {
          const data = score[key]
          if (!data?.score && !data?.deviation) return null

          return (
            <div key={key} className="subject-item">
              <span className="subject-label">{label}</span>
              {data.score && (
                <span className="subject-score">
                  {data.score}点
                  {data.average && <span className="average">（平均 {data.average}）</span>}
                </span>
              )}
              {data.deviation && (
                <span className="subject-deviation">偏差値 {data.deviation}</span>
              )}
              {data.rank && (
                <span className="subject-rank">{data.rank}位</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 男女別 */}
      {genderSections.some(({ key }) => score[key]?.deviation) && (
        <div className="gender-scores">
          {genderSections.map(({ key, label }) => {
            const data = score[key]
            if (!data?.deviation) return null
            return (
              <div key={key} className="subject-item gender-item">
                <span className="subject-label">{label}</span>
                <span className="subject-deviation">偏差値 {data.deviation}</span>
                {data.rank && (
                  <span className="summary-rank">
                    {data.rank}位{data.totalStudents && `/${data.totalStudents}人`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 設問内容別成績 */}
      {score.questionBreakdown && (() => {
        const qb = score.questionBreakdown
        const subjectLabels = { sansu: '算数', kokugo: '国語', rika: '理科', shakai: '社会' }
        const hasAny = ['sansu', 'kokugo', 'rika', 'shakai'].some(s => qb[s]?.length > 0)
        if (!hasAny) return null
        return (
          <div className="qb-display">
            <div className="qb-display-title">設問内容別</div>
            {['sansu', 'kokugo', 'rika', 'shakai'].map(subj => {
              const rows = qb[subj]
              if (!rows?.length) return null
              return (
                <div key={subj} className="qb-display-subject">
                  <span className="qb-display-subject-label">{subjectLabels[subj]}</span>
                  <div className="qb-display-rows">
                    {rows.map((row, i) => {
                      const pct = row.totalScore > 0 ? Math.round((row.score / row.totalScore) * 100) : 0
                      const avgPct = row.totalScore > 0 && row.average != null ? Math.round((row.average / row.totalScore) * 100) : 0
                      return (
                        <div key={i} className="qb-display-row">
                          <span className="qb-display-name">{row.name}</span>
                          <span className="qb-display-score">{row.score}/{row.totalScore}</span>
                          <div className="qb-bar-container">
                            <div className="qb-bar-avg" style={{ width: `${avgPct}%` }} />
                            <div className="qb-bar-score" style={{ width: `${pct}%` }} />
                          </div>
                          {row.average != null && (
                            <span className="qb-display-avg">平均{row.average}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

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
