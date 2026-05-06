import { useEffect, useState } from 'react'
import s from './TypeDonut.module.css'

const R    = 82
const SW   = 24
const CX   = 114    // R + SW/2 + ~8px padding
const GAP  = 3
const CIRC = 2 * Math.PI * R  // ≈ 515.22

export default function TypeDonut({ segments = [] }) {
  const grandTotal = segments.reduce((a, seg) => a + seg.total, 0)
  const grandHave  = segments.reduce((a, seg) => a + seg.have,  0)
  const grandPct   = grandTotal ? Math.round(grandHave / grandTotal * 100) : 0

  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!grandTotal) return null

  // Build arc offsets — start from top (−90° = already in viewBox rotation)
  let offset = 0
  const arcs = segments.map((seg, i) => {
    const allocated = (seg.total / grandTotal) * CIRC
    const segLen    = Math.max(3, allocated - GAP)
    const haveLen   = seg.total ? (seg.have / seg.total) * segLen : 0
    const arc = { seg, i, allocated, segLen, haveLen, offset }
    offset += allocated
    return arc
  })

  // Legend columns: 2 cols for 8+ types
  const legendCols = segments.length >= 8 ? '1fr 1fr' : '1fr'

  return (
    <div className={s.wrap}>
      {/* ── SVG donut ─────────────────────────────────────────── */}
      <div className={s.chartWrap}>
        <svg
          className={s.svg}
          viewBox={`0 0 ${CX * 2} ${CX * 2}`}
          role="img"
          aria-label={`Colección ${grandPct}% completada — ${grandHave} de ${grandTotal} cartas`}
        >
          {/* Outer glow ring — atmosphere behind all arcs */}
          <circle
            cx={CX} cy={CX} r={R}
            fill="none"
            strokeWidth={SW + 8}
            stroke="rgba(245,200,70,0.04)"
          />

          <g transform={`rotate(-90 ${CX} ${CX})`}>
            {arcs.map(({ seg, i, segLen, haveLen, offset: off }) => (
              <g key={seg.name}>
                {/* Background arc — empty/unfilled portion */}
                <circle
                  cx={CX} cy={CX} r={R}
                  fill="none"
                  strokeWidth={SW}
                  stroke={seg.color}
                  strokeOpacity={0.18}
                  strokeDasharray={`${segLen} ${CIRC - segLen}`}
                  strokeDashoffset={-off}
                  strokeLinecap="butt"
                />
                {/* Fill arc — animated have portion */}
                <circle
                  cx={CX} cy={CX} r={R}
                  fill="none"
                  strokeWidth={SW}
                  stroke={seg.color}
                  strokeDasharray={`${armed ? haveLen : 0} ${CIRC - haveLen}`}
                  strokeDashoffset={-off}
                  strokeLinecap="butt"
                  style={{
                    transition: `stroke-dasharray 1.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s`,
                    filter: `drop-shadow(0 0 8px ${seg.color}) drop-shadow(0 0 2px ${seg.color})`,
                  }}
                />
              </g>
            ))}
          </g>

          {/* Subtle inner border ring */}
          <circle
            cx={CX} cy={CX} r={R - SW / 2 - 1}
            fill="none"
            strokeWidth={1}
            stroke="rgba(245,200,70,0.08)"
          />

          {/* Center text */}
          <text x={CX} y={CX - 12} textAnchor="middle" dominantBaseline="middle" className={s.centerPct}>
            {grandPct}%
          </text>
          <text x={CX} y={CX + 14} textAnchor="middle" dominantBaseline="middle" className={s.centerCount}>
            {grandHave.toLocaleString('es')} / {grandTotal.toLocaleString('es')}
          </text>
          <text x={CX} y={CX + 32} textAnchor="middle" dominantBaseline="middle" className={s.centerLabel}>
            CARTAS
          </text>
        </svg>
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className={s.legend} style={{ gridTemplateColumns: legendCols }} aria-hidden="true">
        {segments.map((seg, i) => {
          const pct = seg.total ? Math.round(seg.have / seg.total * 100) : 0
          return (
            <div key={seg.name} className={s.legendItem}>
              <span className={s.legendSwatch} style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}` }} />
              <span className={s.legendLabel}>{seg.label}</span>
              <span className={s.legendFrac} style={{ color: seg.color }}>
                {seg.have}<span className={s.legendSlash}>/</span>{seg.total}
              </span>
              <span className={s.legendBar}>
                <span
                  className={s.legendBarFill}
                  style={{
                    width: armed ? `${pct}%` : '0%',
                    background: `linear-gradient(90deg, ${seg.color}cc 0%, ${seg.color} 100%)`,
                    transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 0.07}s`,
                    boxShadow: pct > 0 ? `0 0 10px ${seg.color}, 0 0 4px ${seg.color}aa inset` : 'none',
                  }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
