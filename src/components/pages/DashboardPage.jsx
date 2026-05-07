import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Flag from '../Flag'
import ConfBadge from '../ui/ConfBadge'
import ProgressBar from '../ui/ProgressBar'
import TypeDonut from '../ui/TypeDonut'
import TeamCard from '../ui/TeamCard'
import s from './DashboardPage.module.css'

const IconArrow = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)
const IconHandshake = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M11 17l-5-5L8 9l3 3"/>
    <path d="M14 12l4-4 3 3-4 4"/>
    <path d="M11 17l3 3 4-4"/>
    <path d="M3 14l3-3"/>
  </svg>
)

const listVariants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
}

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
  setShowQuickTrade,
  setTab,
  setFTeam,
  setSelTeam,
  segments = [],
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

      {/* ── 00 Donut chart — type breakdown at a glance ───────────────────── */}
      {segments.length > 0 && (
        <motion.section
          className={s.donutSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <TypeDonut segments={segments} />
        </motion.section>
      )}

      {/* ── Registrar Movimiento ────────────────────────────────────────── */}
      {setShowQuickTrade && (
        <button type="button" onClick={() => setShowQuickTrade(true)} className={s.quickCta}>
          <span className={s.quickCtaIcon} aria-hidden="true"><IconHandshake /></span>
          <div className={s.quickCtaCopy}>
            <div className={s.quickCtaTitle}>Registrar Movimiento</div>
            <div className={s.quickCtaSub}>Anotá qué entró y qué salió en un cambio</div>
          </div>
          <div className={s.quickCtaArrow} aria-hidden="true"><IconArrow /></div>
        </button>
      )}

      {/* ── 01 Próximos a Completar ──────────────────────────────────────── */}
      <section className={s.panel}>
        <header className={s.panelHead}>
          <h3 className={s.panelTitle}>Próximos a Completar</h3>
          <span className={s.panelRule} aria-hidden="true" />
          {upcoming.length > 0 && (
            <button type="button" onClick={() => { setFTeam?.('all'); setTab('cards') }} className={s.panelLink}>
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
          <motion.div
            className={s.upcomingList}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {upcoming.map((t, i) => {
              const conf = String(t.conf || '').toUpperCase()
              const rank = String(i + 1).padStart(2, '0')
              return (
                <motion.button
                  key={t.id}
                  variants={itemVariants}
                  type="button"
                  onClick={() => { setFTeam?.(t.name); setTab('cards') }}
                  className={s.upcomingRow}
                >
                  <span className={s.upcomingRank}>{rank}</span>
                  <span className={s.upcomingFlag}>
                    <Flag fifa={t.id} emoji={t.flag} size={22} alt={t.name} />
                  </span>
                  <span className={s.upcomingName}>{t.name}</span>
                  {conf && <ConfBadge confederation={conf} size="xs" />}
                  <span className={s.upcomingBarWrap}>
                    <ProgressBar
                      pct={t.pct}
                      color={CONF_COLOR[conf] || 'var(--accent)'}
                      height={7}
                    />
                  </span>
                  <span className={s.upcomingFrac}>{t.have}/{t.tot}</span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </section>

      {/* ── Raras / Momentum (conditional) ──────────────────────────────── */}
      {(cfg.showRare || cfg.showMomentum) && (
        <section className={`${s.panel} ${s.rarePanel}`}>
          {cfg.showRare && (
            <>
              <div className={s.rareTitle}>
                <span className={s.rareTitleDot} aria-hidden="true" />
                Raras / Ultra Raras
              </div>
              {cfg.rareTypes.map(type => {
                const tc = ALL_ITEMS.filter(c => c.type === type)
                if (!tc.length) return null
                const h = tc.filter(c => gs(c.id) !== 'missing').length
                return (
                  <div key={type} className={s.rareRow}>
                    <span className={s.rareRowName}>
                      <span className={s.typeMarker} style={{ background: TM[type]?.c }} aria-hidden="true" />
                      {TM[type]?.l}
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
              <div className={s.momentumLabel}>
                <span className={s.momentumLabelDot} aria-hidden="true" />
                Momentum
              </div>
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

      {/* ── 02 Equipos con más Faltantes ─────────────────────────────────── */}
      <section className={s.missingTeamsSection}>
        <header className={s.sectionHead}>
          <h3 className={s.sectionTitle}>Equipos con más Faltantes</h3>
          <span className={s.sectionRule} aria-hidden="true" />
          <button type="button" onClick={() => { setFTeam?.('all'); setTab('cards') }} className={s.sectionLink}>
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
              onClick={() => { setFTeam?.(t.name); setTab('cards') }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
