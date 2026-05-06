import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ALBUM_CONFIG, ALBUM_STICKER } from '../data'

const SPECIAL_TYPES = new Set(['Intro', 'FIFA Museum'])

export default function PublicProfile() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', profile: null, col: {} })
  const [showFaltantes, setShowFaltantes] = useState(false)
  const [showRepetidas, setShowRepetidas] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: profile, error: pErr } = await supabase
          .from('adrenalyn_profiles')
          .select('user_id, display_name, avatar_emoji, contact, marketplace_visible, trades_completed, slug')
          .eq('slug', slug)
          .maybeSingle()
        if (pErr) throw pErr
        if (!profile || !profile.marketplace_visible) {
          if (!cancelled) setState({ status: 'not_found', profile: null, col: {} })
          return
        }

        const cfg = ALBUM_CONFIG[ALBUM_STICKER]
        const { data } = await supabase
          .from(cfg.table)
          .select('data')
          .eq('user_id', profile.user_id)
          .maybeSingle()
        const col = data?.data || {}

        if (!cancelled) setState({ status: 'ready', profile, col })
      } catch (err) {
        console.warn('PublicProfile load failed:', err)
        if (!cancelled) setState({ status: 'error', profile: null, col: {} })
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const items = useMemo(() => {
    const cfg = ALBUM_CONFIG[ALBUM_STICKER]
    return cfg.buildItems()
  }, [])

  const stats = useMemo(() => computeStats(items, state.col), [items, state.col])

  if (state.status === 'loading') return <Splash text="CARGANDO..." />
  if (state.status === 'not_found') return <Splash text="ESTE PERFIL NO ES PÚBLICO" />
  if (state.status === 'error') return <Splash text="ERROR AL CARGAR" />

  const { profile } = state
  const total = items.length
  const have = stats.totalHave
  const pct = total ? Math.round(have / total * 100) : 0

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* ── HERO ───────────────────────────────────────────────── */}
        <header style={heroStyle}>
          <div style={{ fontSize: 64, lineHeight: 1 }}>{profile.avatar_emoji || '⚽'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={heroNameStyle}>{profile.display_name || 'Coleccionista'}</div>
            <div style={heroSubStyle}>
              ÁLBUM PANINI WC 2026
              {profile.trades_completed > 0 && ` · ${profile.trades_completed} trades`}
            </div>
          </div>
          <div style={progressCircle(pct)}>
            <div style={pctNum}>{pct}%</div>
            <div style={pctLbl}>{have}/{total}</div>
          </div>
        </header>

        {/* ── PROGRESO POR PAÍS ──────────────────────────────────── */}
        <section style={sectionStyle}>
          <h2 style={sectionTitle}>Progreso por país</h2>
          <div style={{ display: 'grid', gap: 6 }}>
            {stats.byTeam.map(t => (
              <TeamRow key={t.teamName} team={t} />
            ))}
          </div>
        </section>

        {/* ── ESPECIALES (Intro + Museum) ────────────────────────── */}
        {stats.specials.total > 0 && (
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Especiales</h2>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
              Cubierta, mascota, balón, ciudades sede, trofeo, museo histórico.
            </div>
            <ProgressBarLine
              have={stats.specials.have}
              total={stats.specials.total}
              color="#F5C842"
            />
          </section>
        )}

        {/* ── DESPLEGABLE: FALTANTES ─────────────────────────────── */}
        <Disclosure
          title="Le faltan"
          count={stats.missingItems.length}
          open={showFaltantes}
          onToggle={() => setShowFaltantes(v => !v)}
        >
          <CardListGroupedByTeam items={stats.missingItems} tone="missing" />
        </Disclosure>

        {/* ── DESPLEGABLE: REPETIDAS ─────────────────────────────── */}
        <Disclosure
          title="Tiene repetidas"
          count={stats.duplicateItems.length}
          open={showRepetidas}
          onToggle={() => setShowRepetidas(v => !v)}
        >
          <CardListGroupedByTeam items={stats.duplicateItems} tone="dup" />
        </Disclosure>

        <footer style={footerStyle}>
          <Link to="/" style={ctaStyle}>HACER TRADE — ABRIR APP</Link>
        </footer>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */

function computeStats(items, col) {
  const byTeamMap = new Map()
  let specialHave = 0
  let specialTotal = 0
  let totalHave = 0
  const missingItems = []
  const duplicateItems = []

  for (const it of items) {
    const status = col[it.id] || 'missing'
    if (status === 'have' || status === 'duplicate') totalHave++
    if (status === 'missing') missingItems.push(it)
    if (status === 'duplicate') duplicateItems.push(it)

    if (SPECIAL_TYPES.has(it.type)) {
      specialTotal++
      if (status !== 'missing') specialHave++
      continue
    }
    const key = it.team || 'Otros'
    if (!byTeamMap.has(key)) {
      byTeamMap.set(key, { teamName: key, flag: it.flag || '🌐', conf: it.conf || null, total: 0, have: 0 })
    }
    const t = byTeamMap.get(key)
    t.total++
    if (status !== 'missing') t.have++
  }

  const byTeam = [...byTeamMap.values()].sort((a, b) => {
    const aPct = a.total ? a.have / a.total : 0
    const bPct = b.total ? b.have / b.total : 0
    return bPct - aPct
  })

  return {
    byTeam,
    specials: { have: specialHave, total: specialTotal },
    totalHave,
    missingItems,
    duplicateItems,
  }
}

function TeamRow({ team }) {
  const pct = team.total ? Math.round(team.have / team.total * 100) : 0
  return (
    <div style={teamRowStyle}>
      <span style={{ fontSize: 18, lineHeight: 1, width: 22 }}>{team.flag}</span>
      <span style={{
        flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#fff',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{team.teamName}</span>
      <ProgressBarLine have={team.have} total={team.total} color={pct === 100 ? '#22C55E' : '#F5C842'} compact />
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: '#FCD34D',
        letterSpacing: '0.04em', minWidth: 48, textAlign: 'right',
      }}>{team.have}/{team.total}</span>
    </div>
  )
}

function ProgressBarLine({ have, total, color = '#F5C842', compact = false }) {
  const pct = total ? (have / total) * 100 : 0
  return (
    <div style={{
      flex: compact ? 1 : 'unset', minWidth: compact ? 80 : 0,
      maxWidth: compact ? 200 : '100%',
      height: compact ? 6 : 10,
      background: 'rgba(245, 200, 70, 0.10)',
      borderRadius: 4, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        borderRadius: 4,
        boxShadow: pct > 0 ? `0 0 6px ${color}aa` : 'none',
      }} />
    </div>
  )
}

function Disclosure({ title, count, open, onToggle, children }) {
  return (
    <section style={{ ...sectionStyle, padding: 0, border: 0 }}>
      <button onClick={onToggle} style={disclosureBtn} type="button">
        <span style={disclosureCaret}>{open ? '▾' : '▸'}</span>
        <span style={{ ...sectionTitle, margin: 0, color: '#fff' }}>{title}</span>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif", color: '#FCD34D',
          letterSpacing: '0.06em', marginLeft: 'auto', fontSize: 16,
        }}>{count}</span>
      </button>
      {open && <div style={{ padding: '8px 0 14px', borderTop: '1px solid #1f2540' }}>{children}</div>}
    </section>
  )
}

