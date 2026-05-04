import s from './ConfBadge.module.css'

const LABELS = {
  CONMEBOL: 'CONMEBOL',
  UEFA: 'UEFA',
  CONCACAF: 'CONCACAF',
  CAF: 'CAF',
  AFC: 'AFC',
  OFC: 'OFC',
}

export default function ConfBadge({ confederation, size = 'sm', className = '' }) {
  if (!confederation) return null
  const conf = String(confederation).toUpperCase()
  const variant = s[`conf${conf}`] || ''
  const sizeClass = size === 'xs' ? s.xs : ''
  return (
    <span className={`${s.badge} ${variant} ${sizeClass} ${className}`}>
      {LABELS[conf] || conf}
    </span>
  )
}
