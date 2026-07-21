export default function VideoBlock({ label, title, tag, caption, style }) {
  return (
    <div className="video-block" style={style}>
      <div className="video-frame">
        <div className="video-label">{label}</div>
        <div className="play-btn"></div>
        <div className="video-title">{title}</div>
      </div>
      <div className="video-caption">
        <span className="tag">{tag}</span>
        <p>{caption}</p>
      </div>
    </div>
  )
}
