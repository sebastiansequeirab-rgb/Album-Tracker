import { useEffect, useState } from 'react'
import s from './TypeDonut.module.css'

const R   = 80
const SW  = 22
const CX  = 112
const GAP = 3.5
const CIRC = 2 * Math.PI * R  // ≈ 502.65

export default function TypeDonut({ segments = [] }) {
  const grandTotal = segments.reduce((a, seg) => a + seg.total, 0)
  const grandHave  = segments.reduce((a, seg) => a + seg.have,  0)
  const grandPct   = grandTotal ? Math.round(grandHave / grandTotal * 100) : 0

  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 120)
    return () => clearTimeout(t)
  }, [])

  if (!grandTotal) return null

  // Build arc data sorted by total descending so big types get clean segments
  let offset = 0
  const arcs = segments.map((seg, i) => {
    const allocated = (seg.total / grandTotal) * CIRC
    const segLen    = Math.max(2, allocated - GAP)
    const haveLen   = seg.total ? (seg.have / seg.total) * segLen : 0
    const arc = { seg, i, allocated, segLen, haveLen, offset }
    offset += allocated
    return arc
  })

  return (
    <div className={s.wrap}>
      {/* ── SVG donut ───────────────────────────────────────────── */}
      <div className={s.chartWrap}>
        <svg
          className={s.svg}
          viewBox={`0 0 ${CX * 2} ${CX * 2}`}
          role="img"
          aria-label={`Colección ${grandPct}% completada (${grandHave}/${grandTotal})`}
        >
          <g transform={`rotate(-90 ${CX} ${CX})`}>
            {arcs.map(({ seg, i, segLen, haveLen, offset: off }) => (
              <g key={seg.name}>
                {/* Background arc — unfilled portion */}
                <circle
                  cx={CX} cy={CX} r={R}
                  fill="none"
                  strokeWidth={SW}
                  stroke={seg.color}
                  strokeOpacity={0.15}
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
                    filter: `drop-shadow(0 0 6px ${seg.color}88)`,
                  }}
                />
              </g>
            ))}
          </g>

          {/* Center text */}
          <text
            x={CX} y={CX - 10}
            textAnchor="middle"
            dominantBaseline="auto"
            className={s.centerPct}
          >
            {grandPct}%
          </text>
          <text
            x={CX} y={CX + 14}
            textAnchor="middle"
            dominantBaseline="auto"
            className={s.centerCount}
          >
            {grandHave} / {grandTotal}
          </text>
          <text
            x={CX} y={CX + 30}
            textAnchor="middle"
            dominantBaseline="auto"
            className={s.centerLabel}
          >
            CARTAS
          </text>
        </svg>
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className={s.legend} aria-hidden="true">
        {segments.map(seg => {
          const pct = seg.total ? Math.round(seg.have / seg.total * 100) : 0
          return (
            <div key={seg.name} className={s.legendItem}>
              <span className={s.legendSwatch} style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}88` }} />
              <span className={s.legendLabel}>{seg.label}</span>
              <span className={s.legendFrac} style={{ color: seg.color }}>
                {seg.have}<span className={s.legendSlash}>/</span>{seg.total}
              </span>
              <span className={s.legendBar}>
                <span
                  className={s.legendBarFill}
                  style={{
                    width: armed ? `${pct}%` : '0%',
                    background: seg.color,
                    transition: `width 1.1s cubic-bezier(0.16,1,0.3,1) ${segments.indexOf(seg) * 0.05}s`,
                    boxShadow: `0 0 6px ${seg.color}66`,
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
