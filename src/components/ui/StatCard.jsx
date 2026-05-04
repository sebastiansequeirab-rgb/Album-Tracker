import CountUp from 'react-countup'
import s from './StatCard.module.css'

export default function StatCard({
  icon,
  label,
  value,
  color,
  accent = false,
  duration = 1.2,
  className = '',
}) {
  const numeric = Number(value) || 0
  const valueStyle = color ? { color } : undefined
  return (
    <div className={`${s.card} ${accent ? s.accent : ''} ${className}`}>
      {icon && <div className={s.icon}>{icon}</div>}
      <div className={s.value} style={valueStyle}>
        <CountUp end={numeric} duration={duration} preserveValue useEasing />
      </div>
      {label && <div className={s.label}>{label}</div>}
    </div>
  )
}