function CardListGroupedByTeam({ items, tone }) {
  const grouped = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      const key = it.team || 'Otros'
      if (!map.has(key)) map.set(key, { teamName: key, flag: it.flag || '🌐', cards: [] })
      map.get(key).cards.push(it)
    }
    return [...map.values()]
  }, [items])

  if (items.length === 0) {
    return <div style={{ color: '#888', fontSize: 13, padding: 8 }}>Nada por acá.</div>
  }

  const accent = tone === 'dup' ? '#F59E0B' : '#94a3b8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {grouped.map(g => (
        <div key={g.teamName}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
            color: '#fff', letterSpacing: '0.10em', marginBottom: 4,
            paddingBottom: 3, borderBottom: '1px dashed rgba(255,255,255,0.08)',
          }}>
            <span>{g.flag}</span>
            <span>{g.teamName}</span>
            <span style={{ marginLeft: 'auto', color: '#FCD34D', fontSize: 12 }}>{g.cards.length}</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 4, fontSize: 11, color: '#cbd5e1',
          }}>
            {g.cards.map(c => (
              <span key={c.id} style={{
                padding: '4px 7px', background: 'rgba(0,0,0,0.35)',
                borderLeft: `2px solid ${accent}`, borderRadius: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{ color: '#FCD34D', fontFamily: "'Bebas Neue'", marginRight: 4 }}>#{c.num}</span>
                {c.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */

const pageStyle = {
  minHeight: '100dvh',
  background: '#06080F',
  color: '#fff',
  padding: '20px 14px',
  fontFamily: "'DM Sans', sans-serif",
}
const cardStyle = {
  maxWidth: 760,
  margin: '0 auto',
  background: '#0d111c',
  border: '1px solid #1f2540',
  borderRadius: 12,
  padding: '20px 18px',
}
const heroStyle = {
  display: 'flex', alignItems: 'center', gap: 14,
  paddingBottom: 16, borderBottom: '1px solid #1f2540', marginBottom: 14,
}
const heroNameStyle = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#fff',
  letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const heroSubStyle = {
  fontSize: 11.5, color: '#FCD34D', letterSpacing: '0.18em',
  textTransform: 'uppercase', fontWeight: 700, marginTop: 4,
}
const sectionStyle = {
  padding: '14px 0', borderBottom: '1px solid #1f2540',
}
const sectionTitle = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.18em',
  color: '#FCD34D', margin: '0 0 8px', textTransform: 'uppercase',
}
const teamRowStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '5px 4px', borderRadius: 3,
  background: 'rgba(8, 12, 22, 0.45)',
}
const disclosureBtn = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  background: 'rgba(8, 12, 22, 0.55)', border: '1px solid rgba(245, 200, 70, 0.10)',
  borderLeft: '2px solid rgba(245, 200, 70, 0.40)',
  color: '#fff', cursor: 'pointer', borderRadius: 3, padding: '11px 14px',
  textAlign: 'left', marginTop: 12,
}
const disclosureCaret = {
  fontFamily: "'Bebas Neue', sans-serif", color: '#FCD34D', fontSize: 16,
  width: 14, textAlign: 'center',
}
const progressCircle = (pct) => ({
  width: 72, height: 72, borderRadius: '50%',
  background: `conic-gradient(#F5C842 ${pct * 3.6}deg, rgba(245, 200, 70, 0.10) 0deg)`,
  display: 'grid', placeItems: 'center', position: 'relative',
  flexShrink: 0,
})
const pctNum = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#FCD34D',
  letterSpacing: '0.02em', filter: 'drop-shadow(0 0 8px rgba(245,200,70,0.6))',
}
const pctLbl = {
  position: 'absolute', bottom: -18, left: 0, right: 0,
  fontSize: 9.5, color: '#888', letterSpacing: '0.08em', textAlign: 'center',
}
const footerStyle = { paddingTop: 18, textAlign: 'center' }
const ctaStyle = {
  display: 'inline-block', padding: '13px 26px',
  background: 'linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)',
  color: '#1a1305', textDecoration: 'none', fontWeight: 800, letterSpacing: '0.18em',
  borderRadius: 4, fontFamily: "'Bebas Neue', sans-serif", fontSize: 17,
}

function Splash({ text }) {
  return (
    <div style={{ background:'#06080F', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color: '#FCD34D', fontFamily:'sans-serif' }}>
      <div style={{ fontSize:52 }}>⚽</div>
      <div style={{ fontSize:14, fontWeight:700, letterSpacing:3 }}>{text}</div>
      <Link to="/" style={{ color: '#888', fontSize: 13, marginTop: 8 }}>← Volver al inicio</Link>
    </div>
  )
}
