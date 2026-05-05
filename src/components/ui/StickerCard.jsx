import StatusDot from './StatusDot'
import TypeChip from './TypeChip'
import s from './StickerCard.module.css'

const NEXT_STATUS = { missing: 'have', have: 'duplicate', duplicate: 'missing' }
const DOT_VARIANT = { have: 'have', duplicate: 'repeated', missing: 'missing' }
const STATUS_LABEL = { have: 'Tengo', duplicate: 'Repetida', missing: 'Falta' }

const IconCheck = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconCycle = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconCross = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function StatusChipIcon({ status }) {
  if (status === 'have') return <IconCheck />
  if (status === 'duplicate') return <IconCycle />
  return <IconCross />
}

export default function StickerCard({
  card,
  status = 'missing',
  onToggle,
  showTeam = true,
  selected = false,
  className = '',
}) {
  if (!card) return null
  const variant = s[status] || s.missing
  const dotStatus = DOT_VARIANT[status] || 'missing'
  const handleClick = () => {
    if (typeof onToggle === 'function') {
      onToggle(card.id, NEXT_STATUS[status] || 'missing')
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${s.card} ${variant} ${selected ? s.selected : ''} ${className}`}
      aria-label={`#${card.num} ${card.name}, estado ${status}`}
      aria-pressed={selected || undefined}
    >
      <StatusDot status={dotStatus} size={8} className={s.dot} />
      {card.type && <TypeChip type={card.type} className={s.chip} />}
      <div className={s.name}>{card.name}</div>
      <div className={s.meta}>
        {showTeam && card.team && (
          <span className={s.team}>
            {card.flag && <span className={s.flag} aria-hidden="true">{card.flag}</span>}
            <span className={s.teamName}>{card.team}</span>
            <span className={s.teamSep} aria-hidden="true">·</span>
            <span className={s.num}>#{card.num}</span>
          </span>
        )}
        {!(showTeam && card.team) && <span className={s.num}>#{card.num}</span>}
      </div>
      <span className={s.statusChip} aria-hidden="true">
        <StatusChipIcon status={status} />
        {STATUS_LABEL[status] || STATUS_LABEL.missing}
      </span>
    </button>
  )
}
