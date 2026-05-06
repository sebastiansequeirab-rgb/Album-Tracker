import { useMemo, useState } from 'react'
import TeamCard from '../ui/TeamCard'
import ConfBadge from '../ui/ConfBadge'
import TeamDrawer from '../ui/TeamDrawer'
import s from './TeamsPage.module.css'

const CONF_ORDER = ['CONMEBOL', 'UEFA', 'CONCACAF', 'CAF', 'AFC', 'OFC']

const CONF_COLOR = {
  CONMEBOL: 'var(--conf-conmebol)',
  UEFA:     'var(--conf-uefa)',
  CONCACAF: 'var(--conf-concacaf)',
  CAF:      'var(--conf-caf)',
  AFC:      'var(--conf-afc)',
  OFC:      'var(--conf-ofc)',
}

const IconSearch = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconChevron = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export default function TeamsPage({
  teamStats,
  ALL_ITEMS,
  TM,
  gs,
  toggle,
  bulkUpdate,
  selTeam,
  setSelTeam,
}) {
  const [q, setQ] = useState('')
  const [activeConf, setActiveConf] = useState('all')
  const [sort, setSort] = useState('alpha')

  const filtered = useMemo(() => {
    let list = teamStats
    if (activeConf !== 'all') {
      list = list.filter(t => String(t.conf || '').toUpperCase() === activeConf)
    }
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(lq))
    }
    return [...list].sort((a, b) => {
      if (sort === 'progress')  return b.pct - a.pct
      if (sort === 'remaining') return (b.tot - b.have) - (a.tot - a.have)
      return a.name.localeCompare(b.name)
    })
  }, [teamStats, activeConf, q, sort])

  const grouped = useMemo(() => {
    if (sort !== 'alpha' || activeConf !== 'all') return null
    const g = {}
    CONF_ORDER.forEach(c => { g[c] = [] })
    filtered.forEach(t => {
      const c = String(t.conf || '').toUpperCase()
      if (!g[c]) g[c] = []
      g[c].push(t)
    })
    return g
  }, [filtered, sort, activeConf])

  const team = selTeam ? teamStats.find(t => t.id === selTeam) : null

  return (
    <div className={s.page}>
      <div className={s.filterBar}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon} aria-hidden="true"><IconSearch /></span>
          <input
            type="search"
            placeholder="Busca un país…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className={s.search}
            aria-label="Busca un país"
          />
        </div>
        <div className={s.confPills} role="tablist" aria-label="Filtrar por confederación">
          <button
            type="button"
            role="tab"
            aria-selected={activeConf === 'all'}
            className={`${s.pill} ${activeConf === 'all' ? s.pillActiveAll : ''}`}
            onClick={() => setActiveConf('all')}
          >
            Todas
          </button>
          {CONF_ORDER.map(c => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={activeConf === c}
              style={{ '--pill-color': CONF_COLOR[c] }}
              className={`${s.pill} ${activeConf === c ? s.pillActive : ''}`}
              onClick={() => setActiveConf(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className={s.sortWrap}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className={s.sort}
            aria-label="Ordenar"
          >
            <option value="alpha">A → Z</option>
            <option value="progress">Más completos</option>
            <option value="remaining">Más faltantes</option>
          </select>
          <span className={s.sortChev} aria-hidden="true"><IconChevron /></span>
        </div>
      </div>

      {grouped ? (
        Object.entries(grouped).map(([conf, list], idx) =>
          list.length === 0 ? null : (
            <section key={conf} className={s.confGroup}>
              <header className={s.confGroupHead}>
                <span className={s.confGroupNum} style={{ color: CONF_COLOR[conf] }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <ConfBadge confederation={conf} />
                <span className={s.confGroupRule} aria-hidden="true" style={{ '--rule-color': CONF_COLOR[conf] }} />
                <span className={s.confGroupCount}>
                  {list.length} {list.length === 1 ? 'equipo' : 'equipos'}
                </span>
              </header>
              <div className={s.grid}>
                {list.map(t => (
                  <TeamCard
                    key={t.id}
                    team={{ ...t, confederation: t.conf }}
                    have={t.have}
                    total={t.tot}
                    onClick={() => setSelTeam(t.id)}
                  />
                ))}
              </div>
            </section>
          )
        )
      ) : (
        <div className={s.grid}>
          {filtered.map(t => (
            <TeamCard
              key={t.id}
              team={{ ...t, confederation: t.conf }}
              have={t.have}
              total={t.tot}
              onClick={() => setSelTeam(t.id)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className={s.empty}>No hay equipos que coincidan con tu búsqueda.</div>
      )}

      {team && (
        <TeamDrawer
          team={team}
          ALL_ITEMS={ALL_ITEMS}
          TM={TM}
          gs={gs}
          toggle={toggle}
          bulkUpdate={bulkUpdate}
          onClose={() => setSelTeam(null)}
        />
      )}
    </div>
  )
}
