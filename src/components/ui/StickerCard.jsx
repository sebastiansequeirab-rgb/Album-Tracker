import StatusDot from './StatusDot'
import TypeChip from './TypeChip'
import s from './StickerCard.module.css'

const NEXT_STATUS = { missing: 'have', have: 'duplicate', duplicate: 'missing' }
const DOT_VARIANT = { have: 'have', duplicate: 'repeated', missing: 'missing' }

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
          </span>
        )}
        <span className={s.num}>#{card.num}</span>
      </div>
    </button>
  )
}
