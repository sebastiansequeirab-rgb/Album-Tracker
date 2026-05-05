import { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { parseNumberList, MOMENTUM, ALBUM_CONFIG, ALBUM_ADRENALYN, ALBUM_TYPES } from '../data'
import { ensureMyProfile, loadUnreadCount, subscribeToInbox } from '../lib/marketplace'
import AlbumSwitcher from './AlbumSwitcher'
import Flag from './Flag'
import Marketplace from './Marketplace'
import Profile from './Profile'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import CardsPage from './pages/CardsPage'
import ProgressBar from './ui/ProgressBar'
import BulkUpdateModal from './ui/BulkUpdateModal'
import s from './Tracker.module.css'

const IconAlbum = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
const IconBolt = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconReset = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)
const IconDash = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3"  width="7" height="7" />
    <rect x="14" y="3"  width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
)
const IconGlobe = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconCards = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="6"  width="13" height="15" rx="1.5" />
    <path d="M8 6V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 20 4.5v13a1.5 1.5 0 0 1-1.5 1.5H16" />
  </svg>
)
const IconExchange = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
)
const IconUser = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconPencil = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)

export default function Tracker({
  session,
  albumType = ALBUM_ADRENALYN,
  activeAlbums = ALBUM_TYPES,
  onSwitchAlbum,
  onAlbumsChanged,
}) {
  const cfg = ALBUM_CONFIG[albumType]
  const ALL_ITEMS = useMemo(() => cfg.buildItems(), [albumType])
  const { TM, CC, ST } = cfg
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
  const [unread,    setUnread]    = useState(0)

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
    setLoaded(false)
    setCol({})

    const load = async () => {
      const { data, error } = await supabase
        .from(cfg.table)
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
        const init = cfg.buildInitial()
        setCol(init)
        const { error: seedErr } = await supabase
          .from(cfg.table)
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
  }, [session, albumType, cfg.table, cfg.buildInitial])

  // Unread chat badge — load + realtime subscription (independiente de albumType)
  useEffect(() => {
    let cancelled = false
    const refreshUnread = async () => {
      try {
        const n = await loadUnreadCount(session.user.id)
        if (!cancelled) setUnread(n)
      } catch { /* sin-op */ }
    }
    refreshUnread()
    const unsub = subscribeToInbox(session.user.id, () => refreshUnread())
    return () => { cancelled = true; unsub?.() }
  }, [session.user.id])

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
      .from(cfg.table)
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
    const card = ALL_ITEMS.find(c => c.id === id)
    const msgs = { have:'✅ ¡La tienes!', duplicate:'🔄 Repetida', missing:'❌ Faltante' }
    const clrs = { have:'#4ADE80', duplicate:'#F59E0B', missing:'#64748B' }
    flash(`#${card?.num} ${card?.name} — ${msgs[nxt]}`, clrs[nxt])
  }

  const gs = id => col[id] || 'missing'

  // Bulk update — UNA sola call a save() para preservar coalescing.
  // Reusable: TeamDrawer (commit 4), CardsPage bulk action bar (commit 5).
  const bulkUpdate = (ids, status) => {
    if (!ids || ids.length === 0) return
    const nc = { ...col }
    let changed = 0
    ids.forEach(id => {
      if (nc[id] !== status) { nc[id] = status; changed++ }
    })
    if (changed === 0) return
    setCol(nc); save(nc)
    const lbl = { have: '✅ Tengo', duplicate: '🔄 Repetidas', missing: '❌ Faltantes' }
    const clr = { have: '#4ADE80', duplicate: '#F59E0B', missing: '#94A3B8' }
    flash(`✨ ${changed} carta${changed !== 1 ? 's' : ''} → ${lbl[status] || status}`, clr[status] || '#94A3B8')
  }

  const applyQuickUpdate = () => {
    const numbers = parseNumberList(quickText)
    if (!numbers.length) { flash('⚠️ No hay números válidos', '#F87171'); return }
    const nc = { ...col }
    let count = 0
    ALL_ITEMS.forEach(card => {
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
    const init = cfg.buildInitial()
    setCol(init); await save(init)
    flash('🔄 Restablecido al estado inicial', '#60A5FA')
    setShowReset(false)
  }

  const matchedCards = useMemo(() => {
    if (!quickText) return []
    const nums = parseNumberList(quickText)
    return ALL_ITEMS.filter(c => typeof c.num === 'number' && nums.includes(c.num))
  }, [quickText])

  const mainCards = useMemo(
    () => cfg.showMomentum ? ALL_ITEMS.filter(c => c.type !== 'Momentum') : ALL_ITEMS,
    [ALL_ITEMS, cfg.showMomentum]
  )
  const stats = useMemo(() => {
    const have = mainCards.filter(c => gs(c.id) === 'have').length
    const dup  = mainCards.filter(c => gs(c.id) === 'duplicate').length
    const tot  = mainCards.length
    return { tot, have, dup, miss: tot - have - dup, pct: tot ? Math.round((have + dup) / tot * 100) : 0 }
  }, [col, mainCards])

  const momStats = useMemo(() => {
    if (!cfg.showMomentum) return { have: 0, tot: 0 }
    const mc = ALL_ITEMS.filter(c => c.type === 'Momentum')
    return { have: mc.filter(c => gs(c.id) !== 'missing').length, tot: mc.length }
  }, [col, ALL_ITEMS, cfg.showMomentum])

  const teamStats = useMemo(() => cfg.teams.map(t => {
    const tc = ALL_ITEMS.filter(c => c.team === t.name)
    const h  = tc.filter(c => gs(c.id) !== 'missing').length
    return { ...t, tot: tc.length, have: h, pct: tc.length ? Math.round(h / tc.length * 100) : 0 }
  }), [col, ALL_ITEMS, cfg.teams])

  const segments = useMemo(() =>
    Object.entries(TM)
      .filter(([t]) => t !== 'Momentum')
      .map(([type, m]) => {
        const items = ALL_ITEMS.filter(c => c.type === type)
        return { name: type, label: m.l, color: m.c, total: items.length,
                 have: items.filter(c => (col[c.id] || 'missing') !== 'missing').length }
      })
      .filter(seg => seg.total > 0),
  [col, ALL_ITEMS, TM])

  const filtered = useMemo(() => ALL_ITEMS.filter(c => {
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
      <BulkUpdateModal
        open={showQuick}
        onClose={() => setShowQuick(false)}
        quickText={quickText}
        setQuickText={setQuickText}
        quickAction={quickAction}
        setQuickAction={setQuickAction}
        matchedCards={matchedCards}
        onApply={applyQuickUpdate}
      />

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
              <div className={s.brandTitle} style={{ color: cfg.accent }}>
                <span className={s.brandIcon} aria-hidden="true">
                  {albumType === ALBUM_ADRENALYN ? <IconBolt /> : <IconAlbum />}
                </span>
                {cfg.label.toUpperCase()}
              </div>
              <div className={s.brandSub}>{cfg.subtitle} · {session.user.email}</div>
            </div>
            <div className={s.headerActions}>
              {activeAlbums.length >= 2 && onSwitchAlbum && (
                <AlbumSwitcher
                  albumType={albumType}
                  activeAlbums={activeAlbums}
                  onChange={onSwitchAlbum}
                />
              )}
              <button onClick={() => setShowReset(true)} title="Resetear" className={s.iconBtn} aria-label="Resetear">
                <IconReset />
              </button>
              <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión" className={`${s.iconBtn} ${s.iconBtnText}`}>Salir</button>
              <div className={s.pctBlock}>
                <div className={`${s.pctValue} ${stats.pct >= 100 ? s.pctValueDone : s.pctValueGoing}`} style={{ color: stats.pct >= 100 ? cfg.accent : undefined }}>{stats.pct}%</div>
                <div className={s.pctLabel}>DE {cfg.mainCount}</div>
              </div>
            </div>
          </div>
          <div className={s.summaryRow}>
            <span className={s.sumHave}>{stats.have} <span className={s.sumLabel}>tengo</span></span>
            <span className={s.sumDup}>{stats.dup} <span className={s.sumLabel}>repetidas</span></span>
            <span className={s.sumMiss}>{stats.miss} <span className={s.sumLabel}>faltan</span></span>
            {cfg.showMomentum && <span className={s.sumMom}>{momStats.have}/{momStats.tot} <span className={s.sumLabel}>momentum</span></span>}
            {cfg.extraCount > 0 && (
              <span className={s.sumTotal}>+ {cfg.extraCount} Momentum</span>
            )}
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          {[
            { id:'dashboard',   I: IconDash,     l:'Home' },
            { id:'teams',       I: IconGlobe,    l:'Equipos' },
            { id:'cards',       I: IconCards,    l:'Cartas' },
            { id:'marketplace', I: IconExchange, l:'Marketplace', b: unread > 0 ? unread : stats.dup, dot: unread > 0 },
            { id:'profile',     I: IconUser,     l:'Perfil' },
          ].map(t => {
            const Icon = t.I
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setSelTeam(null) }}
                className={`${s.navBtn} ${tab === t.id ? s.navBtnActive : ''}`}>
                <span className={s.navIcon} aria-hidden="true"><Icon /></span>
                <span className={s.navLabel}>{t.l}</span>
                {t.b > 0 && <span className={`${s.navBadge} ${t.dot ? s.navBadgeAlert : ''}`}>{t.b}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      <main className={s.main}>
        <AnimatePresence mode="wait" initial={false}>
          {tab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <DashboardPage
                cfg={cfg}
                stats={stats}
                momStats={momStats}
                teamStats={teamStats}
                ALL_ITEMS={ALL_ITEMS}
                TM={TM}
                MOMENTUM={MOMENTUM}
                gs={gs}
                toggle={toggle}
                setShowQuick={setShowQuick}
                setTab={setTab}
                setSelTeam={setSelTeam}
                segments={segments}
              />
            </motion.div>
          )}

          {tab === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <TeamsPage
                teamStats={teamStats}
                ALL_ITEMS={ALL_ITEMS}
                TM={TM}
                gs={gs}
                toggle={toggle}
                bulkUpdate={bulkUpdate}
                selTeam={selTeam}
                setSelTeam={setSelTeam}
              />
            </motion.div>
          )}

          {tab === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <CardsPage
                filtered={filtered}
                ALL_ITEMS={ALL_ITEMS}
                TM={TM}
                q={q}         setQ={setQ}
                fSt={fSt}     setFSt={setFSt}
                fType={fType} setFType={setFType}
                fTeam={fTeam} setFTeam={setFTeam}
                gs={gs}
                toggle={toggle}
                bulkUpdate={bulkUpdate}
                stats={stats}
              />
            </motion.div>
          )}

          {/* Marketplace: NO motion wrapper aquí — preservamos
              ChatPanel useLayoutEffect scrollIntoView intacto y
              evitamos doble render con su realtime + key remount. */}
          {tab === 'marketplace' && (
            <Marketplace
              key="marketplace"
              session={session}
              albumType={albumType}
              myCol={col}
              myProfile={myProfile}
              onGoToProfile={() => setTab('profile')}
              onUnreadChange={() => {
                loadUnreadCount(session.user.id).then(setUnread).catch(() => {})
              }}
              flash={flash}
            />
          )}

          {tab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Profile
                session={session}
                onSaved={p => setMyProfile(p)}
                onAlbumsChanged={onAlbumsChanged}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Quick Update Button — hidden on Home (has inline CTA) */}
      {tab !== 'dashboard' && (
        <button onClick={() => setShowQuick(true)} className={s.fab} aria-label="Actualización rápida">
          <span className={s.fabIcon} aria-hidden="true"><IconPencil /></span>
          <span className={s.fabLabel}>ACTUALIZAR</span>
        </button>
      )}
    </div>
  )
}
