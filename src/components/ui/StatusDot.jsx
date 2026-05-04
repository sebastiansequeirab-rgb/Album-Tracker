import s from './StatusDot.module.css'

export default function StatusDot({ status = 'missing', size = 8, className = '' }) {
  const variant = s[status] || s.missing
  return (
    <span
      className={`${s.dot} ${variant} ${className}`}
      style={{ width: size, height: size }}
      aria-label={status}
      role="status"
    />
  )
}
