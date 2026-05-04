import s from './TypeChip.module.css'

const TYPES = {
  intro:   { emoji: '🌐', label: 'Intro' },
  museum:  { emoji: '🏆', label: 'Museum' },
  jugador: { emoji: '⚽', label: 'Jugador' },
  plantel: { emoji: '👥', label: 'Plantel' },
  escudo:  { emoji: '🛡️', label: 'Escudo' },
}

export default function TypeChip({ type, label, className = '' }) {
  if (!type) return null
  const t = String(type).toLowerCase()
  const def = TYPES[t]
  if (!def) {
    return <span className={`${s.chip} ${className}`}>{label || type}</span>
  }
  return (
    <span className={`${s.chip} ${s[`type${t.charAt(0).toUpperCase()}${t.slice(1)}`]} ${className}`}>
      <span className={s.emoji} aria-hidden="true">{def.emoji}</span>
      <span>{label || def.label}</span>
    </span>
  )
}
