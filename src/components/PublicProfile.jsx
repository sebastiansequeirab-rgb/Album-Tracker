import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ALBUM_CONFIG, ALBUM_STICKER } from '../data'

export default function PublicProfile() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', profile: null, col: {} })
  const [showFaltantes, setShowFaltantes] = useState(true)
  const [showRepetidas, setShowRepetidas] = useState(true)

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
        // (avatar_url se intenta leer abajo si la columna existe)

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

  const tradeHref = profile.user_id
    ? `/?openUser=${encodeURIComponent(profile.user_id)}`
    : '/'

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* ── BRAND STRIP ────────────────────────────────────────── */}
        <Link to="/" style={brandStripStyle} aria-label="WC Album Tracker — Home">
          <img src="/logo-192.png" alt="" width="28" height="28" style={brandStripLogo} />
          <span style={brandStripText}>WC ALBUM TRACKER</span>
        </Link>

        {/* ── CTA TOP: Hacer trade ──────────────────────────────── */}
        <Link to={tradeHref} style={topCtaStyle}>
          <span style={topCtaIcon} aria-hidden>🤝</span>
          <span style={topCtaLabel}>HACER TRADE CON {(profile.display_name || 'COLECCIONISTA').toUpperCase()}</span>
          <span style={topCtaArrow} aria-hidden>→</span>
        </Link>

        {/* ── HERO ───────────────────────────────────────────────── */}
        <header style={heroStyle}>
          <Avatar profile={profile} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={heroNameStyle}>{profile.display_name || 'Coleccionista'}</div>
            <div style={heroSubStyle}>
              ÁLBUM PANINI WC 2026
              {profile.trades_completed > 0 && ` · ${profile.trades_completed} trades`}
            </div>
            <div style={heroStatsRow}>
              <span style={heroStatsBig}>{have}</span>
              <span style={heroStatsSep}>/</span>
              <span style={heroStatsTot}>{total}</span>
              <span style={heroStatsLabel}>STICKERS</span>
            </div>
          </div>
          <div style={progressCircle(pct)}>
            <div style={pctNum}>{pct}%</div>
          </div>
        </header>

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
          <Link to={tradeHref} style={ctaStyle}>HACER TRADE — ABRIR APP</Link>
        </footer>
      </div>
    </div>
  )
}

function Avatar({ profile }) {
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.display_name || 'Avatar'}
        style={avatarImgStyle}
      />
    )
  }
  return <div style={avatarEmojiStyle}>{profile.avatar_emoji || '⚽'}</div>
}

/* ─────────────────────────────────────────────────────────────── */

function computeStats(items, col) {
  let totalHave = 0
  const missingItems = []
  const duplicateItems = []
  for (const it of items) {
    const status = col[it.id] || 'missing'
    if (status === 'have' || status === 'duplicate') totalHave++
    if (status === 'missing') missingItems.push(it)
    if (status === 'duplicate') duplicateItems.push(it)
  }
  return { totalHave, missingItems, duplicateItems }
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
const brandStripStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 10,
  textDecoration: 'none',
  marginBottom: 14,
  padding: '6px 10px 6px 6px',
  background: 'rgba(245, 200, 70, 0.06)',
  border: '1px solid rgba(245, 200, 70, 0.18)',
  borderRadius: 999,
}
const brandStripLogo = {
  borderRadius: 6,
  display: 'block',
  filter: 'drop-shadow(0 0 8px rgba(245, 200, 70, 0.35))',
}
const brandStripText = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 13,
  color: '#FCD34D',
  letterSpacing: '0.20em',
  fontWeight: 600,
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
const heroStatsRow = {
  display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 10,
  flexWrap: 'wrap',
}
const heroStatsBig = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: '#fff',
  letterSpacing: '0.02em', lineHeight: 1,
  filter: 'drop-shadow(0 0 12px rgba(245,200,70,0.40))',
}
const heroStatsSep = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#475569',
  margin: '0 4px',
}
const heroStatsTot = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#94a3b8',
  letterSpacing: '0.04em',
}
const heroStatsLabel = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: '#FCD34D',
  letterSpacing: '0.24em', marginLeft: 8,
}
const avatarImgStyle = {
  width: 76, height: 76, borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid #F5C842',
  boxShadow: '0 0 18px rgba(245,200,70,0.35)',
  flexShrink: 0,
}
const avatarEmojiStyle = {
  fontSize: 56, lineHeight: 1, width: 76, height: 76,
  display: 'grid', placeItems: 'center',
  borderRadius: '50%', background: 'rgba(245, 200, 70, 0.06)',
  border: '1px solid rgba(245,200,70,0.18)',
  flexShrink: 0,
}
const sectionStyle = {
  padding: '14px 0', borderBottom: '1px solid #1f2540',
}
const sectionTitle = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: '0.18em',
  color: '#FCD34D', margin: '0 0 8px', textTransform: 'uppercase',
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
  width: 88, height: 88, borderRadius: '50%',
  background: `conic-gradient(#F5C842 ${pct * 3.6}deg, rgba(245, 200, 70, 0.10) 0deg)`,
  display: 'grid', placeItems: 'center', position: 'relative',
  flexShrink: 0,
  boxShadow: '0 0 24px rgba(245, 200, 70, 0.20)',
})
const pctNum = {
  fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#FCD34D',
  letterSpacing: '0.02em',
  filter: 'drop-shadow(0 0 10px rgba(245,200,70,0.7))',
  width: 70, height: 70, borderRadius: '50%',
  background: '#0d111c',
  display: 'grid', placeItems: 'center',
}
const topCtaStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '14px 18px',
  background: 'linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)',
  color: '#1a1305',
  textDecoration: 'none',
  borderRadius: 4,
  marginBottom: 16,
  boxShadow: '0 8px 22px rgba(245, 200, 70, 0.30)',
  border: '1px solid #C88A00',
  cursor: 'pointer',
  transition: 'filter 0.18s ease, transform 0.12s ease',
}
const topCtaIcon = { fontSize: 20, lineHeight: 1, flexShrink: 0 }
const topCtaLabel = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 16, letterSpacing: '0.18em',
  flex: 1, minWidth: 0, fontWeight: 800,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const topCtaArrow = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 22, fontWeight: 800,
  flexShrink: 0,
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
