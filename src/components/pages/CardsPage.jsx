import { useMemo, useState } from 'react'
import StickerCard from '../ui/StickerCard'
import s from './CardsPage.module.css'

const STATUS_OPTS = [
  ['all',       'Todos los estados'],
  ['missing',   '❌ Faltan'],
  ['have',      '✅ Tengo'],
  ['duplicate', '🔄 Repetidas'],
]
const STATUS_PILL = {
  missing:   '❌ Faltan',
  have:      '✅ Tengo',
  duplicate: '🔄 Repetidas',
}
const LIMIT = 420

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
  if (fSt   !== 'all') activePills.push({ key: 'st',   label: STATUS_PILL[fSt],                                 onRemove: () => setFSt('all') })
  if (fType !== 'all') activePills.push({ key: 'type', label: `${TM[fType]?.e || ''} ${TM[fType]?.l || fType}`.trim(), onRemove: () => setFType('all') })
  if (fTeam !== 'all') activePills.push({ key: 'team', label: fTeam,                                            onRemove: () => setFTeam('all') })
  if (q)               activePills.push({ key: 'q',    label: `“${q}”`,                                         onRemove: () => setQ('') })

  return (
    <div className={s.page}>
      <div className={s.filterBar}>
        <input
          type="search"
          placeholder="🔍 Jugador, equipo o número…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className={s.search}
        />
        <select value={fSt} onChange={e => setFSt(e.target.value)} className={s.select}>
          {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={fType} onChange={e => setFType(e.target.value)} className={s.select}>
          <option value="all">Todos los tipos</option>
          {Object.entries(TM).map(([t, m]) => (
            <option key={t} value={t}>{m.e} {m.l}</option>
          ))}
        </select>
        <select value={fTeam} onChange={e => setFTeam(e.target.value)} className={s.select}>
          <option value="all">Todos los equipos</option>
          {teamOpts.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { if (selectMode) exitSelectMode(); else setSelectMode(true) }}
          className={`${s.selectBtn} ${selectMode ? s.selectBtnActive : ''}`}
          aria-pressed={selectMode}
        >
          {selectMode ? '✕ Cancelar' : '☐ Seleccionar varios'}
        </button>
      </div>

      {activePills.length > 0 && (
        <div className={s.activePills}>
          {activePills.map(p => (
            <button key={p.key} type="button" onClick={p.onRemove} className={s.activePill}>
              {p.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}

      <div className={s.summary}>
        <span className={s.summaryCount}>{filtered.length} cartas</span>
        <span className={s.summaryHint}>
          {selectMode
            ? `· ${selected.size} seleccionada${selected.size !== 1 ? 's' : ''}`
            : '· toca para cambiar estado'}
        </span>
        <span className={s.summaryBreak}>
          <span className={s.have}>✅ {stats.have}</span>
          <span className={s.miss}>❌ {stats.miss}</span>
          <span className={s.dup}>🔄 {stats.dup}</span>
        </span>
      </div>

      <div className={s.grid}>
        {visible.map(c => {
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

      {overflow && (
        <div className={s.moreHint}>
          Mostrando {LIMIT} de {filtered.length} · Usá filtros para refinar
        </div>
      )}

      {selectMode && selected.size > 0 && (
        <div className={s.bulkBar} role="toolbar" aria-label="Acciones bulk">
          <span className={s.bulkCount}>
            {selected.size} carta{selected.size !== 1 ? 's' : ''}
          </span>
          <div className={s.bulkActions}>
            <button type="button" onClick={() => applyBulk('have')}      className={`${s.bulkBtn} ${s.bulkBtnHave}`}>✅ Tengo</button>
            <button type="button" onClick={() => applyBulk('duplicate')} className={`${s.bulkBtn} ${s.bulkBtnDup}`}>🔄 Repetida</button>
            <button type="button" onClick={() => applyBulk('missing')}   className={`${s.bulkBtn} ${s.bulkBtnMiss}`}>❌ Falta</button>
          </div>
          <button type="button" onClick={exitSelectMode} className={s.bulkClose} aria-label="Cancelar selección">✕</button>
        </div>
      )}
    </div>
  )
}
