import s from './ProgressBar.module.css'

export default function ProgressBar({
  pct = 0,
  color,
  height = 4,
  track,
  className = '',
}) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0))
  const trackStyle = { height }
  if (track) trackStyle.background = track
  const fillStyle = {
    width: `${value}%`,
    background: color || 'var(--accent)',
  }
  return (
    <div
      className={`${s.track} ${className}`}
      style={trackStyle}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={s.fill} style={fillStyle} />
    </div>
  )
}
