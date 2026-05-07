import { useMemo, useState, useEffect } from 'react'
import s from './CountryProgressMap.module.css'

const RING_R = 22
const RING_CIRC = 2 * Math.PI * RING_R // ≈ 138.23

/* Calcula progreso por equipo: cuenta cards no-missing de ese team. */
function teamProgress(team, col) {
  // 20 stickers por equipo: <id>-C, <id>-P01..P11, <id>-G, <id>-P12..P18
  const ids = [
    `${team.id}-C`,
    ...Array.from({ length: 11 }, (_, i) => `${team.id}-P${String(i + 1).padStart(2, '0')}`),
    `${team.id}-G`,
    ...Array.from({ length: 7 }, (_, i) => `${team.id}-P${String(i + 12).padStart(2, '0')}`),
  ]
  const have = ids.filter(id => col[id] && col[id] !== 'missing').length
  return { have, total: 20 }
}

export default function CountryProgressMap({ teams = [], col = {}, onCountrySelect }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 80)
    return () => clearTimeout(t)
  }, [])

  const rows = useMemo(() => {
    return teams.map(team => {
      const { have, total } = teamProgress(team, col)
      const pct = total ? have / total : 0
      return { team, have, total, pct }
    })
  }, [teams, col])

  const completed = rows.filter(r => r.have === r.total).length

  return (
    <section className={s.wrap}>
      <header className={s.head}>
        <h3 className={s.title}>
          <span className={s.titleEmoji} aria-hidden="true">🗺️</span>
          MAPA DE LA COLECCIÓN
        </h3>
        <span className={s.count}>
          {completed}<span className={s.countSep}>/</span>{teams.length} <span className={s.countLabel}>completos</span>
        </span>
      </header>

      <div className={s.grid}>
        {rows.map((r, i) => {
          const haveLen = armed ? RING_CIRC * r.pct : 0
          const isComplete = r.have === r.total
          const isEmpty = r.have === 0
          const ringColor = isComplete
            ? '#22C55E'
            : isEmpty
              ? '#1E293B'
              : 'url(#ringGradient)'
          return (
            <button
              key={r.team.id}
              type="button"
              onClick={() => onCountrySelect?.(r.team.name)}
              className={`${s.cell} ${isComplete ? s.cellComplete : ''} ${isEmpty ? s.cellEmpty : ''}`}
              aria-label={`${r.team.name}: ${r.have} de ${r.total} stickers`}
            >
              <span className={s.ringWrap}>
                <svg viewBox="0 0 56 56" className={s.svg} aria-hidden="true">
                  <defs>
                    <linearGradient id="ringGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#FFE9A8" />
                      <stop offset="1" stopColor="#E6A817" />
                    </linearGradient>
                  </defs>
                  {/* Track */}
                  <circle
                    cx="28" cy="28" r={RING_R}
                    fill="none"
                    strokeWidth="3"
                    stroke="rgba(245, 200, 70, 0.10)"
                  />
                  {/* Progress arc — empieza desde top (-90°) */}
                  <circle
                    cx="28" cy="28" r={RING_R}
                    fill="none"
                    strokeWidth="3"
                    stroke={ringColor}
                    strokeLinecap="round"
                    strokeDasharray={`${haveLen} ${RING_CIRC - haveLen}`}
                    strokeDashoffset={RING_CIRC * 0.25}
                    transform="rotate(-90 28 28)"
                    style={{
                      transition: `stroke-dasharray 800ms cubic-bezier(0.16,1,0.3,1) ${i * 35}ms`,
                      filter: isComplete ? 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' : undefined,
                    }}
                  />
                </svg>
                <span className={s.flag} aria-hidden="true">{r.team.flag}</span>
                {isComplete && <span className={s.check} aria-hidden="true">✓</span>}
              </span>
              <span className={s.code}>{r.team.id}</span>
              <span className={s.frac}>
                {r.have}<span className={s.fracSlash}>/</span>{r.total}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
