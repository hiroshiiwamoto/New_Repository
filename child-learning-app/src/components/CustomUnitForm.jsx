import './TaskForm.css'

function CustomUnitForm({
  customUnitName,
  setCustomUnitName,
  customUnitCategory,
  setCustomUnitCategory,
  onAdd,
  onCancel
}) {
  return (
    <div className="custom-unit-form">
      <h3>➕ カスタム単元を追加</h3>
      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="customUnitName">単元名</label>
          <input
            type="text"
            id="customUnitName"
            value={customUnitName}
            onChange={(e) => setCustomUnitName(e.target.value)}
            placeholder="例: 開成2023年第1回"
          />
        </div>
        <div className="form-group half">
          <label htmlFor="customUnitCategory">カテゴリ</label>
          <select
            id="customUnitCategory"
            value={customUnitCategory}
            onChange={(e) => setCustomUnitCategory(e.target.value)}
          >
            <option value="過去問">過去問</option>
            <option value="弱点対策">弱点対策</option>
            <option value="発展">発展</option>
            <option value="特訓">特訓</option>
            <option value="その他">その他</option>
          </select>
        </div>
      </div>
      <div className="custom-unit-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onAdd}
        >
          追加
        </button>
      </div>
    </div>
  )
}

export default CustomUnitForm
