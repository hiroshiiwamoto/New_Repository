import './EmptyState.css'

function EmptyState({ icon, message, hint }) {
  return (
    <div className="common-empty-state">
      {icon && <span className="common-empty-icon">{icon}</span>}
      <p className="common-empty-message">{message}</p>
      {hint && <small className="common-empty-hint">{hint}</small>}
    </div>
  )
}

export default EmptyState
