import { useEffect, useState } from 'react'
import s from './SegmentedProgress.module.css'

/**
 * Segmented progress bar — barra de progreso "broadcast scoreboard".
 * Cada segmento ocupa un % del ancho proporcional a (type.total / grand.total)
 * y se rellena con un % proporcional a (type.have / type.total).
 * La suma visual de los fills equivale al progreso global.
 *
 * props:
 *   segments: [{ name, label, color, total, have }]
 *   animateOnMount: bool (default true) — fills crecen desde 0 al montar, staggered
 */
export default function SegmentedProgress({ segments = [], animateOnMount = true, tall = false }) {
  const grandTotal = segments.reduce((acc, seg) => acc + (seg.total || 0), 0)
  const grandHave  = segments.reduce((acc, seg) => acc + (seg.have  || 0), 0)
  const grandPct   = grandTotal ? (grandHave / grandTotal) * 100 : 0

  const [armed, setArmed] = useState(!animateOnMount)
  useEffect(() => {
    if (!animateOnMount) return
    const t = setTimeout(() => setArmed(true), 80)
    return () => clearTimeout(t)
  }, [animateOnMount])

  if (!grandTotal) return null

  return (
    <div
      className={`${s.wrap}${tall ? ` ${s.wrapTall}` : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(grandPct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progreso ${Math.round(grandPct)}% (${grandHave}/${grandTotal})`}
    >
      <div className={s.track}>
        {segments.map((seg, i) => {
          const widthPct = (seg.total / grandTotal) * 100
          const targetFill = seg.total ? (seg.have / seg.total) * 100 : 0
          const fillPct = armed ? targetFill : 0
          return (
            <div
              key={seg.name}
              className={s.segment}
              style={{ width: `${widthPct}%`, '--seg-color': seg.color }}
              data-label={seg.label}
            >
              <div
                className={s.fill}
                style={{
                  width: `${fillPct}%`,
                  transitionDelay: `${i * 0.09}s`,
                }}
              >
                <span className={s.fillEdge} aria-hidden="true" />
              </div>
              <div className={s.tooltip} role="tooltip">
                <span className={s.ttLabel}>{String(seg.label).toUpperCase()}</span>
                <span className={s.ttFrac}>
                  {seg.have}<span className={s.ttFracDiv}>/</span>{seg.total}
                </span>
                <span className={s.ttPct}>{Math.round(targetFill)}%</span>
              </div>
            </div>
          )
        })}
        <span className={s.shimmer} aria-hidden="true" />
        <span className={s.scanline} aria-hidden="true" />
      </div>

      {/* Legend — colored swatch + type name */}
      <div className={s.legend} aria-hidden="true">
        {segments.map(seg => (
          <span key={seg.name} className={s.legendItem} style={{ '--seg-color': seg.color }}>
            <span className={s.legendSwatch} />
            <span className={s.legendLabel}>{seg.label}</span>
            <span className={s.legendFrac}>{seg.have}/{seg.total}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
