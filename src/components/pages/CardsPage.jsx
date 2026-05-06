import { useMemo, useState } from 'react'
import StickerCard from '../ui/StickerCard'
import s from './CardsPage.module.css'

const STATUS_OPTS = [
  ['all',       'Todos los estados'],
  ['missing',   'Faltan'],
  ['have',      'Tengo'],
  ['duplicate', 'Repetidas'],
]
const STATUS_PILL = {
  missing:   'Faltan',
  have:      'Tengo',
  duplicate: 'Repetidas',
}
const LIMIT = 420

/* ── Inline SVGs (NO emojis except country flags from Flag/data) ─────── */

const IconSearch = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
)
const IconChevron = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IconCheckSquare = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const IconCheck = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconCycle = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconCross = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconClose = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/* Color hint per pill type — drives gold/conf-style left bar */
const PILL_COLOR = {
  st:   'var(--gold-3)',
  type: 'var(--type-jugador)',
  team: 'var(--type-plantel)',
  q:    'var(--gold-2)',
}

function slug(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function scrollToTeam(teamId) {
  const el = typeof document !== 'undefined' && document.getElementById(`team-${teamId}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function CardsPage({
  filtered,
  ALL_ITEMS,
  TM,
  q,     setQ,
  fSt,   setFSt,
  fType, setFType,
  fTeam, setFTeam,
  gs,
  toggle,
  bulkUpdate,
  stats,
}) {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }

  const visible = filtered.slice(0, LIMIT)
  const overflow = filtered.length > LIMIT

  // Agrupar por equipo (manteniendo orden de aparición). Cada grupo lleva un
  // teamId estable derivado del nombre — sirve para el ancla #team-XXX y el
  // scroll-spy del slidebar.
  const grouped = useMemo(() => {
    const map = new Map()
    for (const c of visible) {
      const key = c.team || 'Otros'
      if (!map.has(key)) {
        map.set(key, {
          teamName: key,
          teamId: slug(key),
          flag: c.flag || '🌐',
          conf: c.conf || null,
          cards: [],
          have: 0,
          dup: 0,
          total: 0,
        })
      }
      const g = map.get(key)
      g.cards.push(c)
      g.total++
      const st = gs(c.id)
      if (st === 'have') g.have++
      else if (st === 'duplicate') g.dup++
    }
    return [...map.values()]
  }, [visible, gs])

  const toggleSelected = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const applyBulk = (status) => {
    const ids = [...selected]
    if (ids.length === 0) return
    bulkUpdate(ids, status)
    exitSelectMode()
  }

  const teamOpts = useMemo(
    () => [...new Set(ALL_ITEMS.map(c => c.team))].sort(),
    [ALL_ITEMS]
  )

  const activePills = []
  if (fSt   !== 'all') activePills.push({ key: 'st',   label: STATUS_PILL[fSt],                          onRemove: () => setFSt('all') })
  if (fType !== 'all') activePills.push({ key: 'type', label: TM[fType]?.l || fType,                     onRemove: () => setFType('all') })
  if (fTeam !== 'all') activePills.push({ key: 'team', label: fTeam,                                     onRemove: () => setFTeam('all') })
  if (q)               activePills.push({ key: 'q',    label: `“${q}”`,                        onRemove: () => setQ('') })

  const bulkActive = selectMode && selected.size > 0

  return (
    <div className={`${s.page} ${bulkActive ? s.pageBulkActive : ''}`}>
      {/* ── Filter bar (sticky, broadcast field styling) ──────────────── */}
      <div className={s.filterBar}>
        <label className={s.search} aria-label="Buscar">
          <span className={s.searchIcon} aria-hidden="true"><IconSearch /></span>
          <input
            type="search"
            placeholder="Jugador, equipo o numero…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className={s.searchInput}
          />
        </label>

        <label className={s.field} aria-label="Estado">
          <span className={s.fieldLabel}>
            <span className={s.fieldNum}>01</span>
            <span className={s.fieldText}>ESTADO</span>
          </span>
          <span className={s.selectWrap}>
            <select value={fSt} onChange={e => setFSt(e.target.value)} className={s.select}>
              {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className={s.selectArrow} aria-hidden="true"><IconChevron /></span>
          </span>
        </label>

        <label className={s.field} aria-label="Tipo">
          <span className={s.fieldLabel}>
            <span className={s.fieldNum}>02</span>
            <span className={s.fieldText}>TIPO</span>
          </span>
          <span className={s.selectWrap}>
            <select value={fType} onChange={e => setFType(e.target.value)} className={s.select}>
              <option value="all">Todos los tipos</option>
              {Object.entries(TM).map(([t, m]) => (
                <option key={t} value={t}>{m.l}</option>
              ))}
            </select>
            <span className={s.selectArrow} aria-hidden="true"><IconChevron /></span>
          </span>
        </label>

        <label className={s.field} aria-label="Equipo">
          <span className={s.fieldLabel}>
            <span className={s.fieldNum}>03</span>
            <span className={s.fieldText}>EQUIPO</span>
          </span>
          <span className={s.selectWrap}>
            <select value={fTeam} onChange={e => setFTeam(e.target.value)} className={s.select}>
              <option value="all">Todos los equipos</option>
              {teamOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className={s.selectArrow} aria-hidden="true"><IconChevron /></span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true) }}
          className={`${s.selectBtn} ${selectMode ? s.selectBtnActive : ''}`}
          aria-pressed={selectMode}
        >
          {selectMode ? <IconCross /> : <IconCheckSquare />}
          <span>{selectMode ? 'CANCELAR' : 'SELECCION MULTIPLE'}</span>
        </button>
      </div>

      {/* ── Active filter pills (lower-third style) ────────────────────── */}
      {activePills.length > 0 && (
        <div className={s.activePills}>
          {activePills.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={p.onRemove}
              className={s.activePill}
              style={{ ['--pill-bar']: PILL_COLOR[p.key] || 'var(--gold-3)' }}
              aria-label={`Quitar filtro ${p.label}`}
            >
              <span className={s.activePillLabel}>{p.label}</span>
              <span className={s.activePillX} aria-hidden="true"><IconClose /></span>
            </button>
          ))}
        </div>
      )}

      {/* ── Section header + summary row ──────────────────────────────── */}
      <header className={s.summaryHead}>
        <h3 className={s.summaryTitle}>Resumen</h3>
        <span className={s.summaryRule} aria-hidden="true" />
        <span className={s.summaryDots}>
          <span className={`${s.dotPill} ${s.dotHave}`}>
            <span className={s.dotMark} aria-hidden="true" />
            {stats.have}
          </span>
          <span className={`${s.dotPill} ${s.dotDup}`}>
            <span className={s.dotMark} aria-hidden="true" />
            {stats.dup}
          </span>
          <span className={`${s.dotPill} ${s.dotMiss}`}>
            <span className={s.dotMark} aria-hidden="true" />
            {stats.miss}
          </span>
        </span>
      </header>

      <div className={s.summary}>
        <span className={s.summaryCount}>{filtered.length}</span>
        <span className={s.summaryUnit}>cartas</span>
        <span className={s.summaryHint}>
          {selectMode
            ? `· ${selected.size} seleccionada${selected.size !== 1 ? 's' : ''}`
            : '· toca para cambiar estado'}
        </span>
      </div>

      {/* ── Layout: cards + side index ─────────────────────────────────── */}
      <div className={s.contentLayout}>
        {/* Mobile: strip horizontal de equipos */}
        {grouped.length > 1 && (
          <nav className={s.teamStripMobile} aria-label="Saltar a equipo">
            {grouped.map(g => {
              const pct = g.total ? Math.round((g.have + g.dup) / g.total * 100) : 0
              return (
                <button
                  key={g.teamId}
                  type="button"
                  className={s.stripItem}
                  onClick={() => scrollToTeam(g.teamId)}
                  title={`${g.teamName} · ${pct}%`}
                >
                  <span className={s.stripFlag}>{g.flag}</span>
                  <span className={s.stripPct}>{pct}%</span>
                </button>
              )
            })}
          </nav>
        )}

        <div className={s.cardsArea}>
          {grouped.map(g => (
            <section key={g.teamId} className={s.teamGroup}>
              <header id={`team-${g.teamId}`} className={s.teamGroupHead}>
                <span className={s.teamGroupFlag} aria-hidden>{g.flag}</span>
                <span className={s.teamGroupName}>{g.teamName}</span>
                <span className={s.teamGroupRule} aria-hidden />
                <span className={s.teamGroupCount}>{g.have + g.dup}/{g.total}</span>
              </header>
              <div className={s.grid}>
                {g.cards.map(c => {
                  const status = gs(c.id)
                  const isSelected = selectMode && selected.has(c.id)
                  return (
                    <StickerCard
                      key={c.id}
                      card={c}
                      status={status}
                      selected={isSelected}
                      onToggle={() => {
                        if (selectMode) toggleSelected(c.id)
                        else toggle(c.id)
                      }}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Desktop: slidebar lateral */}
        {grouped.length > 1 && (
          <aside className={s.teamSidebar} aria-label="Índice de equipos">
            <div className={s.teamSidebarTitle}>EQUIPOS</div>
            <div className={s.teamSidebarList}>
              {grouped.map(g => {
                const pct = g.total ? Math.round((g.have + g.dup) / g.total * 100) : 0
                return (
                  <button
                    key={g.teamId}
                    type="button"
                    className={s.sidebarItem}
                    onClick={() => scrollToTeam(g.teamId)}
                  >
                    <span className={s.sidebarFlag}>{g.flag}</span>
                    <span className={s.sidebarName}>{g.teamName}</span>
                    <span className={s.sidebarBar}>
                      <span className={s.sidebarBarFill} style={{ width: `${pct}%` }} />
                    </span>
                    <span className={s.sidebarPct}>{pct}%</span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}
      </div>

      {overflow && (
        <div className={s.moreHint}>
          Mostrando {LIMIT} de {filtered.length} · usa filtros para refinar
        </div>
      )}

      {/* ── Bulk action bar (sticky bottom, chamfered) ────────────────── */}
      {bulkActive && (
        <div className={s.bulkBar} role="toolbar" aria-label="Acciones bulk">
          <span className={s.bulkCount}>
            <span className={s.bulkCountValue}>{selected.size}</span>
            <span className={s.bulkCountLabel}>{selected.size !== 1 ? 'CARTAS SELECCIONADAS' : 'CARTA SELECCIONADA'}</span>
          </span>
          <div className={s.bulkActions}>
            <button type="button" onClick={() => applyBulk('have')}      className={`${s.bulkBtn} ${s.bulkBtnHave}`}>
              <IconCheck />
              <span>TENGO</span>
            </button>
            <button type="button" onClick={() => applyBulk('missing')}   className={`${s.bulkBtn} ${s.bulkBtnMiss}`}>
              <IconCross />
              <span>FALTA</span>
            </button>
            <button type="button" onClick={() => applyBulk('duplicate')} className={`${s.bulkBtn} ${s.bulkBtnDup}`}>
              <IconCycle />
              <span>REPETIDA</span>
            </button>
          </div>
          <button type="button" onClick={exitSelectMode} className={s.bulkClose} aria-label="Cancelar seleccion">
            <IconClose />
          </button>
        </div>
      )}
    </div>
  )
}
