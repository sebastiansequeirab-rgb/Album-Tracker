import { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { MOMENTUM, ALBUM_CONFIG, ALBUM_ADRENALYN, ALBUM_TYPES } from '../data'
import {
  ensureMyProfile, loadUnreadCount, subscribeToInbox,
  recordTradeHistory, updateTradeRequestStatus,
} from '../lib/marketplace'
import { buildShareMessage, copyShareMessage, whatsappHref } from '../lib/shareMessage'
import { useLocalStorageState } from '../lib/useLocalStorageState'
import AlbumSwitcher from './AlbumSwitcher'
import Flag from './Flag'
import Marketplace from './Marketplace'
import Profile from './Profile'
import DashboardPage from './pages/DashboardPage'
import CardsPage from './pages/CardsPage'
import ProgressBar from './ui/ProgressBar'
import QuickUpdateModal from './QuickUpdateModal'
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
const IconCards = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="6"  width="13" height="15" rx="1.5" />
    <path d="M8 6V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 20 4.5v13a1.5 1.5 0 0 1-1.5 1.5H16" />
  </svg>
)
const IconChat = (p) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
  // extras[id] = N significa "tengo N repetidas EXTRA" (N >= 0).
  // Total copias = 1 (have) + 1 (duplicate base) + N (extras) = 2 + N cuando
  // status === 'duplicate'. Solo aplicable a status === 'duplicate'.
  const [extras,    setExtras]    = useState({})
  const MAX_EXTRAS = 2   // cap: hasta 3 dups (×2, ×3, ×4). Después loop a missing.

  // Si la URL tiene ?openUser=<id>, abrimos directo el Marketplace > drill-down.
  const initialOpenUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    try { return new URL(window.location.href).searchParams.get('openUser') } catch { return null }
  }, [])
  const [tab,       setTab]       = useLocalStorageState(
    'adrenalyn:lastTab',
    'dashboard',
    (v) => ['dashboard','cards','marketplace','chat','profile'].includes(v)
  )
  // Override inicial si llegamos vía link público.
  useEffect(() => {
    if (initialOpenUser && tab !== 'marketplace') setTab('marketplace')
    // limpia el query para que un refresh no vuelva a abrirlo
    if (initialOpenUser && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('openUser')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al cambiar de tab, scroll al top — antes el chat se abría pegado abajo
  // si venías scrolleado desde otra tab. Aplicamos múltiples veces para
  // override los efectos de mount de los childs (ChatPanel, Marketplace).
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo(0, 0)
    const t1 = setTimeout(() => window.scrollTo(0, 0), 0)
    const t2 = setTimeout(() => window.scrollTo(0, 0), 120)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [tab])
  const [fType,     setFType]     = useState('all')
  const [fSt,       setFSt]       = useState('all')
  // fTeam ahora es array — vacío = todos, sino lista de team names a incluir.
  const [fTeam,     setFTeam]     = useState([])
  const [q,         setQ]         = useState('')
  const [selTeam,   setSelTeam]   = useState(null)
  const [loaded,    setLoaded]    = useState(false)
  const [saveStatus,setSaveStatus]= useState('idle')
  const [toast,     setToast]     = useState(null)
  const [showQuickTrade, setShowQuickTrade] = useState(false)
  const [quickTradePrefill, setQuickTradePrefill] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [myProfile, setMyProfile] = useState(null)
  const [unread,    setUnread]    = useState(0)
  const [headerCompact, setHeaderCompact] = useState(false)

  // Header dinámico: colapsa en scroll-down (>72px), expande en scroll-up
  // o cerca del top. Threshold con histéresis para evitar flicker.
  useEffect(() => {
    let lastY = window.scrollY
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const dy = y - lastY
        if (y < 24) setHeaderCompact(false)
        else if (dy > 4 && y > 72) setHeaderCompact(true)
        else if (dy < -4) setHeaderCompact(false)
        lastY = y
        raf = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

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
    setExtras({})

    const load = async () => {
      const { data, error } = await supabase
        .from(cfg.table)
        .select('data, extras')
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
        setExtras({})
        const { error: seedErr } = await supabase
          .from(cfg.table)
          .upsert({ user_id: session.user.id, data: init, extras: {} }, { onConflict: 'user_id' })
        if (seedErr) {
          console.error('Initial seed error:', seedErr)
          if (await handleAuthError(seedErr)) return
        }
      } else {
        setCol(data.data)
        setExtras(data.extras || {})
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

  const save = async (newCol, newExtras = null) => {
    const ex = newExtras !== null ? newExtras : extras
    if (saveRef.current.inFlight) {
      saveRef.current.pending = { col: newCol, extras: ex }
      return
    }
    saveRef.current.inFlight = true
    setSaveStatus('saving')

    const { error } = await supabase
      .from(cfg.table)
      .upsert({ user_id: session.user.id, data: newCol, extras: ex }, { onConflict: 'user_id' })

    saveRef.current.inFlight = false

    if (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      if (await handleAuthError(error)) return
      const delay = Math.min(8000, 1000 * Math.pow(2, saveRef.current.retryAt++))
      const pending = saveRef.current.pending
      setTimeout(() => save(pending?.col || newCol, pending?.extras || ex), delay)
      return
    }

    saveRef.current.retryAt = 0
    if (saveRef.current.pending) {
      const next = saveRef.current.pending
      saveRef.current.pending = null
      save(next.col, next.extras)
      return
    }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(st => st === 'saved' ? 'idle' : st), 1500)
  }

  const flash = (msg, color = '#4ADE80') => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2000)
  }

  // Cycle: missing → have → duplicate(0 extras) → duplicate(1) → ... →
  // duplicate(MAX_EXTRAS) → missing (loop). MAX_EXTRAS=4 → cap en 6 copias.
  const toggle = (id) => {
    const cur = col[id] || 'missing'
    const curEx = extras[id] || 0

    let nc = col, nex = extras, nxt = cur, nxtEx = curEx
    let msg = '', clr = '#94A3B8'

    if (cur === 'missing') {
      nc = { ...col, [id]: 'have' }
      nxt = 'have'
      msg = '✅ ¡La tienes!'; clr = '#4ADE80'
    } else if (cur === 'have') {
      nc = { ...col, [id]: 'duplicate' }
      nex = { ...extras, [id]: 0 }
      nxt = 'duplicate'; nxtEx = 0
      msg = '🔄 Repetida'; clr = '#F59E0B'
    } else if (cur === 'duplicate') {
      if (curEx < MAX_EXTRAS) {
        nex = { ...extras, [id]: curEx + 1 }
        nxtEx = curEx + 1
        msg = `🔄 Repetida ×${1 + nxtEx}`; clr = '#F59E0B'
      } else {
        // Loop back a missing — limpia extras
        nc = { ...col, [id]: 'missing' }
        const _e = { ...extras }; delete _e[id]
        nex = _e
        nxt = 'missing'; nxtEx = 0
        msg = '❌ Faltante'; clr = '#64748B'
      }
    }

    setCol(nc); setExtras(nex); save(nc, nex)
    const card = ALL_ITEMS.find(c => c.id === id)
    flash(`#${card?.num} ${card?.name} — ${msg}`, clr)
  }

  // Setear cantidad exacta — usado por el numeric editor (modo "fix mistake").
  // qty: 0 = missing, 1 = have, 2..(2+MAX_EXTRAS) = duplicate con N-2 extras.
  const setQty = (id, qty) => {
    qty = Math.max(0, Math.min(2 + MAX_EXTRAS, Math.round(qty)))
    let nc = col, nex = extras
    if (qty === 0) {
      nc = { ...col, [id]: 'missing' }
      const _e = { ...extras }; delete _e[id]
      nex = _e
    } else if (qty === 1) {
      nc = { ...col, [id]: 'have' }
      const _e = { ...extras }; delete _e[id]
      nex = _e
    } else {
      nc = { ...col, [id]: 'duplicate' }
      nex = { ...extras, [id]: qty - 2 }
    }
    setCol(nc); setExtras(nex); save(nc, nex)
  }

  const gs = id => col[id] || 'missing'
  const gx = id => extras[id] || 0   // extras count — solo significativo si gs(id)==='duplicate'

  // Bulk update — UNA sola call a save() para preservar coalescing.
  // Reusable: TeamDrawer (commit 4), CardsPage bulk action bar (commit 5).
  // Cuando seteamos a missing/have, limpiamos extras (no aplica). Cuando
  // seteamos a duplicate, dejamos extras como esté (no resetea contador).
  const bulkUpdate = (ids, status) => {
    if (!ids || ids.length === 0) return
    const nc = { ...col }
    const nex = { ...extras }
    let changed = 0
    ids.forEach(id => {
      if (nc[id] !== status) { nc[id] = status; changed++ }
      if (status === 'missing' || status === 'have') delete nex[id]
    })
    if (changed === 0) return
    setCol(nc); setExtras(nex); save(nc, nex)
    const lbl = { have: '✅ Tengo', duplicate: '🔄 Repetidas', missing: '❌ Faltantes' }
    const clr = { have: '#4ADE80', duplicate: '#F59E0B', missing: '#94A3B8' }
    flash(`✨ ${changed} carta${changed !== 1 ? 's' : ''} → ${lbl[status] || status}`, clr[status] || '#94A3B8')
  }

  // Registrar movimiento — actualiza colección y registra el trade en history.
  // Cuando dás una repetida (left + status='duplicate'), decrementamos extras
  // antes de bajar de duplicate→have (preserva el conteo si tenías N>1 dups).
  const applyQuickTrade = async ({ entered = [], left = [], note, partnerId }) => {
    const nc = { ...col }
    const nex = { ...extras }
    let changed = 0
    for (const id of entered) {
      if (nc[id] === 'missing' || !nc[id]) { nc[id] = 'have'; changed++ }
    }
    for (const id of left) {
      const cur = nc[id] || 'missing'
      if (cur === 'duplicate') {
        const ex = nex[id] || 0
        if (ex > 0) {
          nex[id] = ex - 1   // sigue duplicate, una menos
        } else {
          nc[id] = 'have'
          delete nex[id]
        }
        changed++
      } else if (cur === 'have') {
        nc[id] = 'missing'; changed++
      }
    }
    if (changed) {
      setCol(nc); setExtras(nex)
      await save(nc, nex)
    }
    try {
      await recordTradeHistory({
        user_id: session.user.id,
        partner_id: partnerId || null,
        album_type: albumType,
        received_ids: entered,
        given_ids: left,
        note: note || null,
      })
    } catch (err) {
      console.warn('trade_history insert failed:', err)
    }
    const tradeId = quickTradePrefill?.tradeId
    if (tradeId) {
      try { await updateTradeRequestStatus(tradeId, 'completed') }
      catch (err) { console.warn('trade status update failed:', err) }
    }
    flash(`Intercambio registrado · ${entered.length} entró · ${left.length} salió`, '#4ADE80')
  }

  const openQuickTradeWithPrefill = (prefill) => {
    setQuickTradePrefill(prefill || null)
    setShowQuickTrade(true)
  }

  const resetToInitial = async () => {
    const init = cfg.buildInitial()
    setCol(init); setExtras({}); await save(init, {})
    flash('🔄 Restablecido al estado inicial', '#60A5FA')
    setShowReset(false)
  }

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
    if (fTeam.length > 0 && !fTeam.includes(c.team)) return false
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

      {/* Registrar movimiento (entró/salió) */}
      <QuickUpdateModal
        open={showQuickTrade}
        onClose={() => { setShowQuickTrade(false); setQuickTradePrefill(null) }}
        cards={ALL_ITEMS}
        col={col}
        prefill={quickTradePrefill}
        onApply={applyQuickTrade}
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

      {/* Header dinámico — colapsa en scroll */}
      <header className={`${s.header} ${headerCompact ? s.headerCompact : ''}`}>
        <div className={s.headerInner}>
          <div className={s.headerRow}>
            <div className={s.brand}>
              <div className={s.brandTitle} style={{ color: cfg.accent }}>
                {cfg.label.toUpperCase()}
              </div>
              <div className={s.brandSub}>{cfg.subtitle}</div>
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
                <div className={`${s.pctValue} ${stats.pct >= 100 ? s.pctValueDone : s.pctValueGoing}`} style={{ color: stats.pct >= 100 ? cfg.accent : undefined }}>{stats.have}</div>
                <div className={s.pctLabel}>DE {cfg.mainCount}</div>
              </div>
            </div>
          </div>

          {/* TU LINK row — solo en Home (dashboard). En las otras tabs se libera
              el espacio para que el banner sea más compacto. */}
          {tab === 'dashboard' && myProfile?.slug && myProfile?.marketplace_visible && (() => {
            const buildMsg = () => buildShareMessage({
              profile: myProfile,
              items: ALL_ITEMS,
              col,
              extras,
              albumLabel: cfg.label === 'Álbum de Stickers' ? 'Álbum Panini WC 2026' : cfg.label,
              totalLabel: cfg.label === 'Álbum de Stickers' ? 'stickers' : 'cartas',
            })
            const url = `${window.location.origin}/u/${myProfile.slug}`
            return (
              <div className={s.brandShareRow}>
                <span className={s.brandShareLabel}>TU LINK</span>
                <code className={s.brandShareUrl}>{url}</code>
                <button
                  type="button"
                  onClick={() => {
                    const msg = buildMsg()
                    copyShareMessage(msg).then(
                      () => flash('📋 Mensaje copiado · pegalo en WhatsApp', '#FCD34D'),
                      () => flash('No se pudo copiar', '#F87171')
                    )
                  }}
                  className={s.brandShareBtn}
                  title="Copia un mensaje completo con tu lista para pegarlo en WhatsApp"
                >
                  Copiar
                </button>
                <a
                  href={whatsappHref(buildMsg())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.brandShareWa}
                  title="Abrir WhatsApp con el mensaje listo"
                >
                  WhatsApp
                </a>
              </div>
            )
          })()}
        </div>
      </header>

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          {[
            { id:'dashboard',   I: IconDash,     l:'Home' },
            { id:'cards',       I: IconCards,    l:'Cartas' },
            { id:'marketplace', I: IconExchange, l:'Mercado' },
            { id:'chat',        I: IconChat,     l:'Chat',    b: unread > 0 ? unread : 0, dot: unread > 0 },
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
                setShowQuickTrade={setShowQuickTrade}
                setTab={setTab}
                setFTeam={setFTeam}
                setSelTeam={setSelTeam}
                albumType={albumType}
                col={col}
                segments={segments}
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
                gx={gx}
                toggle={toggle}
                setQty={setQty}
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
              initialOpenUserId={initialOpenUser}
              onGoToProfile={() => setTab('profile')}
              onGoToChat={() => setTab('chat')}
              onUnreadChange={() => {
                loadUnreadCount(session.user.id).then(setUnread).catch(() => {})
              }}
              onCompleteTrade={(trade, partner) => {
                const isIncoming = trade.target_id === session.user.id
                const enteredIds = isIncoming ? trade.offered_ids : trade.wanted_ids
                const leftIds    = isIncoming ? trade.wanted_ids  : trade.offered_ids
                openQuickTradeWithPrefill({
                  enteredIds: enteredIds || [],
                  leftIds: leftIds || [],
                  partnerId: isIncoming ? trade.initiator_id : trade.target_id,
                  partnerName: partner?.display_name || null,
                  tradeId: trade.id,
                })
              }}
              flash={flash}
            />
          )}

          {tab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Marketplace
                key="chat-marketplace"
                session={session}
                albumType={albumType}
                myCol={col}
                myProfile={myProfile}
                onGoToProfile={() => setTab('profile')}
                onGoToChat={() => {}}
                onUnreadChange={() => {
                  loadUnreadCount(session.user.id).then(setUnread).catch(() => {})
                }}
                forceSub="messages"
                flash={flash}
              />
            </motion.div>
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

    </div>
  )
}
