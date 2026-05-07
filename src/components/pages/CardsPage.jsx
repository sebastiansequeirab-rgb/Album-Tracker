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
  gx,
  toggle,
  bulkUpdate,
  stats,
}) {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [showFlagFilters, setShowFlagFilters] = useState(false)

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

  // Stats por equipo sobre TODA la colección (no solo lo visible) — sirve
  // para la fila de banderitas-filtro siempre con info estable.
  const teamFilterStats = useMemo(() => {
    const map = new Map()
    for (const c of ALL_ITEMS) {
      if (!c.team) continue
      const key = c.team
      if (!map.has(key)) {
        map.set(key, { teamName: key, flag: c.flag || '🌐', total: 0, have: 0 })
      }
      const t = map.get(key)
      t.total++
      const st = gs(c.id)
      if (st === 'have' || st === 'duplicate') t.have++
    }
    // Orden estable: el que aparece primero en ALL_ITEMS (sigue el orden del álbum)
    return [...map.values()]
  }, [ALL_ITEMS, gs])

  const activePills = []
  if (fSt !== 'all') activePills.push({ key: 'st', label: STATUS_PILL[fSt], onRemove: () => setFSt('all') })
  // Una pill por país — el user las puede quitar individualmente.
  if (Array.isArray(fTeam)) {
    fTeam.forEach((teamName) => {
      activePills.push({
        key: `team-${teamName}`,
        label: teamName,
        onRemove: () => setFTeam(fTeam.filter(t => t !== teamName)),
      })
    })
  }
  if (q) activePills.push({ key: 'q', label: `“${q}”`, onRemove: () => setQ('') })

  const bulkActive = selectMode && selected.size > 0

  return (
    <div className={`${s.page} ${bulkActive ? s.pageBulkActive : ''}`}>
      {/* ── Filter bar: search + bulk toggle ──────────────────────────── */}
      <div className={s.filterBar}>
        <label className={s.search} aria-label="Buscar">
          <span className={s.searchIcon} aria-hidden="true"><IconSearch /></span>
          <input
            type="search"
            placeholder="Buscá jugador, equipo o número…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className={s.searchInput}
          />
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

      {/* ── Status pills (clickables = filtro de estado) ──────────────── */}
      <div className={s.statusPills} role="tablist" aria-label="Filtrar por estado">
        <button
          type="button"
          role="tab"
          aria-pressed={fSt === 'all'}
          onClick={() => setFSt('all')}
          className={`${s.statusPill} ${s.statusPillAll} ${fSt === 'all' ? s.statusPillActive : ''}`}
        >
          <span>Todas</span>
          <span className={s.statusPillCount}>{stats.have + stats.dup + stats.miss}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={fSt === 'have'}
          onClick={() => setFSt(fSt === 'have' ? 'all' : 'have')}
          className={`${s.statusPill} ${s.statusPillHave} ${fSt === 'have' ? s.statusPillActive : ''}`}
        >
          <span className={s.statusPillDot} aria-hidden />
          <span>Tengo</span>
          <span className={s.statusPillCount}>{stats.have}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={fSt === 'duplicate'}
          onClick={() => setFSt(fSt === 'duplicate' ? 'all' : 'duplicate')}
          className={`${s.statusPill} ${s.statusPillDup} ${fSt === 'duplicate' ? s.statusPillActive : ''}`}
        >
          <span className={s.statusPillDot} aria-hidden />
          <span>Repetidas</span>
          <span className={s.statusPillCount}>{stats.dup}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={fSt === 'missing'}
          onClick={() => setFSt(fSt === 'missing' ? 'all' : 'missing')}
          className={`${s.statusPill} ${s.statusPillMiss} ${fSt === 'missing' ? s.statusPillActive : ''}`}
        >
          <span className={s.statusPillDot} aria-hidden />
          <span>Faltan</span>
          <span className={s.statusPillCount}>{stats.miss}</span>
        </button>
      </div>

      {/* ── Flag filters bar (collapsible) — multi-select ──────────────── */}
      <div className={s.flagBar}>
        <button
          type="button"
          onClick={() => setShowFlagFilters(v => !v)}
          className={`${s.flagBarToggle} ${fTeam.length > 0 ? s.flagBarToggleActive : ''}`}
          aria-expanded={showFlagFilters}
        >
          <span className={s.flagBarIcon} aria-hidden>🏁</span>
          <span className={s.flagBarLabel}>
            {fTeam.length === 0
              ? 'Filtrar por país'
              : fTeam.length === 1
                ? `Filtrando por ${fTeam[0]}`
                : `Filtrando ${fTeam.length} países`}
          </span>
          {fTeam.length > 0 && (
            <span
              className={s.flagBarChip}
              onClick={(e) => { e.stopPropagation(); setFTeam([]) }}
              role="button"
              aria-label="Quitar filtro de países"
            >
              <IconCross /> limpiar
            </span>
          )}
          <span className={`${s.flagBarChevron} ${showFlagFilters ? s.flagBarChevronOpen : ''}`} aria-hidden>
            <IconChevron />
          </span>
        </button>

        {showFlagFilters && (
          <div className={s.flagFilters} role="tablist" aria-label="Filtrar por equipo (multi)">
            {teamFilterStats.map(t => {
              const pct = t.total ? Math.round(t.have / t.total * 100) : 0
              const active = fTeam.includes(t.teamName)
              const dim = !active && fTeam.length > 0
              return (
                <button
                  key={t.teamName}
                  type="button"
                  role="tab"
                  aria-pressed={active}
                  onClick={() => {
                    setFTeam(active
                      ? fTeam.filter(x => x !== t.teamName)
                      : [...fTeam, t.teamName])
                  }}
                  className={`${s.flagChip} ${active ? s.flagChipActive : ''} ${dim ? s.flagChipDim : ''}`}
                  title={`${t.teamName} · ${pct}% (${t.have}/${t.total})`}
                >
                  <span className={s.flagChipIcon} aria-hidden>{t.flag}</span>
                  <span className={s.flagChipPct}>{pct}%</span>
                  <span className={s.flagChipBar} aria-hidden>
                    <span className={s.flagChipBarFill} style={{ width: `${pct}%` }} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
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
              style={{
                ['--pill-bar']:
                  PILL_COLOR[p.key]
                  || (p.key.startsWith('team-') ? PILL_COLOR.team : 'var(--gold-3)'),
              }}
              aria-label={`Quitar filtro ${p.label}`}
            >
              <span className={s.activePillLabel}>{p.label}</span>
              <span className={s.activePillX} aria-hidden="true"><IconClose /></span>
            </button>
          ))}
        </div>
      )}

      {/* ── Stats bar: count + hint ───────────────────────────────────── */}
      <div className={s.summary}>
        <span className={s.summaryCount}>{filtered.length}</span>
        <span className={s.summaryUnit}>de {stats.have + stats.dup + stats.miss}</span>
        <span className={s.summaryHint}>
          {selectMode
            ? `· ${selected.size} seleccionada${selected.size !== 1 ? 's' : ''}`
            : '· toca para cambiar estado'}
        </span>
      </div>

      {/* ── Layout: cards + side index ─────────────────────────────────── */}
      <div className={s.contentLayout}>
        <div className={s.cardsArea}>
          {grouped.map(g => {
            const pct = g.total ? Math.round((g.have + g.dup) / g.total * 100) : 0
            return (
              <section key={g.teamId} className={s.teamGroup}>
                <header id={`team-${g.teamId}`} className={s.teamGroupHead}>
                  <span className={s.teamGroupTag} aria-hidden>EQUIPO</span>
                  <span className={s.teamGroupFlag} aria-hidden>{g.flag}</span>
                  <span className={s.teamGroupName}>{g.teamName}</span>
                  <span className={s.teamGroupBar} aria-hidden>
                    <span className={s.teamGroupBarFill} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={s.teamGroupCount}>
                    <strong>{g.have + g.dup}</strong>
                    <span className={s.teamGroupCountSep}>/</span>
                    {g.total}
                  </span>
                </header>
                <div className={s.grid}>
                  {g.cards.map(c => {
                    const status = gs(c.id)
                    const extra = gx ? gx(c.id) : 0
                    const isSelected = selectMode && selected.has(c.id)
                    return (
                      <StickerCard
                        key={c.id}
                        card={c}
                        status={status}
                        extra={extra}
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
            )
          })}
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
