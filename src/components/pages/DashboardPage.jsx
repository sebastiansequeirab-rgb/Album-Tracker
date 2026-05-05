import { useMemo } from 'react'
import Flag from '../Flag'
import StatCard from '../ui/StatCard'
import ConfBadge from '../ui/ConfBadge'
import ProgressBar from '../ui/ProgressBar'
import TeamCard from '../ui/TeamCard'
import s from './DashboardPage.module.css'

const CONF_COLOR = {
  CONMEBOL: 'var(--conf-conmebol)',
  UEFA:     'var(--conf-uefa)',
  CONCACAF: 'var(--conf-concacaf)',
  CAF:      'var(--conf-caf)',
  AFC:      'var(--conf-afc)',
  OFC:      'var(--conf-ofc)',
}

export default function DashboardPage({
  cfg,
  stats,
  momStats,
  teamStats,
  ALL_ITEMS,
  TM,
  MOMENTUM,
  gs,
  toggle,
  setShowQuick,
  setTab,
  setSelTeam,
}) {
  const upcoming = useMemo(() => {
    return [...teamStats]
      .filter(t => t.pct > 0 && t.pct < 100)
      .sort((a, b) => (b.pct - a.pct) || (b.have - a.have))
      .slice(0, 8)
  }, [teamStats])

  const missing = useMemo(() => {
    return [...teamStats]
      .sort((a, b) => (b.tot - b.have) - (a.tot - a.have))
      .slice(0, 12)
  }, [teamStats])

  return (
    <div className={s.page}>
      <div className={s.statsGrid}>
        <StatCard icon="📦" label="Total"     value={cfg.mainCount} color="var(--conf-uefa)" />
        <StatCard icon="✅" label="Tengo"     value={stats.have}    color="var(--status-have)" />
        <StatCard icon="❌" label="Faltan"    value={stats.miss}    color="var(--status-missing)" />
        <StatCard icon="🔄" label="Repetidas" value={stats.dup}     color="var(--status-dup)" />
      </div>

      <button type="button" onClick={() => setShowQuick(true)} className={s.quickCta}>
        <div className={s.quickCtaCopy}>
          <div className={s.quickCtaTitle}>✏️ ACTUALIZACIÓN RÁPIDA</div>
          <div className={s.quickCtaSub}>Pegá varios números en bulk · Ej: "1, 3, 5-10"</div>
        </div>
        <div className={s.quickCtaArrow} aria-hidden="true">→</div>
      </button>

      <div className={s.cols}>
        <section className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>POR TIPO</h3>
          </header>
          <div className={s.rows}>
            {Object.entries(TM)
              .filter(([t]) => t !== 'Momentum')
              .map(([type, m]) => {
                const tc = ALL_ITEMS.filter(c => c.type === type)
                const h  = tc.filter(c => gs(c.id) !== 'missing').length
                const p  = tc.length ? Math.round(h / tc.length * 100) : 0
                return (
                  <div key={type} className={s.typeRow}>
                    <div className={s.typeRowHeader}>
                      <span className={s.typeRowLabel} style={{ color: m.c }}>
                        <span aria-hidden="true">{m.e}</span> {m.l}
                      </span>
                      <span className={s.typeRowCount}>{h}/{tc.length}</span>
                    </div>
                    <ProgressBar pct={p} color={m.c} height={5} />
                  </div>
                )
              })}
          </div>
        </section>

        <div className={s.colStack}>
          <section className={s.panel}>
            <header className={s.panelHead}>
              <h3 className={s.panelTitle}>🎯 PRÓXIMOS A COMPLETAR</h3>
              {upcoming.length > 0 && (
                <button type="button" onClick={() => setTab('teams')} className={s.panelLink}>
                  Ver todos →
                </button>
              )}
            </header>
            {upcoming.length === 0 ? (
              <div className={s.empty}>
                {teamStats.some(t => t.pct === 100)
                  ? '¡Todos completos! Empezá uno nuevo desde Equipos.'
                  : 'Marcá tus primeras cartas para ver acá los equipos más cerca de completar.'}
              </div>
            ) : (
              <div className={s.upcomingList}>
                {upcoming.map(t => {
                  const conf = String(t.conf || '').toUpperCase()
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setTab('teams'); setSelTeam(t.id) }}
                      className={s.upcomingRow}
                    >
                      <span className={s.upcomingFlag}>
                        <Flag fifa={t.id} emoji={t.flag} size={22} alt={t.name} />
                      </span>
                      <span className={s.upcomingName}>{t.name}</span>
                      {conf && <ConfBadge confederation={conf} size="xs" />}
                      <span className={s.upcomingBarWrap}>
                        <ProgressBar
                          pct={t.pct}
                          color={CONF_COLOR[conf] || 'var(--accent)'}
                          height={6}
                        />
                      </span>
                      <span className={s.upcomingFrac}>{t.have}/{t.tot}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {(cfg.showRare || cfg.showMomentum) && (
            <section className={`${s.panel} ${s.rarePanel}`}>
              {cfg.showRare && (
                <>
                  <div className={s.rareTitle}>🥇 RARAS / ULTRA RARAS</div>
                  {cfg.rareTypes.map(type => {
                    const tc = ALL_ITEMS.filter(c => c.type === type)
                    if (!tc.length) return null
                    const h = tc.filter(c => gs(c.id) !== 'missing').length
                    return (
                      <div key={type} className={s.rareRow}>
                        <span className={s.rareRowName}>
                          <span aria-hidden="true">{TM[type]?.e}</span> {TM[type]?.l}
                        </span>
                        <span className={`${s.rareRowValue} ${h === tc.length ? s.rareRowComplete : ''}`}>
                          {h}/{tc.length}
                        </span>
                      </div>
                    )
                  })}
                </>
              )}

              {cfg.showMomentum && (
                <div className={s.momentumWrap}>
                  <div className={s.momentumLabel}>💎 MOMENTUM</div>
                  {MOMENTUM.map((p, i) => {
                    const mc = ALL_ITEMS.find(c => c.id === `MOM-${i}`)
                    if (!mc) return null
                    const status = gs(mc.id)
                    const on = status !== 'missing'
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggle(mc.id)}
                        className={`${s.momentumRow} ${on ? s.momentumRowOn : ''}`}
                      >
                        <span aria-hidden="true">{p.flag}</span>
                        <span className={`${s.momentumName} ${on ? s.momentumNameOn : ''}`}>{p.name}</span>
                        <span
                          className={s.momentumDot}
                          style={{
                            background: status === 'have' ? '#A855F7'
                                       : status === 'duplicate' ? '#F59E0B'
                                       : '#4C1D95',
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <section className={s.missingTeamsSection}>
        <header className={s.sectionHead}>
          <h3 className={s.sectionTitle}>📌 EQUIPOS CON MÁS FALTANTES</h3>
          <button type="button" onClick={() => setTab('teams')} className={s.sectionLink}>
            Ver todos →
          </button>
        </header>
        <div className={s.missingTeamsGrid}>
          {missing.map(t => (
            <TeamCard
              key={t.id}
              team={{ ...t, confederation: t.conf }}
              have={t.have}
              total={t.tot}
              onClick={() => { setTab('teams'); setSelTeam(t.id) }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
