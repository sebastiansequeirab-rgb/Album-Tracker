import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { buildCards, buildInitialState, parseNumberList, TEAMS_LIST, TEAM_DATA, MOMENTUM, TM, CC, ST } from '../data'

const ALL_CARDS = buildCards()

export default function Tracker({ session }) {
  const [col,       setCol]       = useState({})
  const [tab,       setTab]       = useState('dashboard')
  const [fType,     setFType]     = useState('all')
  const [fSt,       setFSt]       = useState('all')
  const [fTeam,     setFTeam]     = useState('all')
  const [q,         setQ]         = useState('')
  const [selTeam,   setSelTeam]   = useState(null)
  const [loaded,    setLoaded]    = useState(false)
  const [saveStatus,setSaveStatus]= useState('idle')
  const [toast,     setToast]     = useState(null)
  const [showQuick, setShowQuick] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [quickAction,setQuickAction]=useState('have')
  const [showReset, setShowReset] = useState(false)

  // Auth errors (JWT expired/invalid) — try refresh, else sign out so user re-logins
  const handleAuthError = async (err) => {
    const msg = (err?.message || '').toLowerCase()
    const code = err?.code || ''
    const isAuth = code === 'PGRST301' || code === '401' ||
                   msg.includes('jwt') || msg.includes('expired') ||
                   msg.includes('invalid token') || msg.includes('not authenticated')
    if (!isAuth) return false
    const { error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr) await supabase.auth.signOut()
    return true
  }

  // ── Load from Supabase ──
  useEffect(() => {
    let cancelled = false
    let attempt = 0

    const load = async () => {
      const { data, error } = await supabase
        .from('adrenalyn_collections')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Load error:', error)
        if (await handleAuthError(error)) return
        attempt++
        if (attempt < 5) setTimeout(load, 1500 * attempt)
        else setSaveStatus('error')
        return
      }

      if (!data || !data.data || Object.keys(data.data).length === 0) {
        const init = buildInitialState()
        setCol(init)
        const { error: seedErr } = await supabase
          .from('adrenalyn_collections')
          .upsert({ user_id: session.user.id, data: init })
        if (seedErr) {
          console.error('Initial seed error:', seedErr)
          if (await handleAuthError(seedErr)) return
        }
      } else {
        setCol(data.data)
      }
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [session])

  // ── Save to Supabase (coalesced + retry) ──
  const saveRef = useRef({ inFlight: false, pending: null, retryAt: 0 })

  const save = async (newCol) => {
    if (saveRef.current.inFlight) {
      saveRef.current.pending = newCol
      return
    }
    saveRef.current.inFlight = true
    setSaveStatus('saving')

    const { error } = await supabase
      .from('adrenalyn_collections')
      .upsert({ user_id: session.user.id, data: newCol })

    saveRef.current.inFlight = false

    if (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      if (await handleAuthError(error)) return
      const delay = Math.min(8000, 1000 * Math.pow(2, saveRef.current.retryAt++))
      setTimeout(() => save(saveRef.current.pending || newCol), delay)
      return
    }

    saveRef.current.retryAt = 0
    if (saveRef.current.pending) {
      const next = saveRef.current.pending
      saveRef.current.pending = null
      save(next)
      return
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 1500)
  }

  const flash = (msg, color = '#4ADE80') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2000)
  }

  const toggle = (id) => {
    const order = ['missing', 'have', 'duplicate']
    const cur = col[id] || 'missing'
    const nxt = order[(order.indexOf(cur) + 1) % 3]
    const nc = { ...col, [id]: nxt }
    setCol(nc)
    save(nc)
    const card = ALL_CARDS.find(c => c.id === id)
    const msgs = { have:'✅ ¡La tienes!', duplicate:'🔄 Repetida', missing:'❌ Faltante' }
    const clrs = { have:'#4ADE80', duplicate:'#F59E0B', missing:'#64748B' }
    flash(`#${card?.num} ${card?.name} — ${msgs[nxt]}`, clrs[nxt])
  }

  const gs = id => col[id] || 'missing'

  const applyQuickUpdate = () => {
    const numbers = parseNumberList(quickText)
    if (!numbers.length) { flash('⚠️ No hay números válidos', '#F87171'); return }
    const nc = { ...col }
    let count = 0
    ALL_CARDS.forEach(card => {
      if (typeof card.num === 'number' && numbers.includes(card.num)) {
        nc[card.id] = quickAction
        count++
      }
    })
    setCol(nc); save(nc)
    const lbl = { have:'✅ Tengo', duplicate:'🔄 Repetidas', missing:'❌ Faltantes' }
    const clr = { have:'#4ADE80', duplicate:'#F59E0B', missing:'#94A3B8' }
    flash(`✨ ${count} cartas → ${lbl[quickAction]}`, clr[quickAction])
    setQuickText(''); setShowQuick(false)
  }

  const resetToInitial = async () => {
    const init = buildInitialState()
    setCol(init); await save(init)
    flash('🔄 Restablecido al estado inicial', '#60A5FA')
    setShowReset(false)
  }

  const matchedCards = useMemo(() => {
    if (!quickText) return []
    const nums = parseNumberList(quickText)
    return ALL_CARDS.filter(c => typeof c.num === 'number' && nums.includes(c.num))
  }, [quickText])

  const mainCards = useMemo(() => ALL_CARDS.filter(c => c.type !== 'Momentum'), [])
  const stats = useMemo(() => {
    const have = mainCards.filter(c => gs(c.id) === 'have').length
    const dup  = mainCards.filter(c => gs(c.id) === 'duplicate').length
    const tot  = mainCards.length
    return { tot, have, dup, miss: tot - have - dup, pct: Math.round((have + dup) / tot * 100) }
  }, [col])

  const momStats = useMemo(() => {
    const mc = ALL_CARDS.filter(c => c.type === 'Momentum')
    return { have: mc.filter(c => gs(c.id) !== 'missing').length, tot: 3 }
  }, [col])

  const teamStats = useMemo(() => TEAMS_LIST.map(t => {
    const tc = ALL_CARDS.filter(c => c.team === t.name)
    const h  = tc.filter(c => gs(c.id) !== 'missing').length
    return { ...t, tot: tc.length, have: h, pct: Math.round(h / tc.length * 100) }
  }), [col])

  const filtered = useMemo(() => ALL_CARDS.filter(c => {
    const s = gs(c.id)
    if (fSt   !== 'all' && s !== fSt)       return false
    if (fType !== 'all' && c.type !== fType) return false
    if (fTeam !== 'all' && c.team !== fTeam) return false
    if (q) {
      const lq = q.toLowerCase()
      if (!c.name.toLowerCase().includes(lq) &&
          !c.team.toLowerCase().includes(lq) &&
          !String(c.num).includes(lq)) return false
    }
    return true
  }), [col, fSt, fType, fTeam, q])

  const dups = useMemo(() => ALL_CARDS.filter(c => gs(c.id) === 'duplicate'), [col])

  if (!loaded) return (
    <div style={{ background:'#06080F', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ fontSize:52 }}>⚽</div>
      <div style={{ color:'#FCD34D', fontSize:14, fontWeight:700, letterSpacing:3 }}>CARGANDO TU COLECCIÓN...</div>
    </div>
  )

  const Bar = ({ pct, color = '#4ADE80', h = 6 }) => (
    <div style={{ background:'#1E293B', borderRadius:4, height:h, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width .7s ease' }} />
    </div>
  )

  const Pill = ({ card }) => {
    const s  = gs(card.id)
    const st = ST[s]
    const m  = TM[card.type] || { e:'?', l:'?', c:'#666' }
    return (
      <div onClick={() => toggle(card.id)}
        style={{ cursor:'pointer', background:st.bg, border:`1px solid ${st.bd}`, borderRadius:10, padding:'9px 11px', display:'flex', alignItems:'center', gap:9, userSelect:'none', transition:'transform .12s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:st.dot, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:s==='missing'?'#64748B':st.tx, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{card.name}</div>
          <div style={{ fontSize:10, color:m.c, marginTop:1 }}>{m.e} {m.l} · <span style={{ color:'#334155' }}>#{card.num}</span></div>
        </div>
        <div style={{ flexShrink:0, fontSize:9, fontWeight:700, color:st.tx, background:st.tag, border:`1px solid ${st.bd}`, borderRadius:6, padding:'2px 6px' }}>{st.l}</div>
      </div>
    )
  }

  return (
    <div style={{ background:'#06080F', minHeight:'100vh', fontFamily:"'DM Sans',sans-serif", color:'#E2E8F0', paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #090D1A; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        select, input, textarea, button { font-family: 'DM Sans', sans-serif; outline: none; }
        @keyframes toast { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        @keyframes pulse { 0%,100% { box-shadow:0 8px 28px rgba(245,158,11,.5),0 0 0 0 rgba(245,158,11,.4) } 50% { box-shadow:0 8px 28px rgba(245,158,11,.5),0 0 0 14px rgba(245,158,11,0) } }
        .fade { animation: fadeUp .22s ease; }
      `}</style>

      {/* Toast */}
      {toast && <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#0F172A', border:`1px solid ${toast.color}55`, borderRadius:12, padding:'10px 22px', fontSize:13, fontWeight:600, color:toast.color, zIndex:9999, whiteSpace:'nowrap', boxShadow:'0 8px 32px #000a', animation:'toast .25s ease' }}>{toast.msg}</div>}

      {/* Quick Update Modal */}
      {showQuick && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => setShowQuick(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'linear-gradient(180deg,#0F172A,#0A0F1E)', border:'1px solid #FCD34D44', borderRadius:18, padding:20, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', animation:'modalIn .22s ease', boxShadow:'0 24px 60px rgba(0,0,0,.7)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:2, color:'#FCD34D' }}>✏️ ACTUALIZACIÓN RÁPIDA</div>
                <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>Pega o escribe los números que quieres actualizar</div>
              </div>
              <button onClick={() => setShowQuick(false)} style={{ background:'transparent', border:'none', color:'#475569', fontSize:24, cursor:'pointer', padding:0, lineHeight:1 }}>×</button>
            </div>
            <textarea value={quickText} onChange={e => setQuickText(e.target.value)}
              placeholder="Ej: 1, 3, 4-7, 10, 15-20"
              style={{ width:'100%', minHeight:90, background:'#06080F', color:'#E2E8F0', border:'1px solid #334155', borderRadius:10, padding:'10px 12px', fontSize:13, fontFamily:'monospace', resize:'vertical' }} />
            <div style={{ fontSize:11, color:'#64748B', marginTop:6, marginBottom:14 }}>
              💡 Acepta comas, espacios o saltos de línea. Rangos con "-".
              {quickText && <span style={{ color:'#FCD34D', fontWeight:600, display:'block', marginTop:3 }}>→ {matchedCards.length} cartas coinciden</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
              {[{v:'have',l:'✅ Tengo',c:'#22C55E',bg:'#052E16'},{v:'duplicate',l:'🔄 Repetida',c:'#F59E0B',bg:'#1C1008'},{v:'missing',l:'❌ Falta',c:'#64748B',bg:'#1E293B'}].map(b => (
                <button key={b.v} onClick={() => setQuickAction(b.v)}
                  style={{ cursor:'pointer', background:quickAction===b.v?b.bg:'#0F172A', border:`2px solid ${quickAction===b.v?b.c:'#1E293B'}`, borderRadius:10, padding:'10px 8px', color:quickAction===b.v?b.c:'#475569', fontSize:12, fontWeight:700 }}>
                  {b.l}
                </button>
              ))}
            </div>
            {matchedCards.length > 0 && matchedCards.length <= 20 && (
              <div style={{ background:'#06080F', border:'1px solid #1E293B', borderRadius:10, padding:10, marginBottom:12, maxHeight:180, overflowY:'auto' }}>
                {matchedCards.map(c => (
                  <div key={c.id} style={{ fontSize:11, color:'#94A3B8', padding:'3px 0', display:'flex', gap:8 }}>
                    <span style={{ color:'#FCD34D', fontWeight:700, minWidth:38 }}>#{c.num}</span>
                    <span>{c.flag}</span>
                    <span style={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</span>
                    <span style={{ color:'#475569', fontSize:10 }}>{c.team}</span>
                  </div>
                ))}
              </div>
            )}
            {matchedCards.length > 20 && <div style={{ background:'#06080F', border:'1px solid #1E293B', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:11, color:'#94A3B8' }}>📋 {matchedCards.length} cartas afectadas</div>}
            <button onClick={applyQuickUpdate} disabled={matchedCards.length === 0}
              style={{ width:'100%', cursor:matchedCards.length>0?'pointer':'not-allowed', background:matchedCards.length>0?'linear-gradient(135deg,#FCD34D,#F59E0B)':'#1E293B', border:'none', borderRadius:10, padding:'12px', color:matchedCards.length>0?'#000':'#475569', fontSize:14, fontWeight:800, letterSpacing:1 }}>
              APLICAR A {matchedCards.length} CARTA{matchedCards.length !== 1 ? 'S' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showReset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={() => setShowReset(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#0F172A', border:'1px solid #F87171', borderRadius:16, padding:20, width:'100%', maxWidth:380 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#F87171', letterSpacing:1, marginBottom:8 }}>⚠️ RESETEAR COLECCIÓN</div>
            <div style={{ fontSize:13, color:'#94A3B8', marginBottom:18, lineHeight:1.5 }}>Esto restablece tu colección a la lista inicial de fotos. Se perderán tus cambios actuales.</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowReset(false)} style={{ flex:1, background:'#1E293B', border:'1px solid #334155', borderRadius:10, padding:'10px', color:'#94A3B8', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={resetToInitial} style={{ flex:1, background:'#7F1D1D', border:'1px solid #F87171', borderRadius:10, padding:'10px', color:'#FECACA', fontSize:13, fontWeight:700, cursor:'pointer' }}>Sí, resetear</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background:'#09101F', borderBottom:'1px solid #1E293B', padding:'12px 16px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:'#FCD34D', lineHeight:1 }}>⚽ ADRENALYN XL</div>
              <div style={{ fontSize:10, color:'#334155', fontWeight:700, letterSpacing:2 }}>FIFA WORLD CUP 2026™ · {session.user.email}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {saveStatus === 'saving' && <div style={{ fontSize:11, color:'#475569', fontWeight:600 }}>⏳ Guardando...</div>}
              {saveStatus === 'saved'  && <div style={{ fontSize:11, color:'#4ADE80', fontWeight:700 }}>✓ Guardado</div>}
              {saveStatus === 'error'  && <div style={{ fontSize:11, color:'#F87171', fontWeight:700 }}>⚠️ Error</div>}
              <button onClick={() => setShowReset(true)} title="Resetear" style={{ background:'transparent', border:'1px solid #1E293B', borderRadius:8, padding:'5px 8px', color:'#475569', fontSize:11, cursor:'pointer' }}>⟲</button>
              <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" style={{ background:'transparent', border:'1px solid #1E293B', borderRadius:8, padding:'5px 10px', color:'#475569', fontSize:11, cursor:'pointer' }}>Salir</button>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:stats.pct>=100?'#FCD34D':'#4ADE80', lineHeight:1 }}>{stats.pct}%</div>
                <div style={{ fontSize:10, color:'#475569', fontWeight:600 }}>DE 630</div>
              </div>
            </div>
          </div>
          <Bar pct={stats.pct} color="linear-gradient(90deg,#15803D,#4ADE80)" h={8} />
          <div style={{ display:'flex', gap:14, marginTop:7, fontSize:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ color:'#4ADE80', fontWeight:700 }}>✅ {stats.have}</span>
            <span style={{ color:'#F59E0B', fontWeight:700 }}>🔄 {stats.dup}</span>
            <span style={{ color:'#475569' }}>❌ {stats.miss}</span>
            <span style={{ color:'#E879F9', fontWeight:700 }}>💎 {momStats.have}/3</span>
            <span style={{ color:'#1E293B', marginLeft:'auto' }}>630 + 3 Momentum</span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={{ background:'#09101F', borderBottom:'1px solid #1E293B', padding:'0 16px', position:'sticky', top:90, zIndex:99 }}>
        <div style={{ maxWidth:980, margin:'0 auto', display:'flex', overflowX:'auto' }}>
          {[{id:'dashboard',i:'📊',l:'Dashboard'},{id:'teams',i:'🌍',l:'Equipos'},{id:'cards',i:'🃏',l:'Cartas'},{id:'trading',i:'🔄',l:'Intercambio',b:stats.dup}].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelTeam(null) }}
              style={{ padding:'10px 14px', border:'none', borderBottom:tab===t.id?'2px solid #FCD34D':'2px solid transparent', background:'transparent', color:tab===t.id?'#FCD34D':'#475569', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              {t.i} {t.l}
              {t.b > 0 && <span style={{ background:'#D97706', color:'#000', borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:800 }}>{t.b}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth:980, margin:'0 auto', padding:16 }}>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="fade">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
              {[{l:'Total',v:630,c:'#60A5FA',e:'📦'},{l:'Tengo',v:stats.have,c:'#4ADE80',e:'✅'},{l:'Faltan',v:stats.miss,c:'#F87171',e:'❌'},{l:'Repetidas',v:stats.dup,c:'#F59E0B',e:'🔄'}].map(s => (
                <div key={s.l} style={{ background:'linear-gradient(135deg,#0F172A,#162030)', border:'1px solid #1E293B', borderRadius:14, padding:'14px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{s.e}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:s.c, lineHeight:1.1 }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'#475569', fontWeight:600, marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Quick Update CTA */}
            <div onClick={() => setShowQuick(true)} style={{ cursor:'pointer', background:'linear-gradient(135deg,#1E1809,#2D200A)', border:'1px solid #FCD34D44', borderRadius:14, padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, color:'#FCD34D' }}>✏️ ACTUALIZACIÓN RÁPIDA</div>
                <div style={{ fontSize:12, color:'#92400E', marginTop:2 }}>Pega varios números en bulk · Ej: "1, 3, 5-10"</div>
              </div>
              <div style={{ fontSize:24, color:'#FCD34D' }}>→</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ background:'#0F172A', border:'1px solid #1E293B', borderRadius:14, padding:16 }}>
                <div style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:1.5, marginBottom:14 }}>POR TIPO</div>
                {Object.entries(TM).filter(([t]) => t !== 'Momentum').map(([type, m]) => {
                  const tc = ALL_CARDS.filter(c => c.type === type)
                  const h  = tc.filter(c => gs(c.id) !== 'missing').length
                  const p  = tc.length ? Math.round(h / tc.length * 100) : 0
                  return (
                    <div key={type} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                        <span style={{ color:m.c, fontWeight:600 }}>{m.e} {m.l}</span>
                        <span style={{ color:'#334155' }}>{h}/{tc.length}</span>
                      </div>
                      <Bar pct={p} color={m.c} h={5} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'#0F172A', border:'1px solid #1E293B', borderRadius:14, padding:16 }}>
                  <div style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:1.5, marginBottom:14 }}>CONFEDERACIÓN</div>
                  {['CONMEBOL','UEFA','CONCACAF','CAF','AFC','OFC'].map(cf => {
                    const ct = TEAMS_LIST.filter(t => t.conf === cf)
                    const cc = ALL_CARDS.filter(c => ct.some(t => t.name === c.team))
                    const h  = cc.filter(c => gs(c.id) !== 'missing').length
                    const p  = cc.length ? Math.round(h / cc.length * 100) : 0
                    if (!cc.length) return null
                    return (
                      <div key={cf} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:CC[cf], fontWeight:700 }}>{cf}</span>
                          <span style={{ color:'#334155' }}>{p}%</span>
                        </div>
                        <Bar pct={p} color={CC[cf]} h={7} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ background:'linear-gradient(135deg,#1A0800,#140600)', border:'1px solid #92400E44', borderRadius:14, padding:16 }}>
                  <div style={{ fontSize:10, color:'#D97706', fontWeight:700, letterSpacing:1.5, marginBottom:12 }}>🥇 RARAS / ULTRA RARAS</div>
                  {['Golden Baller','Eternos 22','Official Emblem'].map(type => {
                    const tc = ALL_CARDS.filter(c => c.type === type)
                    const h  = tc.filter(c => gs(c.id) !== 'missing').length
                    return (
                      <div key={type} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ color:'#FCD34D', fontSize:12 }}>{TM[type]?.e} {TM[type]?.l}</span>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:h===tc.length?'#4ADE80':'#F59E0B' }}>{h}/{tc.length}</span>
                      </div>
                    )
                  })}
                  <div style={{ borderTop:'1px solid #1E293B', paddingTop:10, marginTop:4 }}>
                    <div style={{ fontSize:10, color:'#7C3AED', fontWeight:700, letterSpacing:1, marginBottom:8 }}>💎 MOMENTUM</div>
                    {MOMENTUM.map((p, i) => {
                      const mc = ALL_CARDS.find(c => c.id === `MOM-${i}`)
                      const s  = gs(mc.id)
                      return (
                        <div key={i} onClick={() => toggle(mc.id)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:8, marginBottom:6, padding:'6px 8px', background:s!=='missing'?'#2D0045':'transparent', border:`1px solid ${s!=='missing'?'#A855F7':'#1E293B'}`, borderRadius:8 }}>
                          <span>{p.flag}</span>
                          <span style={{ fontSize:11, flex:1, color:s!=='missing'?'#E879F9':'#6D28D9' }}>{p.name}</span>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:s==='have'?'#A855F7':s==='duplicate'?'#F59E0B':'#4C1D95' }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background:'#0F172A', border:'1px solid #1E293B', borderRadius:14, padding:16 }}>
              <div style={{ fontSize:10, color:'#475569', fontWeight:700, letterSpacing:1.5, marginBottom:12 }}>📌 EQUIPOS CON MÁS FALTANTES</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:8 }}>
                {teamStats.sort((a,b) => (b.tot-b.have)-(a.tot-a.have)).slice(0,12).map(t => (
                  <div key={t.id} onClick={() => { setTab('teams'); setSelTeam(t.id) }}
                    style={{ background:'#162030', border:'1px solid #1E293B', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'transform .15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                    <span style={{ fontSize:22 }}>{t.flag}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#CBD5E1', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                      <div style={{ fontSize:11, color:'#F87171', fontWeight:700 }}>Faltan {t.tot-t.have}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Teams */}
        {tab === 'teams' && !selTeam && (
          <div className="fade" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            {teamStats.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
              <div key={t.id} onClick={() => setSelTeam(t.id)}
                style={{ background:t.pct===100?'linear-gradient(135deg,#052E16,#14532D)':'linear-gradient(135deg,#0F172A,#162030)', border:`1px solid ${t.pct===100?'#16A34A':'#1E293B'}`, borderRadius:14, padding:'14px 12px', textAlign:'center', cursor:'pointer', transition:'transform .15s', boxShadow:t.pct===100?'0 0 20px rgba(34,197,94,.2)':'none' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=t.pct===100?'0 0 20px rgba(34,197,94,.2)':'none' }}>
                <div style={{ fontSize:34, marginBottom:4 }}>{t.flag}</div>
                <div style={{ fontWeight:700, fontSize:11, color:'#E2E8F0', marginBottom:2 }}>{t.name}</div>
                <div style={{ fontSize:10, color:CC[t.conf]||'#64748B', marginBottom:8, fontWeight:700 }}>{t.conf}</div>
                <Bar pct={t.pct} color={t.pct===100?'#22C55E':'#60A5FA'} h={5} />
                <div style={{ fontSize:11, color:t.pct===100?'#4ADE80':'#475569', marginTop:5, fontWeight:600 }}>{t.have}/{t.tot}</div>
                {t.pct===100 && <div style={{ fontSize:10, color:'#4ADE80', marginTop:3 }}>✨ Completo</div>}
              </div>
            ))}
          </div>
        )}

        {/* Team Detail */}
        {tab === 'teams' && selTeam && (() => {
          const td = TEAM_DATA.find(t => t[0] === selTeam)
          if (!td) return null
          const [,name,flag,conf] = td
          const tc = ALL_CARDS.filter(c => c.team === name)
          const hv = tc.filter(c => gs(c.id) !== 'missing').length
          const byType = Object.keys(TM).map(type => ({ type, cards:tc.filter(c => c.type === type) })).filter(g => g.cards.length > 0)
          return (
            <div className="fade">
              <button onClick={() => setSelTeam(null)} style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'7px 16px', color:'#94A3B8', cursor:'pointer', fontSize:12, fontWeight:600, marginBottom:16 }}>← Volver</button>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, background:'#0F172A', border:'1px solid #1E293B', borderRadius:16, padding:20 }}>
                <div style={{ fontSize:56 }}>{flag}</div>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:'#E2E8F0', lineHeight:1, marginBottom:4, margin:0 }}>{name}</h2>
                  <div style={{ color:CC[conf]||'#64748B', fontSize:12, fontWeight:700, marginBottom:8 }}>{conf}</div>
                  <Bar pct={Math.round(hv/tc.length*100)} color="#60A5FA" h={8} />
                  <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>{hv}/{tc.length} · {Math.round(hv/tc.length*100)}%</div>
                </div>
              </div>
              {byType.map(({ type, cards }) => (
                <div key={type} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, color:TM[type]?.c||'#64748B', fontWeight:700, letterSpacing:1.5, marginBottom:8 }}>
                    {TM[type]?.e} {TM[type]?.l?.toUpperCase()} ({cards.filter(c => gs(c.id) !== 'missing').length}/{cards.length})
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:6 }}>
                    {cards.map(c => <Pill key={c.id} card={c} />)}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Cards Browser */}
        {tab === 'cards' && (
          <div className="fade">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              <input placeholder="🔍 Jugador, equipo o número…" value={q} onChange={e => setQ(e.target.value)}
                style={{ flex:1, minWidth:180, background:'#0F172A', color:'#E2E8F0', border:'1px solid #334155', borderRadius:10, padding:'9px 14px', fontSize:13 }} />
              {[
                { val:fSt,   set:setFSt,   opts:[['all','Todos los estados'],['missing','❌ Faltan'],['have','✅ Tengo'],['duplicate','🔄 Repetidas']] },
                { val:fType, set:setFType, opts:[['all','Todos los tipos'],...Object.entries(TM).map(([t,m]) => [t,`${m.e} ${m.l}`])] },
                { val:fTeam, set:setFTeam, opts:[['all','Todos los equipos'],...[...new Set(ALL_CARDS.map(c => c.team))].sort().map(t => [t,t])] },
              ].map((f, i) => (
                <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ background:'#0F172A', color:'#E2E8F0', border:'1px solid #334155', borderRadius:10, padding:'9px 12px', fontSize:12 }}>
                  {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
            <div style={{ fontSize:11, color:'#334155', marginBottom:10 }}>{filtered.length} cartas · toca para cambiar estado</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:6 }}>
              {filtered.slice(0, 420).map(c => <Pill key={c.id} card={c} />)}
            </div>
            {filtered.length > 420 && <div style={{ textAlign:'center', color:'#334155', fontSize:12, padding:20 }}>Mostrando 420 de {filtered.length} · Usa filtros para refinar</div>}
          </div>
        )}

        {/* Trading */}
        {tab === 'trading' && (
          <div className="fade">
            {dups.length === 0 ? (
              <div style={{ textAlign:'center', padding:70 }}>
                <div style={{ fontSize:60, marginBottom:12 }}>🃏</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:'#1E293B', marginBottom:8 }}>SIN REPETIDAS AÚN</div>
                <div style={{ color:'#334155', fontSize:14 }}>Cuando marques cartas como "Repetida" aparecerán aquí.</div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:'#F59E0B' }}>🔄 PARA INTERCAMBIO</div>
                    <div style={{ fontSize:13, color:'#475569' }}>{dups.length} cartas repetidas</div>
                  </div>
                  <button onClick={() => {
                    const txt = dups.map(c => `#${c.num} ${c.name} (${c.team}) [${c.type}]`).join('\n')
                    navigator.clipboard?.writeText(txt).then(() => flash('📋 Lista copiada','#F59E0B'))
                  }} style={{ background:'#1C1008', border:'1px solid #D97706', borderRadius:10, padding:'8px 18px', color:'#FCD34D', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    📋 Copiar lista
                  </button>
                </div>
                {['ultra-rare','rare','special','base'].map(cat => {
                  const cd = dups.filter(c => c.cat === cat)
                  if (!cd.length) return null
                  const cl = { base:'#475569', special:'#C084FC', rare:'#FCD34D', 'ultra-rare':'#F43F5E' }
                  const nl = { base:'Base', special:'Especiales', rare:'⭐ Raras', 'ultra-rare':'💎 Ultra Raras' }
                  return (
                    <div key={cat} style={{ marginBottom:20 }}>
                      <div style={{ fontSize:11, color:cl[cat], fontWeight:700, letterSpacing:1.5, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${cl[cat]}22` }}>{nl[cat]} ({cd.length})</div>
                      {[...new Set(cd.map(c => c.team))].sort().map(teamName => {
                        const td = cd.filter(c => c.team === teamName)
                        const tf = TEAMS_LIST.find(t => t.name === teamName)
                        return (
                          <div key={teamName} style={{ marginBottom:12, background:'#0F172A', border:'1px solid #1E293B', borderRadius:12, padding:14 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                              <span style={{ fontSize:20 }}>{tf?.flag||'🌐'}</span>
                              <span style={{ fontWeight:700, color:'#E2E8F0', fontSize:13 }}>{teamName}</span>
                              <span style={{ background:'#D9770622', color:'#F59E0B', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, border:'1px solid #D9770644' }}>{td.length} repet.</span>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:6 }}>
                              {td.map(c => <Pill key={c.id} card={c} />)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </main>

      {/* Floating Quick Update Button */}
      <button onClick={() => setShowQuick(true)}
        style={{ position:'fixed', bottom:20, right:20, minWidth:60, height:60, padding:'0 20px', borderRadius:30, background:'linear-gradient(135deg,#FCD34D,#F59E0B)', border:'none', fontSize:20, cursor:'pointer', color:'#000', fontWeight:800, zIndex:90, display:'flex', alignItems:'center', gap:8, animation:'pulse 2.5s infinite', boxShadow:'0 8px 28px rgba(245,158,11,.5)' }}>
        <span>✏️</span><span style={{ fontSize:13, letterSpacing:1 }}>ACTUALIZAR</span>
      </button>
    </div>
  )
}
