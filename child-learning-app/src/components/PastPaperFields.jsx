import './TaskForm.css'

function PastPaperFields({
  schoolName,
  setSchoolName,
  year,
  setYear,
  round,
  setRound,
  relatedUnits,
  onToggleRelatedUnit,
  currentUnits
}) {
  return (
    <div className="pastpaper-fields">
      <div className="form-row three-cols">
        <div className="form-group">
          <label htmlFor="schoolName">学校名</label>
          <input
            type="text"
            id="schoolName"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="例: 開成"
          />
        </div>
        <div className="form-group">
          <label htmlFor="year">年度</label>
          <input
            type="text"
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="例: 2023"
          />
        </div>
        <div className="form-group">
          <label htmlFor="round">回次</label>
          <select
            id="round"
            value={round}
            onChange={(e) => setRound(e.target.value)}
          >
            <option value="第1回">第1回</option>
            <option value="第2回">第2回</option>
            <option value="第3回">第3回</option>
            <option value="第4回">第4回</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>関連単元（複数選択可）</label>
        <div className="related-units-checkboxes">
          {currentUnits.map(unit => (
            <label key={unit.id} className="unit-checkbox-label">
              <input
                type="checkbox"
                checked={relatedUnits.includes(unit.id)}
                onChange={() => onToggleRelatedUnit(unit.id)}
              />
              <span>{unit.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PastPaperFields
