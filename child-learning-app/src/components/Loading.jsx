import './Loading.css'

function Loading({ message = '読み込み中...', spinner = true }) {
  return (
    <div className="common-loading">
      {spinner && <div className="common-loading-spinner" />}
      <p className="common-loading-text">{message}</p>
    </div>
  )
}

export default Loading
