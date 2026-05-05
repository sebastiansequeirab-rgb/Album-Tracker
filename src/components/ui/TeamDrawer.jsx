import { useEffect, useMemo } from 'react'
import Flag from '../Flag'
import ConfBadge from './ConfBadge'
import ProgressBar from './ProgressBar'
import StickerCard from './StickerCard'
import s from './TeamDrawer.module.css'

const CONF_COLOR = {
  CONMEBOL: 'var(--conf-conmebol)',
  UEFA:     'var(--conf-uefa)',
  CONCACAF: 'var(--conf-concacaf)',
  CAF:      'var(--conf-caf)',
  AFC:      'var(--conf-afc)',
  OFC:      'var(--conf-ofc)',
}

export default function TeamDrawer({
  team,
  ALL_ITEMS,
  TM,
  gs,
  toggle,
  bulkUpdate,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const conf = String(team.conf || '').toUpperCase()
  const confColor = CONF_COLOR[conf] || 'var(--accent)'

  const cards = useMemo(
    () => ALL_ITEMS.filter(c => c.team === team.name),
    [ALL_ITEMS, team.name]
  )
  const have = cards.filter(c => gs(c.id) !== 'missing').length
  const pct = cards.length ? Math.round((have / cards.length) * 100) : 0
  const allHave = have === cards.length && cards.length > 0
  const allMissing = have === 0

  const byType = useMemo(() => {
    return Object.keys(TM)
      .map(type => ({ type, m: TM[type], cards: cards.filter(c => c.type === type) }))
      .filter(g => g.cards.length > 0)
  }, [cards, TM])

  const handleMarkAll = () => {
    if (typeof bulkUpdate !== 'function') return
    bulkUpdate(cards.map(c => c.id), 'have')
  }
  const handleClearAll = () => {
    if (typeof bulkUpdate !== 'function') return
    bulkUpdate(cards.map(c => c.id), 'missing')
  }

  return (
    <>
      <div className={s.backdrop} onClick={onClose} />
      <aside className={s.drawer} role="dialog" aria-modal="true" aria-label={`Detalle ${team.name}`}>
        <header className={s.head}>
          <button type="button" onClick={onClose} className={s.closeBtn} aria-label="Cerrar">
            ←
          </button>
          <div className={s.headFlag}>
            <Flag fifa={team.id} emoji={team.flag} size={56} alt={team.name} />
          </div>
          <div className={s.headInfo}>
            <h2 className={s.title}>{team.name}</h2>
            <div className={s.meta}>
              {conf && <ConfBadge confederation={conf} size="xs" />}
              <span className={s.frac}>{have}/{cards.length}</span>
              <span className={s.pct} style={{ color: confColor }}>{pct}%</span>
            </div>
            <ProgressBar pct={pct} color={confColor} height={6} className={s.bar} />
          </div>
        </header>

        {bulkUpdate && cards.length > 0 && (
          <div className={s.bulkRow}>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={allHave}
              className={`${s.bulkBtn} ${s.bulkBtnHave}`}
            >
              ✅ Marcar todas
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={allMissing}
              className={`${s.bulkBtn} ${s.bulkBtnClear}`}
            >
              ❌ Desmarcar todas
            </button>
          </div>
        )}

        <div className={s.body}>
          {byType.map(({ type, m, cards: list }) => {
            const h = list.filter(c => gs(c.id) !== 'missing').length
            return (
              <section key={type} className={s.typeGroup}>
                <header className={s.typeHead}>
                  <span className={s.typeLabel} style={{ color: m.c }}>
                    <span aria-hidden="true">{m.e}</span> {String(m.l).toUpperCase()}
                  </span>
                  <span className={s.typeCount}>({h}/{list.length})</span>
                </header>
                <div className={s.grid}>
                  {list.map(c => (
                    <StickerCard
                      key={c.id}
                      card={c}
                      status={gs(c.id)}
                      onToggle={() => toggle(c.id)}
                      showTeam={false}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </aside>
    </>
  )
}
