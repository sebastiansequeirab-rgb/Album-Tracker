import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ALBUM_CONFIG, ALBUM_ADRENALYN, ALBUM_STICKER } from '../data'
import TypeDonut from './ui/TypeDonut'

const ALBUMS = [ALBUM_ADRENALYN, ALBUM_STICKER]

export default function PublicProfile() {
  const { slug } = useParams()
  const [state, setState] = useState({ status: 'loading', profile: null, collections: {} })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: profile, error: pErr } = await supabase
          .from('adrenalyn_profiles')
          .select('user_id, display_name, avatar_emoji, contact, marketplace_visible, active_albums, trades_completed, slug')
          .eq('slug', slug)
          .maybeSingle()

        if (pErr) throw pErr
        if (!profile || !profile.marketplace_visible) {
          if (!cancelled) setState({ status: 'not_found', profile: null, collections: {} })
          return
        }

        const collections = {}
        for (const album of ALBUMS) {
          const cfg = ALBUM_CONFIG[album]
          if (!cfg) continue
          const { data } = await supabase
            .from(cfg.table)
            .select('data')
            .eq('user_id', profile.user_id)
            .maybeSingle()
          collections[album] = data?.data || {}
        }
        if (!cancelled) setState({ status: 'ready', profile, collections })
      } catch (err) {
        console.warn('PublicProfile load failed:', err)
        if (!cancelled) setState({ status: 'error', profile: null, collections: {} })
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  if (state.status === 'loading') {
    return <Splash text="CARGANDO..." />
  }
  if (state.status === 'not_found') {
    return <Splash text="ESTE PERFIL NO ES PÚBLICO" />
  }
  if (state.status === 'error') {
    return <Splash text="ERROR AL CARGAR" />
  }

  const { profile, collections } = state
  const activeAlbums = (profile.active_albums?.length ? profile.active_albums : ALBUMS).filter(a => ALBUM_CONFIG[a])

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <header style={headerStyle}>
          <div style={{ fontSize: 56 }}>{profile.avatar_emoji || '⚽'}</div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#fff', letterSpacing: 2 }}>
              {profile.display_name || 'Coleccionista'}
            </div>
            <div style={{ fontSize: 12, color: '#FCD34D', letterSpacing: 2, fontWeight: 700 }}>
              {profile.trades_completed > 0 ? `${profile.trades_completed} TRADES CONCRETADOS` : 'PERFIL PÚBLICO'}
            </div>
          </div>
        </header>

        {activeAlbums.map((album) => {
          const cfg = ALBUM_CONFIG[album]
          const items = cfg.buildItems()
          const col = collections[album] || {}
          const segments = buildSegments(cfg, items, col)
          const have = Object.values(col).filter(v => v === 'have' || v === 'duplicate').length
          const total = cfg.mainCount

          return (
            <section key={album} style={sectionStyle}>
              <h2 style={sectionTitle}>{cfg.title || album}</h2>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{have} de {total}</div>
              <TypeDonut segments={segments} />
            </section>
          )
        })}

        <footer style={footerStyle}>
          <Link to="/" style={ctaStyle}>HACER TRADE — ABRIR APP</Link>
        </footer>
      </div>
    </div>
  )
}

function buildSegments(cfg, items, col) {
  const groups = {}
  for (const it of items) {
    const t = it.type || 'otro'
    if (!groups[t]) groups[t] = { name: t, label: t, color: typeColor(t), total: 0, have: 0 }
    groups[t].total++
    const v = col[it.id]
    if (v === 'have' || v === 'duplicate') groups[t].have++
  }
  return Object.values(groups)
}

function typeColor(t) {
  const map = {
    intro: '#3B82F6', museum: '#F5C842', jugador: '#10B981',
    plantel: '#F97316', escudo: '#8B5CF6', momentum: '#EC4899',
  }
  return map[t] || '#FCD34D'
}

const pageStyle = {
  minHeight: '100dvh',
  background: '#06080F',
  color: '#fff',
  padding: '24px 16px',
  fontFamily: 'DM Sans, sans-serif',
}
const cardStyle = {
  maxWidth: 720,
  margin: '0 auto',
  background: '#0d111c',
  border: '1px solid #1f2540',
  padding: 24,
  borderRadius: 16,
}
const headerStyle = {
  display: 'flex', alignItems: 'center', gap: 16,
  paddingBottom: 18, borderBottom: '1px solid #1f2540',
  marginBottom: 18,
}
const sectionStyle = { padding: '14px 0', borderBottom: '1px solid #1f2540' }
const sectionTitle = {
  fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2,
  color: '#FCD34D', margin: '0 0 4px',
}
const footerStyle = { paddingTop: 18, textAlign: 'center' }
const ctaStyle = {
  display: 'inline-block', padding: '14px 28px',
  background: 'linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)',
  color: '#1a1305', textDecoration: 'none', fontWeight: 800, letterSpacing: 2,
  borderRadius: 6, fontFamily: 'Bebas Neue, sans-serif', fontSize: 18,
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
