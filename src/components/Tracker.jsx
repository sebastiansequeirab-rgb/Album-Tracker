import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { buildCards, buildInitialState, parseNumberList, TEAMS_LIST, TEAM_DATA, MOMENTUM, TM, CC, ST } from '../data'
import { ensureMyProfile } from '../lib/marketplace'
import Marketplace from './Marketplace'
import Profile from './Profile'
import s from './Tracker.module.css'

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
  const [myProfile, setMyProfile] = useState(null)

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
          .upsert({ user_id: session.user.id, data: init }, { onConflict: 'user_id' })
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

    // Ensure marketplace profile row exists (idempotent), non-blocking
    ensureMyProfile(session.user.id, session.user.email)
      .then(p => { if (!cancelled) setMyProfile(p) })
      .catch(err => console.warn('Profile ensure failed:', err))

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
      .upsert({ user_id: session.user.id, data: newCol }, { onConflict: 'user_id' })

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
    setTimeout(() => setSaveStatus(st => st === 'saved' ? 'idle' : st), 1500)
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
    const st = gs(c.id)
    if (fSt   !== 'all' && st !== fSt)       return false
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

  if (!loaded) return (
    <div className={s.loading}>
      <div className={s.loadingEmoji}>⚽</div>
      <div className={s.loadingText}>CARGANDO TU COLECCIÓN...</div>
    </div>
  )

  const Bar = ({ pct, color = '#4ADE80', h = 6 }) => (
    <div className={s.bar} style={{ height: h }}>
      <div className={s.barFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  )

  const Pill = ({ card }) => {
    const status = gs(card.id)
    const st = ST[status]
    const m  = TM[card.type] || { e:'?', l:'?', c:'#666' }
    return (
      <div onClick={() => toggle(card.id)}
        className={s.pill}
        style={{ background: st.bg, borderColor: st.bd, cursor: 'pointer' }}>
        <div className={s.pillDot} style={{ background: st.dot }} />
        <div className={s.pillBody}>
          <div className={s.pillName} style={{ color: status === 'missing' ? '#64748B' : st.tx }}>
            {card.name}
          </div>
          <div className={s.pillMeta} style={{ color: m.c }}>
            {m.e} {m.l} · <span className={s.pillMetaNum}>#{card.num}</span>
          </div>
        </div>
        <div className={s.pillTag} style={{ color: st.tx, background: st.tag, borderColor: st.bd }}>
          {st.l}
        </div>
      </div>
    )
  }

  return (
    <div className={s.app}>
      {/* Save banner — pops top-right when saving/saved/error */}
      {saveStatus === 'saving' && <div className={`${s.saveBanner} ${s.saveBannerSaving}`}>⏳ Guardando…</div>}
      {saveStatus === 'saved'  && <div className={`${s.saveBanner} ${s.saveBannerSaved}`} key="saved-banner">✓ Guardado</div>}
      {saveStatus === 'error'  && <div className={`${s.saveBanner} ${s.saveBannerError}`}>⚠️ Error al guardar</div>}

      {/* Toast */}
      {toast && (
        <div className={s.toast}
          style={{ borderColor: toast.color + '55', color: toast.color }}>
          {toast.msg}
        </div>
      )}

      {/* Quick Update Modal */}
      {showQuick && (
        <div className={s.modalBackdrop} onClick={() => setShowQuick(false)}>
          <div className={s.modalCard} onClick={e => e.stopPropagation()}>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>✏️ ACTUALIZACIÓN RÁPIDA</div>
                <div className={s.modalSub}>Pega o escribe los números que quieres actualizar</div>
              </div>
              <button onClick={() => setShowQuick(false)} className={s.modalClose}>×</button>
            </div>

            <textarea value={quickText} onChange={e => setQuickText(e.target.value)}
              placeholder="Ej: 1, 3, 4-7, 10, 15-20"
              className={s.textarea} />

            <div className={s.modalHint}>
              💡 Acepta comas, espacios o saltos de línea. Rangos con "-".
              {quickText && <span className={s.modalHintMatch}>→ {matchedCards.length} cartas coinciden</span>}
            </div>

            <div className={s.actionGrid}>
              {[
                { v:'have',      l:'✅ Tengo',    cls: s.actionBtnActiveHave },
                { v:'duplicate', l:'🔄 Repetida', cls: s.actionBtnActiveDup },
                { v:'missing',   l:'❌ Falta',    cls: s.actionBtnActiveMiss },
              ].map(b => (
                <button key={b.v} onClick={() => setQuickAction(b.v)}
                  className={`${s.actionBtn} ${quickAction === b.v ? b.cls : ''}`}>
                  {b.l}
                </button>
              ))}
            </div>

            {matchedCards.length > 0 && matchedCards.length <= 20 && (
              <div className={s.matchPreview}>
                {matchedCards.map(c => (
                  <div key={c.id} className={s.matchPreviewRow}>
                    <span className={s.matchPreviewNum}>#{c.num}</span>
                    <span>{c.flag}</span>
                    <span className={s.matchPreviewName}>{c.name}</span>
                    <span className={s.matchPreviewTeam}>{c.team}</span>
                  </div>
                ))}
              </div>
            )}
            {matchedCards.length > 20 && (
              <div className={s.matchPreviewBulk}>📋 {matchedCards.length} cartas afectadas</div>
            )}

            <button onClick={applyQuickUpdate} disabled={matchedCards.length === 0}
              className={`${s.applyBtn} ${matchedCards.length === 0 ? s.applyBtnDisabled : ''}`}>
              APLICAR A {matchedCards.length} CARTA{matchedCards.length !== 1 ? 'S' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showReset && (
        <div className={s.modalBackdrop} onClick={() => setShowReset(false)}>
          <div className={`${s.modalCard} ${s.modalCardDanger}`} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitleDanger}>⚠️ RESETEAR COLECCIÓN</div>
            <div className={s.modalText}>
              Esto restablece tu colección a la lista inicial. Se perderán tus cambios actuales.
            </div>
            <div className={s.modalActions}>
              <button onClick={() => setShowReset(false)} className={s.modalActionCancel}>Cancelar</button>
              <button onClick={resetToInitial} className={s.modalActionDanger}>Sí, resetear</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerRow}>
            <div className={s.brand}>
              <div className={s.brandTitle}>⚽ ADRENALYN XL</div>
              <div className={s.brandSub}>FIFA WORLD CUP 2026™ · {session.user.email}</div>
            </div>
            <div className={s.headerActions}>
              <button onClick={() => setShowReset(true)} title="Resetear" className={s.iconBtn}>⟲</button>
              <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" className={s.iconBtn}>Salir</button>
              <div className={s.pctBlock}>
                <div className={`${s.pctValue} ${stats.pct >= 100 ? s.pctValueDone : s.pctValueGoing}`}>{stats.pct}%</div>
                <div className={s.pctLabel}>DE 630</div>
              </div>
            </div>
          </div>
          <Bar pct={stats.pct} color="linear-gradient(90deg,#15803D,#4ADE80)" h={8} />
          <div className={s.summaryRow}>
            <span className={s.sumHave}>✅ {stats.have}</span>
            <span className={s.sumDup}>🔄 {stats.dup}</span>
            <span className={s.sumMiss}>❌ {stats.miss}</span>
            <span className={s.sumMom}>💎 {momStats.have}/3</span>
            <span className={s.sumTotal}>630 + 3 Momentum</span>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          {[
            { id:'dashboard',   i:'📊', l:'Dashboard' },
            { id:'teams',       i:'🌍', l:'Equipos' },
            { id:'cards',       i:'🃏', l:'Cartas' },
            { id:'marketplace', i:'🤝', l:'Marketplace', b: stats.dup },
            { id:'profile',     i:'👤', l:'Perfil' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelTeam(null) }}
              className={`${s.navBtn} ${tab === t.id ? s.navBtnActive : ''}`}>
              <span className={s.navIcon}>{t.i}</span>
              <span className={s.navLabel}>{t.l}</span>
              {t.b > 0 && <span className={s.navBadge}>{t.b}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className={s.main}>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className={s.fade}>
            <div className={s.statsGrid}>
              {[
                { l:'Total',     v:630,         c:'#60A5FA', e:'📦' },
                { l:'Tengo',     v:stats.have,  c:'#4ADE80', e:'✅' },
                { l:'Faltan',    v:stats.miss,  c:'#F87171', e:'❌' },
                { l:'Repetidas', v:stats.dup,   c:'#F59E0B', e:'🔄' },
              ].map(stat => (
                <div key={stat.l} className={s.statCard}>
                  <div className={s.statEmoji}>{stat.e}</div>
                  <div className={s.statValue} style={{ color: stat.c }}>{stat.v}</div>
                  <div className={s.statLabel}>{stat.l}</div>
                </div>
              ))}
            </div>

            <div onClick={() => setShowQuick(true)} className={s.quickCta} style={{ cursor:'pointer' }}>
              <div>
                <div className={s.quickCtaTitle}>✏️ ACTUALIZACIÓN RÁPIDA</div>
                <div className={s.quickCtaSub}>Pega varios números en bulk · Ej: "1, 3, 5-10"</div>
              </div>
              <div className={s.quickCtaArrow}>→</div>
            </div>

            <div className={s.dashboardCols}>
              <div className={s.panel}>
                <div className={s.panelTitle}>POR TIPO</div>
                {Object.entries(TM).filter(([t]) => t !== 'Momentum').map(([type, m]) => {
                  const tc = ALL_CARDS.filter(c => c.type === type)
                  const h  = tc.filter(c => gs(c.id) !== 'missing').length
                  const p  = tc.length ? Math.round(h / tc.length * 100) : 0
                  return (
                    <div key={type} className={s.typeRow}>
                      <div className={s.typeRowHeader}>
                        <span className={s.typeRowLabel} style={{ color: m.c }}>{m.e} {m.l}</span>
                        <span className={s.typeRowCount}>{h}/{tc.length}</span>
                      </div>
                      <Bar pct={p} color={m.c} h={5} />
                    </div>
                  )
                })}
              </div>

              <div className={s.panelStack}>
                <div className={s.panel}>
                  <div className={s.panelTitle}>CONFEDERACIÓN</div>
                  {['CONMEBOL','UEFA','CONCACAF','CAF','AFC','OFC'].map(cf => {
                    const ct = TEAMS_LIST.filter(t => t.conf === cf)
                    const cc = ALL_CARDS.filter(c => ct.some(t => t.name === c.team))
                    const h  = cc.filter(c => gs(c.id) !== 'missing').length
                    const p  = cc.length ? Math.round(h / cc.length * 100) : 0
                    if (!cc.length) return null
                    return (
                      <div key={cf} className={s.confRow}>
                        <div className={s.confRowHeader}>
                          <span className={s.confLabel} style={{ color: CC[cf] }}>{cf}</span>
                          <span className={s.confPct}>{p}%</span>
                        </div>
                        <Bar pct={p} color={CC[cf]} h={7} />
                      </div>
                    )
                  })}
                </div>

                <div className={s.rarePanel}>
                  <div className={s.rareTitle}>🥇 RARAS / ULTRA RARAS</div>
                  {['Golden Baller','Eternos 22','Official Emblem'].map(type => {
                    const tc = ALL_CARDS.filter(c => c.type === type)
                    const h  = tc.filter(c => gs(c.id) !== 'missing').length
                    return (
                      <div key={type} className={s.rareRow}>
                        <span className={s.rareRowName}>{TM[type]?.e} {TM[type]?.l}</span>
                        <span className={`${s.rareRowValue} ${h === tc.length ? s.rareRowComplete : s.rareRowGoing}`}>
                          {h}/{tc.length}
                        </span>
                      </div>
                    )
                  })}

                  <div className={s.momentumWrap}>
                    <div className={s.momentumLabel}>💎 MOMENTUM</div>
                    {MOMENTUM.map((p, i) => {
                      const mc = ALL_CARDS.find(c => c.id === `MOM-${i}`)
                      const status = gs(mc.id)
                      const on = status !== 'missing'
                      return (
                        <div key={i} onClick={() => toggle(mc.id)}
                          className={`${s.momentumRow} ${on ? s.momentumRowOn : ''}`}
                          style={{ cursor: 'pointer' }}>
                          <span>{p.flag}</span>
                          <span className={`${s.momentumName} ${on ? s.momentumNameOn : ''}`}>{p.name}</span>
                          <div className={s.momentumDot} style={{
                            background: status === 'have' ? '#A855F7'
                                       : status === 'duplicate' ? '#F59E0B'
                                       : '#4C1D95'
                          }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className={s.missingTeams}>
              <div className={s.missingTeamsTitle}>📌 EQUIPOS CON MÁS FALTANTES</div>
              <div className={s.missingTeamsGrid}>
                {teamStats.sort((a,b) => (b.tot - b.have) - (a.tot - a.have)).slice(0,12).map(t => (
                  <div key={t.id} onClick={() => { setTab('teams'); setSelTeam(t.id) }}
                    className={s.missingTeamCard} style={{ cursor:'pointer' }}>
                    <span className={s.missingTeamFlag}>{t.flag}</span>
                    <div className={s.missingTeamBody}>
                      <div className={s.missingTeamName}>{t.name}</div>
                      <div className={s.missingTeamCount}>Faltan {t.tot - t.have}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Teams grid */}
        {tab === 'teams' && !selTeam && (
          <div className={`${s.fade} ${s.teamsGrid}`}>
            {teamStats.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
              <div key={t.id} onClick={() => setSelTeam(t.id)}
                className={`${s.teamCard} ${t.pct === 100 ? s.teamCardComplete : ''}`}
                style={{ cursor:'pointer' }}>
                <div className={s.teamFlag}>{t.flag}</div>
                <div className={s.teamName}>{t.name}</div>
                <div className={s.teamConf} style={{ color: CC[t.conf] || '#64748B' }}>{t.conf}</div>
                <Bar pct={t.pct} color={t.pct === 100 ? '#22C55E' : '#60A5FA'} h={5} />
                <div className={`${s.teamScore} ${t.pct === 100 ? s.teamScoreDone : ''}`}>{t.have}/{t.tot}</div>
                {t.pct === 100 && <div className={s.teamDoneBadge}>✨ Completo</div>}
              </div>
            ))}
          </div>
        )}

        {/* Team detail */}
        {tab === 'teams' && selTeam && (() => {
          const td = TEAM_DATA.find(t => t[0] === selTeam)
          if (!td) return null
          const [,name,flag,conf] = td
          const tc = ALL_CARDS.filter(c => c.team === name)
          const hv = tc.filter(c => gs(c.id) !== 'missing').length
          const byType = Object.keys(TM)
            .map(type => ({ type, cards: tc.filter(c => c.type === type) }))
            .filter(g => g.cards.length > 0)
          return (
            <div className={s.fade}>
              <button onClick={() => setSelTeam(null)} className={s.backBtn}>← Volver</button>
              <div className={s.teamHeader}>
                <div className={s.teamHeaderFlag}>{flag}</div>
                <div className={s.teamHeaderBody}>
                  <h2 className={s.teamHeaderName}>{name}</h2>
                  <div className={s.teamHeaderConf} style={{ color: CC[conf] || '#64748B' }}>{conf}</div>
                  <Bar pct={Math.round(hv/tc.length*100)} color="#60A5FA" h={8} />
                  <div className={s.teamHeaderCount}>{hv}/{tc.length} · {Math.round(hv/tc.length*100)}%</div>
                </div>
              </div>
              {byType.map(({ type, cards }) => (
                <div key={type} className={s.typeGroup}>
                  <div className={s.typeGroupHeader} style={{ color: TM[type]?.c || '#64748B' }}>
                    {TM[type]?.e} {TM[type]?.l?.toUpperCase()} ({cards.filter(c => gs(c.id) !== 'missing').length}/{cards.length})
                  </div>
                  <div className={s.pillGrid}>
                    {cards.map(c => <Pill key={c.id} card={c} />)}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Cards browser */}
        {tab === 'cards' && (
          <div className={s.fade}>
            <div className={s.filtersRow}>
              <input placeholder="🔍 Jugador, equipo o número…" value={q} onChange={e => setQ(e.target.value)}
                className={s.searchInput} />
              {[
                { val:fSt,   set:setFSt,   opts:[['all','Todos los estados'],['missing','❌ Faltan'],['have','✅ Tengo'],['duplicate','🔄 Repetidas']] },
                { val:fType, set:setFType, opts:[['all','Todos los tipos'], ...Object.entries(TM).map(([t,m]) => [t, `${m.e} ${m.l}`])] },
                { val:fTeam, set:setFTeam, opts:[['all','Todos los equipos'], ...[...new Set(ALL_CARDS.map(c => c.team))].sort().map(t => [t,t])] },
              ].map((f, i) => (
                <select key={i} value={f.val} onChange={e => f.set(e.target.value)} className={s.select}>
                  {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>
            <div className={s.filterHint}>{filtered.length} cartas · toca para cambiar estado</div>
            <div className={s.cardsGrid}>
              {filtered.slice(0, 420).map(c => <Pill key={c.id} card={c} />)}
            </div>
            {filtered.length > 420 && (
              <div className={s.moreHint}>Mostrando 420 de {filtered.length} · Usa filtros para refinar</div>
            )}
          </div>
        )}

        {/* Marketplace */}
        {tab === 'marketplace' && (
          <Marketplace
            session={session}
            myCol={col}
            myProfile={myProfile}
            onGoToProfile={() => setTab('profile')}
            flash={flash}
          />
        )}

        {/* Profile */}
        {tab === 'profile' && <Profile session={session} onSaved={p => setMyProfile(p)} />}
      </main>

      {/* Floating Quick Update Button */}
      <button onClick={() => setShowQuick(true)} className={s.fab}>
        <span>✏️</span><span className={s.fabLabel}>ACTUALIZAR</span>
      </button>
    </div>
  )
}
