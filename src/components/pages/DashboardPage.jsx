import { motion } from 'framer-motion'
import TypeDonut from '../ui/TypeDonut'
import CountryProgressMap from '../ui/CountryProgressMap'
import { ALBUM_STICKER } from '../../data'
import { STICKER_TEAMS } from '../../data/teams'
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
  albumType,
  col,
  segments = [],
}) {

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

      {/* ── Mapa de la Colección (solo Stickers — 48 países × 20) ────────── */}
      {albumType === ALBUM_STICKER && (
        <CountryProgressMap
          teams={STICKER_TEAMS}
          col={col}
          onCountrySelect={(teamName) => {
            setFTeam?.([teamName])
            setTab?.('cards')
          }}
        />
      )}

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

    </div>
  )
}
