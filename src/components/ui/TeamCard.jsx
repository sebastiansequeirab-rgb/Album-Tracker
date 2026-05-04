import Flag from '../Flag'
import ConfBadge from './ConfBadge'
import ProgressBar from './ProgressBar'
import s from './TeamCard.module.css'

const CONF_COLOR = {
  CONMEBOL: 'var(--conf-conmebol)',
  UEFA:     'var(--conf-uefa)',
  CONCACAF: 'var(--conf-concacaf)',
  CAF:      'var(--conf-caf)',
  AFC:      'var(--conf-afc)',
  OFC:      'var(--conf-ofc)',
}

export default function TeamCard({
  team,
  have = 0,
  total = 20,
  onClick,
  className = '',
}) {
  if (!team) return null
  const conf = String(team.confederation || '').toUpperCase()
  const confColor = CONF_COLOR[conf] || 'var(--text-muted)'
  const pct = total > 0 ? Math.round((have / total) * 100) : 0
  const complete = have >= total && total > 0
  const empty = have === 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${s.card} ${complete ? s.complete : ''} ${empty ? s.empty : ''} ${className}`}
      style={{ '--conf-color': confColor }}
      aria-label={`${team.name}: ${have} de ${total} cartas`}
    >
      <div className={s.flagWrap}>
        <Flag emoji={team.flag} fifa={team.fifa} size={40} />
      </div>
      <div className={s.name}>{team.name}</div>
      {conf && <ConfBadge confederation={conf} size="xs" />}
      <div className={s.frac}>{have}/{total}</div>
      <ProgressBar pct={pct} color={confColor} height={6} className={s.bar} />
      {complete && <div className={s.completeBadge} aria-hidden="true">🏆</div>}
    </button>
  )
}
