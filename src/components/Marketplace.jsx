import { useState, useEffect, useMemo } from 'react'
import {
  loadVisibleProfiles, loadProfile,
  loadMyFavorites, addFavorite, removeFavorite,
  loadMyTradeRequests, updateTradeRequestStatus, createTradeRequest,
  loadActivePublicListings, closePublicListing, deletePublicListing, completePublicListing,
  sendMessage,
  computeMatches,
} from '../lib/marketplace'
import { loadAlbum, loadAlbumByUserIds } from '../lib/album'
import { ALBUM_CONFIG, ALBUM_ADRENALYN } from '../data'
import TradeRequestModal from './TradeRequestModal'
import CreatePublicListingModal from './CreatePublicListingModal'
import ChatPanel from './ChatPanel'
import TypeDonut from './ui/TypeDonut'
import Avatar from './ui/Avatar'
import { exportListPdf } from '../lib/exportPdf'
import s from './Marketplace.module.css'

/* ──────────────────────────────────────────────────────────────────────────
   SVG icons — broadcast × vault. Inline, currentColor for theming.
   Avatar emojis NOT replaced (user identity); Flag emojis NOT touched.
   ────────────────────────────────────────────────────────────────────────── */
const Svg = ({ size = 16, sw = 2, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
)
const IconGlobe   = (p) => <Svg {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></Svg>
const IconStar    = (p) => <Svg {...p}><path d="M12 2l3 7 7 .8-5.2 4.7 1.5 7.1L12 17.8 5.7 21.6 7.2 14.5 2 9.8 9 9z"/></Svg>
const IconChat    = (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>
const IconInbox   = (p) => <Svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Svg>
const IconList    = (p) => <Svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Svg>
const IconPlus    = (p) => <Svg sw={2.5} {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
const IconHandshake = (p) => <Svg {...p}><path d="M11 17l2 2a1 1 0 1 0 3-3"/><path d="M14 14l3 3a1 1 0 0 0 3-3l-7-7-3 3"/><path d="M3 7l4-4 4 4-4 4-4-4z"/><path d="M7 11l-4 4 3 3 4-4"/></Svg>
const IconCheck   = (p) => <Svg sw={2.5} {...p}><polyline points="20 6 9 17 4 12"/></Svg>
const IconX       = (p) => <Svg sw={2.5} {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>
const IconPin     = (p) => <Svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Svg>
const IconClock   = (p) => <Svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>
const IconQuote   = (p) => <Svg {...p}><path d="M3 21c3 0 7-1 7-8V5c0-1-1-2-2-2H4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/><path d="M14 21c3 0 7-1 7-8V5c0-1-1-2-2-2h-4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/></Svg>
const IconArrowUp   = (p) => <Svg sw={2.5} {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></Svg>
const IconArrowDown = (p) => <Svg sw={2.5} {...p}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></Svg>
const IconArrowLeft = (p) => <Svg sw={2.5} {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Svg>
const IconSparkle = (p) => <Svg {...p}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/><path d="M19 17l.8 2L22 19.8 19.8 20 19 22l-.8-2L16 19.8 18.2 19z"/></Svg>
const IconCopy    = (p) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Svg>
const IconBroadcast = (p) => <Svg {...p}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></Svg>
const IconCardStack = (p) => <Svg {...p}><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></Svg>
const IconSearch    = (p) => <Svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>
const IconDownload  = (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>

const StarFilled = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
       strokeWidth="1.5" strokeLinejoin="round" {...p}>
    <path d="M12 2l3 7 7 .8-5.2 4.7 1.5 7.1L12 17.8 5.7 21.6 7.2 14.5 2 9.8 9 9z"/>
  </svg>
)

/* Replicates the broadcast bracket vocab from Auth.module.css for big panels */
const Brackets = () => (
  <>
    <span className={`${s.bracket} ${s.bracketTL}`} aria-hidden />
    <span className={`${s.bracket} ${s.bracketTR}`} aria-hidden />
    <span className={`${s.bracket} ${s.bracketBL}`} aria-hidden />
    <span className={`${s.bracket} ${s.bracketBR}`} aria-hidden />
  </>
)

/* Section header: NN / TITLE / rule / link */
function SectionHead({ icon, title, count, action }) {
  return (
    <div className={s.sectionHead}>
      {icon && <span className={s.sectionIcon} aria-hidden>{icon}</span>}
      <h3 className={s.sectionTitle}>{title}</h3>
      {typeof count === 'number' && (
        <span className={s.sectionCount}>{count}</span>
      )}
      <span className={s.sectionRule} aria-hidden />
      {action}
    </div>
  )
}

export default function Marketplace({
  session,
  albumType = ALBUM_ADRENALYN,
  myCol,
  myProfile,
  onGoToProfile,
  onUnreadChange,
  onCompleteTrade,
  forceSub = null,
  initialOpenUserId = null,
  onGoToChat = null,
  flash,
}) {
  const cfg = ALBUM_CONFIG[albumType]
  const ALL_ITEMS   = useMemo(() => cfg.buildItems(), [albumType])
  const ITEMS_BY_ID = useMemo(() => Object.fromEntries(ALL_ITEMS.map(c => [c.id, c])), [ALL_ITEMS])
  const TEAMS_LIST  = cfg.teams
  const totalItems  = ALL_ITEMS.length
  const [sub,         setSub]         = useState(forceSub || 'all') // 'all' | 'search' | 'favorites' | 'messages' | 'inbox' | 'mine'
  const [profiles,    setProfiles]    = useState([])
  const [collections, setCollections] = useState({})
  const [favorites,   setFavorites]   = useState([])
  const [profilesById,setProfilesById]= useState({})
  const [loading,     setLoading]     = useState(true)
  const [selUserId,   setSelUserId]   = useState(null)
  const [selCol,      setSelCol]      = useState(null)
  const [selProfile,  setSelProfile]  = useState(null)
  const [drillTab,    setDrillTab]    = useState('theirs') // 'theirs' | 'mine'
  const [pickedTheirs,setPickedTheirs]= useState(new Set()) // ids requested from them
  const [pickedMine,  setPickedMine]  = useState(new Set()) // ids offered by me
  const [onlyMatches, setOnlyMatches] = useState(true)
  const [showTrade,    setShowTrade]    = useState(false)
  // Contexto independiente para el modal de trade — no depende de drill-down state
  // así el modal sobrevive el unmount del drill-down cuando se cierra/abre chat.
  const [tradeCtx,     setTradeCtx]     = useState(null)
  // tradeCtx = { targetProfile, offered: [], wanted: [] }
  const [tradeRequests,setTradeRequests]= useState([])
  const [listings,     setListings]     = useState([])
  const [listingProfiles, setListingProfiles] = useState({}) // user_id -> profile
  const [showCreate,   setShowCreate]   = useState(false)
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterPos, setFilterPos] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSort, setSearchSort] = useState('recent')
  const [mineTab, setMineTab] = useState('repetidas') // 'repetidas' | 'faltantes'
  const [chatCpId,     setChatCpId]     = useState(null) // counterpart id activo en chat
  const [busyAccept,   setBusyAccept]   = useState(null) // listing.id en curso

  const myId = session.user.id

  const reload = async () => {
    setLoading(true)
    try {
      const [vp, fv, tr, pl] = await Promise.all([
        loadVisibleProfiles(myId),
        loadMyFavorites(myId),
        loadMyTradeRequests(myId),
        loadActivePublicListings(albumType),
      ])
      setProfiles(vp)
      setFavorites(fv)
      setTradeRequests(tr)
      setListings(pl)
      const ids = vp.map(p => p.user_id)
      const cm  = await loadAlbumByUserIds(albumType, ids)
      setCollections(cm)
      const map = {}
      for (const p of vp) map[p.user_id] = p
      setProfilesById(map)
      // Resolver perfiles de autores de listings que no estén en visible profiles
      const listingAuthors = pl.map(l => l.user_id).filter(uid => uid !== myId && !map[uid])
      const uniqueAuthors = [...new Set(listingAuthors)]
      const authorProfiles = {}
      for (const uid of uniqueAuthors) {
        try {
          const p = await loadProfile(uid)
          if (p) authorProfiles[uid] = p
        } catch { /* skip si RLS no deja */ }
      }
      setListingProfiles({ ...map, ...authorProfiles })
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error cargando marketplace'}`, '#F87171')
    }
    setLoading(false)
  }

  useEffect(() => {
    reload()
    setSelUserId(null)
    setSelCol(null)
    setSelProfile(null)
    /* eslint-disable-next-line */
  }, [myId, albumType])

  // Si arrancamos con ?openUser=<id>, intentamos cargar el drill-down de ese
  // usuario una vez que `loading` termine.
  useEffect(() => {
    if (!initialOpenUserId || loading) return
    if (initialOpenUserId === myId) return
    onSelectUser(initialOpenUserId)
    /* eslint-disable-next-line */
  }, [initialOpenUserId, loading])

  const favoriteIdSet = useMemo(() => new Set(favorites.map(f => f.target_id)), [favorites])

  const profilesView = useMemo(() => {
    const list = profiles.map(p => {
      const matches = computeMatches(myCol, collections[p.user_id] || {})
      return { ...p, matches }
    })
    if (sub === 'favorites') return list.filter(p => favoriteIdSet.has(p.user_id))
    return list
  }, [profiles, collections, myCol, sub, favoriteIdSet])

  const searchView = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = profiles.map(p => {
      const matches = computeMatches(myCol, collections[p.user_id] || {})
      const ownCol = collections[p.user_id] || {}
      const ownDups = Object.values(ownCol).filter(v => v === 'duplicate').length
      const ownHave = Object.values(ownCol).filter(v => v === 'have' || v === 'duplicate').length
      return { ...p, matches, ownDups, ownHave, isFav: favoriteIdSet.has(p.user_id) }
    })
    const filtered = q
      ? list.filter(p => (p.display_name || '').toLowerCase().includes(q))
      : list
    const sorted = [...filtered]
    if (searchSort === 'active') {
      sorted.sort((a, b) => (b.ownDups - a.ownDups) || (b.ownHave - a.ownHave))
    } else if (searchSort === 'favorites') {
      sorted.sort((a, b) => (Number(b.isFav) - Number(a.isFav)) ||
                            (b.matches.theyHaveIWant.length - a.matches.theyHaveIWant.length))
    } else if (searchSort === 'matches') {
      sorted.sort((a, b) => b.matches.theyHaveIWant.length - a.matches.theyHaveIWant.length)
    } else {
      // recent: ya viene ordenado por updated_at desc desde loadVisibleProfiles
    }
    return sorted
  }, [profiles, collections, myCol, favoriteIdSet, searchQuery, searchSort])

  const onSelectUser = async (uid, prefill = null) => {
    setSelUserId(uid)
    setSelCol(null)
    setDrillTab('theirs')
    try {
      const [col, prof] = await Promise.all([
        collections[uid] ? Promise.resolve(collections[uid]) : loadAlbum(albumType, uid),
        profilesById[uid] ? Promise.resolve(profilesById[uid]) : loadProfile(uid),
      ])
      setSelCol(col)
      setSelProfile(prof)
      // Sin pre-selección: el usuario elige qué pedir y qué ofrecer.
      // Los matches se muestran como "★ matchea" badge para guiar la decisión.
      // Si viene `prefill` (ej: desde una listing), ahí sí pre-seleccionamos.
      setPickedTheirs(new Set(prefill?.wanted || []))
      setPickedMine(new Set(prefill?.offered || []))
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'No se pudo cargar la colección'}`, '#F87171')
      setSelUserId(null)
    }
  }

  const onToggleFavorite = async (otherId) => {
    const wasFav = favoriteIdSet.has(otherId)
    try {
      if (wasFav) {
        await removeFavorite(myId, otherId)
        setFavorites(prev => prev.filter(f => f.target_id !== otherId))
        flash?.('☆ Removido de favoritos', '#94A3B8')
      } else {
        const created = await addFavorite(myId, otherId)
        setFavorites(prev => [created, ...prev])
        flash?.('⭐ Agregado a favoritos', '#FCD34D')
      }
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error con favoritos'}`, '#F87171')
    }
  }

  const togglePickTheirs = (id) => setPickedTheirs(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const togglePickMine = (id) => setPickedMine(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Abrir modal de Proponer Trade desde drill-down (selecciones manuales)
  const openTradeModalFromDrillDown = () => {
    if (!selUserId || !selCol || !selProfile) return
    setTradeCtx({
      targetProfile: selProfile,
      targetCol:     selCol,
      offered: Array.from(pickedMine),
      wanted:  Array.from(pickedTheirs),
      meetingPoint: '',
      meetingTime:  '',
    })
    setShowTrade(true)
  }

  // Abrir modal de Contra-oferta desde un banner — pre-rellena con datos del listing
  // y carga la colección del autor on-demand para que el picker pueda mostrar
  // TODAS sus dups (no solo las del listing).
  const openTradeModalFromListing = async (listing) => {
    const author = listingProfiles[listing.user_id]
    if (!author) {
      flash?.('⚠️ No se pudo cargar el perfil del autor', '#F87171')
      return
    }
    flash?.('⏳ Cargando colección del autor…', '#94A3B8')
    let targetCol = collections[listing.user_id]
    if (!targetCol) {
      try {
        targetCol = await loadAlbum(albumType, listing.user_id)
        // Cachear para uso futuro
        setCollections(prev => ({ ...prev, [listing.user_id]: targetCol }))
      } catch (e) {
        console.error('loadAlbum error:', e)
        flash?.(`⚠️ ${e.message || 'No se pudo cargar la colección del autor'}`, '#F87171')
        return
      }
    }
    setTradeCtx({
      targetProfile: author,
      targetCol,
      // Por default, el usuario quiere todo lo que el listing ofrece
      // y ofrece todas sus dups que matchean lo que el listing busca
      offered: ALL_ITEMS
        .filter(c => myCol[c.id] === 'duplicate' && listing.wanted_ids.includes(c.id))
        .map(c => c.id),
      wanted: listing.offered_ids,
      // Pre-llenar meeting point + hora del listing (el usuario puede cambiar)
      meetingPoint: listing.meeting_point || '',
      meetingTime:  listing.meeting_time_label || '',
    })
    setShowTrade(true)
  }

  // Aceptar oferta automáticamente — crea trade con datos exactos del listing
  const acceptListing = async (listing) => {
    if (busyAccept) return
    const author = listingProfiles[listing.user_id]
    if (!author) {
      flash?.('⚠️ Perfil del autor no disponible — refrescá la página', '#F87171')
      return
    }
    setBusyAccept(listing.id)
    try {
      const created = await createTradeRequest({
        initiator_id: myId,
        target_id:    listing.user_id,
        album_type:   albumType,
        offered_ids:  listing.wanted_ids || [],   // les doy lo que pidieron
        wanted_ids:   listing.offered_ids || [],  // pido lo que ofrecen
        meeting_point:      listing.meeting_point || null,
        meeting_time_label: listing.meeting_time_label || null,
        message: '',
      })
      flash?.('✅ Trade enviado — revísalo en el tab Chat', '#4ADE80')
      const tr = await loadMyTradeRequests(myId)
      setTradeRequests(tr)
      onGoToChat?.()
    } catch (e) {
      console.error('acceptListing error:', e)
      flash?.(`⚠️ ${e?.message || 'No se pudo enviar el trade'}`, '#F87171')
    } finally {
      setBusyAccept(null)
    }
  }

  const onTradeSent = async (created) => {
    setShowTrade(false)
    setTradeCtx(null)
    try {
      const tr = await loadMyTradeRequests(myId)
      setTradeRequests(tr)
      if (created?.target_id) {
        flash?.('🤝 Trade enviado — lo verás en el tab Chat', '#4ADE80')
        onGoToChat?.()
      }
    } catch { /* sin-op */ }
  }

  const openChatWith = (otherId) => {
    if (!otherId) return
    setChatCpId(otherId)
    setSelUserId(null)
    setSelCol(null)
    setSelProfile(null)
    if (isChatMode) setSub('messages')
    else onGoToChat?.(otherId)
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
      requestAnimationFrame(() => window.scrollTo(0, 0))
    }
  }

  const onUpdateTradeStatus = async (id, status) => {
    try {
      await updateTradeRequestStatus(id, status)
      const tr = await loadMyTradeRequests(myId)
      setTradeRequests(tr)
      const labels = {
        accepted: '✅ Aceptada',
        declined: '✋ Rechazada',
        cancelled: '🚫 Cancelada',
        completed: '🎉 Trade completado',
      }
      flash?.(labels[status] || 'Actualizado','#FCD34D')
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error'}`, '#F87171')
    }
  }

  const onListingCreated = async () => {
    try {
      const pl = await loadActivePublicListings(albumType)
      setListings(pl)
    } catch { /* sin-op */ }
  }

  // eslint-disable-next-line no-unused-vars
  const onCloseListing = async (id) => {
    try {
      await closePublicListing(id)
      const pl = await loadActivePublicListings(albumType)
      setListings(pl)
      flash?.('🔒 Oferta cerrada','#94A3B8')
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error'}`, '#F87171')
    }
  }

  const onDeleteListing = async (id) => {
    if (!window.confirm('¿Eliminar esta oferta? Esto la borra para siempre.')) return
    try {
      await deletePublicListing(id)
      const pl = await loadActivePublicListings(albumType)
      setListings(pl)
      flash?.('🗑️ Oferta eliminada', '#94A3B8')
    } catch (e) {
      flash?.(`⚠️ ${e.message || 'No se pudo eliminar'}`, '#F87171')
    }
  }

  const onCompleteListing = async (id) => {
    try {
      await completePublicListing(id)
      const pl = await loadActivePublicListings(albumType)
      setListings(pl)
      flash?.('🤝 Oferta marcada como concretada', '#4ADE80')
    } catch (e) {
      flash?.(`⚠️ ${e.message || 'No se pudo marcar'}`, '#F87171')
    }
  }

  const copy = (txt) => {
    navigator.clipboard?.writeText(txt).then(() => flash?.('📋 Copiado','#FCD34D'))
  }

  // ────────────────────────────────────────────────────────── Render helpers
  const myDups = useMemo(() => ALL_ITEMS.filter(c => myCol[c.id] === 'duplicate'), [myCol, ALL_ITEMS])

  const teamConf = useMemo(() => {
    const m = new Map()
    for (const t of (cfg.teams || [])) m.set(t.name, String(t.conf || '').toUpperCase())
    return m
  }, [cfg.teams])

  const filteredListings = useMemo(() => {
    const pos = filterPos.trim() ? parseInt(filterPos.trim(), 10) : null
    const q = filterQuery.trim().toLowerCase()
    return listings.filter(l => {
      const ids = [...(l.offered_ids || []), ...(l.wanted_ids || [])]
      if (filterTeam !== 'all') {
        const ok = ids.some(id => {
          const c = ITEMS_BY_ID[id]
          if (!c || c.team !== filterTeam) return false
          return pos == null || c.num === pos
        })
        if (!ok) return false
      } else if (pos != null) {
        // Sin equipo seleccionado, num solo es match si alguna carta lo tiene
        // (el match será amplio porque hay 48 stickers con num=N).
        const ok = ids.some(id => ITEMS_BY_ID[id]?.num === pos)
        if (!ok) return false
      }
      if (q) {
        const ok = ids.some(id => {
          const c = ITEMS_BY_ID[id]
          if (!c) return false
          return (c.name || '').toLowerCase().includes(q) ||
                 (c.team || '').toLowerCase().includes(q)
        })
        if (!ok) return false
      }
      return true
    })
  }, [listings, filterTeam, filterPos, filterQuery, ITEMS_BY_ID])

  const allTeamNames = useMemo(
    () => [...new Set(ALL_ITEMS.map(c => c.team))].filter(t => t).sort(),
    [ALL_ITEMS]
  )
  const myMissingSet = useMemo(() => {
    const out = new Set()
    for (const c of ALL_ITEMS) if ((myCol[c.id] || 'missing') === 'missing') out.add(c.id)
    return out
  }, [myCol, ALL_ITEMS])

  // ============================================================ DRILL-DOWN
  if (selUserId) {
    const prof = selProfile
    // eslint-disable-next-line no-unused-vars
    const matches = selCol ? computeMatches(myCol, selCol) : null
    const isFav = favoriteIdSet.has(selUserId)

    // Listas para el drill-down
    const theirDuplicates = selCol
      ? ALL_ITEMS.filter(c => selCol[c.id] === 'duplicate')
      : []
    const theirMissingSet = new Set(
      selCol ? ALL_ITEMS.filter(c => (selCol[c.id] || 'missing') === 'missing').map(c => c.id) : []
    )
    // Mis duplicates que el otro tiene como missing (matches) + el resto de mis duplicates
    const myDupsList = ALL_ITEMS.filter(c => myCol[c.id] === 'duplicate')

    const theirsList = onlyMatches
      ? theirDuplicates.filter(c => myMissingSet.has(c.id))
      : theirDuplicates
    const mineList = onlyMatches
      ? myDupsList.filter(c => theirMissingSet.has(c.id))
      : myDupsList

    const theirCount = selCol ? Object.values(selCol).filter(v => v !== 'missing').length : 0
    const theirPct   = totalItems ? Math.round((theirCount / totalItems) * 100) : 0

    // Build TypeDonut segments for the other user — same logic as Tracker.
    const TM = cfg.TM || {}
    const theirSegments = selCol
      ? Object.entries(TM)
          .filter(([t]) => t !== 'Momentum')
          .map(([type, m]) => {
            const items = ALL_ITEMS.filter(c => c.type === type)
            return {
              name: type, label: m.l, color: m.c, total: items.length,
              have: items.filter(c => (selCol[c.id] || 'missing') !== 'missing').length,
            }
          })
      : []

    return (
      <div className={s.wrap}>
        <button
          onClick={() => { setSelUserId(null); setSelCol(null); setSelProfile(null) }}
          className={s.backLink}
          type="button">
          <IconArrowLeft size={14}/> Volver al Marketplace
        </button>

        <div className={s.detailHead}>
          <Brackets/>
          <div className={s.detailAvatar}><Avatar profile={prof} size={64} /></div>
          <div className={s.detailBody}>
            <div className={s.detailName}>{prof?.display_name || 'Coleccionista'}</div>
            <div className={s.detailSub}>
              {selCol ? `${theirCount}/${totalItems} cartas · ${theirPct}%` : 'Cargando…'}
              {prof?.trades_completed > 0 && (
                <span className={s.detailTradesBadge}>· {prof.trades_completed} trades</span>
              )}
            </div>
            <div className={s.detailActions}>
              <button onClick={() => onToggleFavorite(selUserId)} className={isFav ? s.btnPrimary : s.btnAccent} type="button">
                {isFav ? <StarFilled/> : <IconStar/>}
                <span>{isFav ? 'Favorito' : 'Favoritear'}</span>
              </button>
              <button onClick={() => openChatWith(selUserId)} className={s.btnGhost} type="button">
                <IconChat/> <span>Chat</span>
              </button>
              <button
                onClick={openTradeModalFromDrillDown}
                disabled={!selCol}
                className={s.btnGhost}
                type="button">
                <IconHandshake/> <span>Proponer cambio</span>
              </button>
            </div>
          </div>
        </div>

        {!selCol && <div className={s.emptyText}>Cargando colección…</div>}

        {selCol && theirSegments.length > 0 && (
          <div className={s.detailDonut}>
            <TypeDonut segments={theirSegments} />
          </div>
        )}

        {selCol && (
          <>
            <div className={s.drillTabs}>
              <button
                onClick={() => setDrillTab('theirs')}
                className={`${s.drillTab} ${drillTab === 'theirs' ? s.drillTabActive : ''}`}
                type="button">
                Sus duplicates <span className={s.matchCount}>{theirsList.length}</span>
              </button>
              <button
                onClick={() => setDrillTab('mine')}
                className={`${s.drillTab} ${drillTab === 'mine' ? s.drillTabActive : ''}`}
                type="button">
                Mis duplicates <span className={s.matchCount}>{mineList.length}</span>
              </button>
            </div>

            <label className={s.filterRow}>
              <input
                type="checkbox"
                checked={onlyMatches}
                onChange={e => setOnlyMatches(e.target.checked)}
              />
              <span>Solo mostrar matches (lo que cierra el trade)</span>
            </label>

            <div className={s.pickCounter}>
              <span><strong>{pickedTheirs.size}</strong> pides</span>
              <span className={s.pickDot}>·</span>
              <span><strong>{pickedMine.size}</strong> ofreces</span>
            </div>

            {drillTab === 'theirs' && (
              <DrillList
                cards={theirsList}
                picked={pickedTheirs}
                onToggle={togglePickTheirs}
                emptyText="No tiene duplicados que te falten."
                matchHighlightSet={myMissingSet}
              />
            )}

            {drillTab === 'mine' && (
              <DrillList
                cards={mineList}
                picked={pickedMine}
                onToggle={togglePickMine}
                emptyText="No tienes duplicados que le falten."
                matchHighlightSet={theirMissingSet}
              />
            )}
          </>
        )}

        {/* TradeRequestModal vive en el render principal, no acá adentro,
            para que no se desmonte cuando openChatWith limpia selUserId */}
      </div>
    )
  }

  // ============================================================ LIST VIEW
  const incomingPending = tradeRequests.filter(t => t.target_id === myId && t.status === 'pending')
  const outgoingPending = tradeRequests.filter(t => t.initiator_id === myId && t.status === 'pending')
  const inProgressTrades = tradeRequests.filter(t => t.status === 'accepted')
  const closedTrades    = tradeRequests.filter(t => ['declined','cancelled','completed'].includes(t.status))

  // Mercado: Ofertas / Buscar / Favoritos / Trades.
  // Chat: Mensajes / Buscar (search apuntado a iniciar conversación).
  const baseSubtabs = [
    { id: 'all',       I: IconBroadcast, l: 'Ofertas' },
    { id: 'search',    I: IconSearch,    l: 'Buscar' },
    { id: 'favorites', I: IconStar,      l: 'Favoritos', b: favoriteIdSet.size },
    { id: 'inbox',     I: IconHandshake, l: 'Trades',    b: incomingPending.length },
  ]
  // Cuando el tab Chat monta este componente con forceSub='messages',
  // mostramos un toggle Mensajes/Buscar (sin Trades — los Trades viven en Mercado).
  const isChatMode = forceSub === 'messages'
  const subtabs = isChatMode
    ? [
        { id: 'messages', I: IconChat,   l: 'Mensajes' },
        { id: 'search',   I: IconSearch, l: 'Buscar' },
      ]
    : baseSubtabs

  return (
    <div className={s.wrap}>
      <div className={s.subnav}>
        {subtabs.map(t => {
          const Icon = t.I
          const active = sub === t.id
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`${s.subnavBtn} ${active ? s.subnavBtnActive : ''}`}
              type="button">
              <Icon size={14}/>
              <span>{t.l}</span>
              {t.b > 0 && <span className={s.subnavBadge}>{t.b}</span>}
            </button>
          )
        })}
      </div>

      {/* TODOS — Solo ofertas activas como banners desglosados */}
      {sub === 'all' && (
        <>
          {!myProfile?.marketplace_visible ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}><IconGlobe size={48} sw={1.5}/></div>
              <div className={s.emptyTitle}>NO ESTÁS VISIBLE</div>
              <div className={s.emptyText}>
                Activa "Aparecer en el Marketplace" en tu perfil para ver y publicar ofertas.
              </div>
              <button onClick={onGoToProfile} className={s.emptyCta} type="button">Ir a mi perfil</button>
            </div>
          ) : (
            <>
              <SectionHead
                icon={<IconBroadcast size={18}/>}
                title="Ofertas Activas"
                count={listings.length}
                action={
                  <button className={s.btnPrimary} onClick={() => setShowCreate(true)} type="button">
                    <IconPlus size={14}/> <span>Nueva Oferta</span>
                  </button>
                }
              />
              <div className={s.sectionSub}>
                {filteredListings.length === 1 ? '1 oferta activa' : `${filteredListings.length} ofertas activas`}
                {' '}en {ALBUM_CONFIG[albumType].label || albumType}
              </div>

              <div className={s.listingFilters}>
                <input
                  type="search"
                  placeholder="Buscar por nombre o equipo…"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className={s.listingFilterInput}
                  aria-label="Buscar por nombre o equipo"
                />
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className={s.listingFilterSelect}
                  aria-label="Filtrar por equipo"
                >
                  <option value="all">Todos los equipos</option>
                  {allTeamNames.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="number"
                  min="0" max="20"
                  inputMode="numeric"
                  placeholder="#"
                  value={filterPos}
                  onChange={(e) => setFilterPos(e.target.value)}
                  className={s.listingFilterPos}
                  aria-label="Posición dentro del equipo (1-20)"
                  title={filterTeam === 'all' ? 'Elegí un equipo primero para que el # sea único' : `Posición dentro de ${filterTeam}`}
                />
                {(filterQuery || filterTeam !== 'all' || filterPos) && (
                  <button
                    type="button"
                    className={s.listingFilterClear}
                    onClick={() => { setFilterQuery(''); setFilterTeam('all'); setFilterPos('') }}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {loading && (
                <div className={s.skeletonStack}>
                  <div className={s.skeleton}/><div className={s.skeleton}/><div className={s.skeleton}/>
                </div>
              )}

              {!loading && filteredListings.length === 0 && (
                <div className={s.empty}>
                  <div className={s.emptyIcon}><IconBroadcast size={48} sw={1.5}/></div>
                  <div className={s.emptyTitle}>{listings.length === 0 ? 'SIN OFERTAS AÚN' : 'SIN RESULTADOS'}</div>
                  <div className={s.emptyText}>
                    {listings.length === 0
                      ? 'Nadie publicó ofertas en este álbum. Sé el primero — tap "Nueva oferta".'
                      : 'Probá otro filtro o limpia los activos.'}
                  </div>
                </div>
              )}

              {!loading && filteredListings.length > 0 && (
                <div className={s.bannerList}>
                  {filteredListings.map(l => (
                    <ListingBanner
                      key={l.id}
                      listing={l}
                      author={listingProfiles[l.user_id]}
                      itemsById={ITEMS_BY_ID}
                      myCol={myCol}
                      isMine={l.user_id === myId}
                      isFavorite={favoriteIdSet.has(l.user_id)}
                      busyAccept={busyAccept === l.id}
                      onToggleFavorite={() => onToggleFavorite(l.user_id)}
                      onChat={() => openChatWith(l.user_id)}
                      onTrade={() => openTradeModalFromListing(l)}
                      onAccept={() => acceptListing(l)}
                      onViewProfile={() => onSelectUser(l.user_id)}
                      onDelete={() => onDeleteListing(l.id)}
                      onComplete={() => onCompleteListing(l.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* BUSCAR — encontrar coleccionistas. Tono distinto según contexto:
          Chat → "para chatear" / Mercado → "para hacer trade". */}
      {sub === 'search' && (
        <>
          <SectionHead
            icon={<IconSearch size={18}/>}
            title={isChatMode ? 'Iniciar conversación' : 'Buscar coleccionistas'}
            count={searchView.length}
          />
          <div className={s.sectionSub}>
            {isChatMode
              ? 'Encuentra a alguien y arrancá un chat'
              : 'Encuentra a otros usuarios y revisa sus colecciones'}
          </div>

          <div className={s.listingFilters}>
            <input
              type="search"
              placeholder="Buscar por nombre…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={s.listingFilterInput}
              aria-label="Buscar por nombre"
            />
            <select
              value={searchSort}
              onChange={(e) => setSearchSort(e.target.value)}
              className={s.listingFilterSelect}
              aria-label="Ordenar por"
            >
              <option value="recent">Más recientes</option>
              <option value="active">Más activos (más cartas)</option>
              <option value="favorites">Favoritos primero</option>
              <option value="matches">Mejor compatibilidad</option>
            </select>
          </div>

          {loading && (
            <div className={s.skeletonStack}>
              <div className={s.skeleton}/><div className={s.skeleton}/>
            </div>
          )}

          {!loading && searchView.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}><IconSearch size={48} sw={1.5}/></div>
              <div className={s.emptyTitle}>SIN RESULTADOS</div>
              <div className={s.emptyText}>
                {searchQuery ? 'Probá con otro nombre.' : 'No hay coleccionistas visibles aún.'}
              </div>
            </div>
          )}

          {!loading && searchView.length > 0 && (
            <div className={s.usersGrid}>
              {searchView.map(p => (
                <div key={p.user_id} className={s.userCard}>
                  <div className={s.userCardHead} onClick={() => onSelectUser(p.user_id)}>
                    <div className={s.userAvatar}><Avatar profile={p} size={42} /></div>
                    <div className={s.userMeta}>
                      <div className={s.userName}>{p.display_name}</div>
                      <div className={s.userSub}>{p.ownHave}/{totalItems} cartas · {p.ownDups} repetidas</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.user_id) }}
                      className={`${s.favStar} ${p.isFav ? s.favStarOn : ''}`}
                      aria-label={p.isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      type="button">
                      {p.isFav ? <StarFilled/> : <IconStar size={18}/>}
                    </button>
                  </div>
                  <div className={s.matchRow} onClick={() => onSelectUser(p.user_id)}>
                    <div className={`${s.matchPill} ${s.matchPillThey}`}>
                      <div className={s.matchLabel}>Te puede dar</div>
                      {p.matches.theyHaveIWant.length}
                    </div>
                    <div className={`${s.matchPill} ${s.matchPillI}`}>
                      <div className={s.matchLabel}>Le das</div>
                      {p.matches.iHaveTheyWant.length}
                    </div>
                  </div>
                  <div className={s.userActions}>
                    {isChatMode ? (
                      <button
                        onClick={() => openChatWith(p.user_id)}
                        className={s.btnPrimary}
                        type="button"
                        style={{ flex: 1 }}>
                        <IconChat size={14}/> <span>Chatear</span>
                      </button>
                    ) : (
                      <>
                        <button onClick={() => openChatWith(p.user_id)} className={s.btnGhost} type="button">
                          <IconChat size={14}/> <span>Chat</span>
                        </button>
                        <button onClick={() => onSelectUser(p.user_id)} className={s.btnPrimary} type="button">
                          <IconHandshake size={14}/> <span>Ver ofertas</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FAVORITOS — perfiles de coleccionistas marcados con ⭐ */}
      {sub === 'favorites' && (
        <>
          {!myProfile?.marketplace_visible && (
            <div className={s.empty}>
              <div className={s.emptyIcon}><IconGlobe size={48} sw={1.5}/></div>
              <div className={s.emptyTitle}>NO ESTÁS VISIBLE</div>
              <div className={s.emptyText}>
                Activa "Aparecer en el Marketplace" en tu perfil para ver coleccionistas.
              </div>
              <button onClick={onGoToProfile} className={s.emptyCta} type="button">Ir a mi perfil</button>
            </div>
          )}

          {myProfile?.marketplace_visible && (
            <>
              <SectionHead icon={<IconStar size={18}/>} title="Favoritos" count={profilesView.length}/>
              <div className={s.sectionSub}>
                Coleccionistas que destacaste — accesos rápidos a chat y trade
              </div>

              {loading && (
                <div className={s.skeletonStack}>
                  <div className={s.skeleton}/><div className={s.skeleton}/>
                </div>
              )}

              {!loading && profilesView.length === 0 && (
                <div className={s.empty}>
                  <div className={s.emptyIcon}><IconStar size={48} sw={1.5}/></div>
                  <div className={s.emptyTitle}>SIN FAVORITOS AÚN</div>
                  <div className={s.emptyText}>
                    Marca con la estrella a los coleccionistas que te interesen desde sus ofertas o perfil.
                  </div>
                </div>
              )}

              {!loading && profilesView.length > 0 && (
                <div className={s.usersGrid}>
                  {profilesView
                    .sort((a,b) => b.matches.theyHaveIWant.length - a.matches.theyHaveIWant.length)
                    .map(p => {
                      const fav = favoriteIdSet.has(p.user_id)
                      const colCount = Object.values(collections[p.user_id] || {}).filter(v => v !== 'missing').length
                      const dimmed = p.matches.theyHaveIWant.length === 0
                      return (
                        <div key={p.user_id} className={`${s.userCard} ${dimmed ? s.userCardDim : ''}`}>
                          <div className={s.userCardHead} onClick={() => onSelectUser(p.user_id)}>
                            <div className={s.userAvatar}><Avatar profile={p} size={42} /></div>
                            <div className={s.userMeta}>
                              <div className={s.userName}>{p.display_name}</div>
                              <div className={s.userSub}>{colCount}/{totalItems} cartas</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.user_id) }}
                              className={`${s.favStar} ${fav ? s.favStarOn : ''}`}
                              aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                              type="button">
                              {fav ? <StarFilled/> : <IconStar size={18}/>}
                            </button>
                          </div>
                          <div className={s.matchRow} onClick={() => onSelectUser(p.user_id)}>
                            <div className={`${s.matchPill} ${s.matchPillThey}`}>
                              <div className={s.matchLabel}>Te puede dar</div>
                              {p.matches.theyHaveIWant.length}
                            </div>
                            <div className={`${s.matchPill} ${s.matchPillI}`}>
                              <div className={s.matchLabel}>Le das</div>
                              {p.matches.iHaveTheyWant.length}
                            </div>
                          </div>
                          <div className={s.userActions}>
                            <button onClick={() => openChatWith(p.user_id)} className={s.btnGhost} type="button">
                              <IconChat size={14}/> <span>Chat</span>
                            </button>
                            <button onClick={() => onSelectUser(p.user_id)} className={s.btnPrimary} type="button">
                              <IconHandshake size={14}/> <span>Ver ofertas</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* MENSAJES — chat in-app. `key` fuerza remount limpio cuando cambia el
          counterpart, garantizando que useState pickea el chatCpId actual. */}
      {sub === 'messages' && (
        <ChatPanel
          key={`chat-${chatCpId || 'list'}`}
          myId={myId}
          myProfile={myProfile}
          initialCounterpartId={chatCpId}
          profilesById={{ ...profilesById, ...listingProfiles }}
          onActiveCounterpartChange={setChatCpId}
          onMessagesChanged={() => onUnreadChange?.()}
          flash={flash}
        />
      )}

      {/* BANDEJA — trade requests */}
      {sub === 'inbox' && (
        <>
          <SectionHead icon={<IconHandshake size={18}/>} title="Trades" count={tradeRequests.length}/>
          <div className={s.sectionSub}>
            Trades recibidos, enviados e historial
          </div>

          <>
              <div className={s.tradeSection}>
                <div className={s.tradeSectionTitle}>
                  <span className={s.tradeDot} style={{background:'var(--gold-3)'}} aria-hidden/>
                  <span>RECIBIDAS</span>
                  <span className={s.matchCount}>{incomingPending.length}</span>
                </div>
                {incomingPending.length === 0 ? (
                  <div className={s.tradeEmpty}>Nadie te propuso un trade todavía.</div>
                ) : incomingPending.map(t => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    isIncoming
                    profile={profilesById[t.initiator_id] || listingProfiles[t.initiator_id]}
                    itemsById={ITEMS_BY_ID}
                    onAccept={() => onUpdateTradeStatus(t.id, 'accepted')}
                    onReject={() => onUpdateTradeStatus(t.id, 'declined')}
                  />
                ))}
              </div>

              <div className={s.tradeSection}>
                <div className={`${s.tradeSectionTitle} ${s.tradeSectionDim}`}>
                  <span className={s.tradeDot} style={{background:'var(--text-muted)'}} aria-hidden/>
                  <span>ENVIADAS</span>
                  <span className={s.matchCount}>{outgoingPending.length}</span>
                </div>
                {outgoingPending.length === 0 ? (
                  <div className={s.tradeEmpty}>Sin trades enviados pendientes.</div>
                ) : outgoingPending.map(t => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    profile={profilesById[t.target_id] || listingProfiles[t.target_id]}
                    itemsById={ITEMS_BY_ID}
                    onCancel={() => onUpdateTradeStatus(t.id, 'cancelled')}
                  />
                ))}
              </div>

              {inProgressTrades.length > 0 && (
                <div className={s.tradeSection}>
                  <div className={s.tradeSectionTitle}>
                    <span className={s.tradeDot} style={{background:'var(--status-have)'}} aria-hidden/>
                    <span>EN CURSO</span>
                    <span className={s.matchCount}>{inProgressTrades.length}</span>
                  </div>
                  {inProgressTrades.map(t => {
                    const isIncoming = t.target_id === myId
                    const otherId = isIncoming ? t.initiator_id : t.target_id
                    const partner = profilesById[otherId] || listingProfiles[otherId]
                    return (
                      <TradeRow
                        key={t.id}
                        trade={t}
                        isIncoming={isIncoming}
                        profile={partner}
                        itemsById={ITEMS_BY_ID}
                        onCoordinate={() => openChatWith(otherId)}
                        onComplete={() => {
                          if (onCompleteTrade) onCompleteTrade(t, partner)
                          else onUpdateTradeStatus(t.id, 'completed')
                        }}
                      />
                    )
                  })}
                </div>
              )}

              {closedTrades.length > 0 && (
                <div className={s.tradeSection}>
                  <div className={`${s.tradeSectionTitle} ${s.tradeSectionDim}`}>
                    <span className={s.tradeDot} style={{background:'var(--text-faint)'}} aria-hidden/>
                    <span>HISTORIAL</span>
                    <span className={s.matchCount}>{closedTrades.length}</span>
                  </div>
                  {closedTrades.slice(0, 12).map(t => {
                    const otherId = t.initiator_id === myId ? t.target_id : t.initiator_id
                    return (
                      <TradeRow
                        key={t.id}
                        trade={t}
                        profile={profilesById[otherId] || listingProfiles[otherId]}
                        itemsById={ITEMS_BY_ID}
                        readonly
                      />
                    )
                  })}
                </div>
              )}
            </>
        </>
      )}

      {/* MI LISTA */}
      {sub === 'mine' && (
        <>
          <div className={s.mineToggle}>
            <button
              type="button"
              onClick={() => setMineTab('repetidas')}
              className={`${s.mineToggleBtn} ${mineTab === 'repetidas' ? s.mineToggleBtnActive : ''}`}
            >
              Repetidas <span className={s.matchCount}>{myDups.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setMineTab('faltantes')}
              className={`${s.mineToggleBtn} ${mineTab === 'faltantes' ? s.mineToggleBtnActive : ''}`}
            >
              Faltantes <span className={s.matchCount}>{myMissingSet.size}</span>
            </button>
          </div>

          {mineTab === 'faltantes' && (
            <MineFaltantes
              allItems={ALL_ITEMS}
              myMissingSet={myMissingSet}
              myProfile={myProfile}
              onExport={() => exportListPdf({
                items: ALL_ITEMS.filter(c => myMissingSet.has(c.id)),
                title: 'Mis Faltantes',
                subtitle: ALBUM_CONFIG[albumType].label,
                username: myProfile?.display_name,
                publicUrl: myProfile?.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${myProfile.slug}` : null,
              })}
              onCreateRequest={(card) => {
                // Permite crear trade desde una carta faltante. El usuario
                // elegirá el target en el listado de coleccionistas.
                setSub('search')
                flash?.('Elige a quién pedirle esta carta', '#FCD34D')
              }}
            />
          )}

          {mineTab === 'repetidas' && (myDups.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}><IconCardStack size={48} sw={1.5}/></div>
              <div className={s.emptyTitle}>SIN REPETIDAS AÚN</div>
              <div className={s.emptyText}>Cuando marques cartas como "Repetida" aparecerán aquí, listas para intercambio.</div>
            </div>
          ) : (
            <>
              <SectionHead
                icon={<IconList size={18}/>}
                title="Mis Repetidas"
                count={myDups.length}
                action={
                  <button className={s.btnPrimary} type="button" onClick={() => exportListPdf({
                    items: myDups,
                    title: 'Mis Repetidas',
                    subtitle: ALBUM_CONFIG[albumType].label,
                    username: myProfile?.display_name,
                    publicUrl: myProfile?.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${myProfile.slug}` : null,
                  })}>
                    <IconDownload size={14}/> <span>Exportar PDF</span>
                  </button>
                }
              />
              <div className={s.sectionSub}>
                {myDups.length} {myDups.length === 1 ? 'carta lista' : 'cartas listas'} para intercambio
              </div>

              {['ultra-rare','rare','special','base'].map(cat => {
                const cd = myDups.filter(c => c.cat === cat)
                if (!cd.length) return null
                const cl = { base:'#475569', special:'#C084FC', rare:'#FCD34D', 'ultra-rare':'#F43F5E' }
                const nl = { base:'BASE', special:'ESPECIALES', rare:'RARAS', 'ultra-rare':'ULTRA RARAS' }
                return (
                  <div key={cat} className={s.catGroup}>
                    <div className={s.catTitle} style={{ color: cl[cat], borderBottomColor: `${cl[cat]}33` }}>
                      <span className={s.catDot} style={{ background: cl[cat], boxShadow: `0 0 8px ${cl[cat]}` }} aria-hidden/>
                      <span>{nl[cat]}</span>
                      <span className={s.matchCount}>{cd.length}</span>
                    </div>
                    {[...new Set(cd.map(c => c.team))].sort().map(teamName => {
                      const tc = cd.filter(c => c.team === teamName)
                      const tf = TEAMS_LIST.find(t => t.name === teamName)
                      return (
                        <div key={teamName} className={s.teamGroup}>
                          <div className={s.teamHead}>
                            <span className={s.teamFlag}>{tf?.flag || '🌐'}</span>
                            <span className={s.teamName}>{teamName}</span>
                            <span className={s.matchCount}>{tc.length}</span>
                          </div>
                          <div className={s.cardsList}>
                            {tc.map(c => (
                              <div key={c.id} className={s.miniCard}>
                                <span className={s.miniCardFlag}>{c.flag}</span>
                                <div className={s.miniCardBody}>
                                  <div className={s.miniCardName}>{c.name}</div>
                                  <div className={s.miniCardMeta}>{c.type}</div>
                                </div>
                                <span className={s.miniCardNum}>#{c.num}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          ))}
        </>
      )}

      <CreatePublicListingModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={onListingCreated}
        myId={myId}
        albumType={albumType}
        myCol={myCol}
        allItems={ALL_ITEMS}
        myProfile={myProfile}
        flash={flash}
      />

      {/* TradeRequestModal hoisted al render principal — sobrevive el unmount
          del drill-down branch cuando el flow termina abriendo chat. El modal
          es un editor real con picker de cartas (2 tabs OFREZCO / PIDO). */}
      <TradeRequestModal
        open={showTrade}
        onClose={() => { setShowTrade(false); setTradeCtx(null) }}
        onSent={onTradeSent}
        myId={myId}
        targetProfile={tradeCtx?.targetProfile}
        albumType={albumType}
        itemsById={ITEMS_BY_ID}
        allItems={ALL_ITEMS}
        myCol={myCol}
        targetCol={tradeCtx?.targetCol || {}}
        prefillOfferedIds={tradeCtx?.offered || []}
        prefillWantedIds={tradeCtx?.wanted || []}
        prefillMeetingPoint={tradeCtx?.meetingPoint || ''}
        prefillMeetingTime={tradeCtx?.meetingTime || ''}
        flash={flash}
      />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-componente: banner desglosado de un listing público (full info, no clic-para-expandir)
// ───────────────────────────────────────────────────────────────────────────
function ListingBanner({ listing, author, itemsById, myCol, isMine, isFavorite, busyAccept, onToggleFavorite, onChat, onTrade, onAccept, onViewProfile, onDelete, onComplete }) {
  const offeredCards = listing.offered_ids.map(id => itemsById[id]).filter(Boolean)
  const wantedCards  = listing.wanted_ids.map(id => itemsById[id]).filter(Boolean)

  // Match perfecto: yo tengo TODAS las que el listing busca (como dups) + me faltan TODAS las que ofrece
  const isPerfectMatch = !!myCol && (() => {
    const wantedAllMine = wantedCards.length > 0 && wantedCards.every(c => myCol[c.id] === 'duplicate')
    const offeredAllMissing = offeredCards.length > 0 && offeredCards.every(c => (myCol[c.id] || 'missing') === 'missing')
    return wantedAllMine && offeredAllMissing
  })()

  return (
    <div className={`${s.banner} ${isPerfectMatch ? s.bannerMatch : ''}`}>
      {isPerfectMatch && (
        <div className={s.matchBadge}>
          <IconSparkle size={12}/> <span>Match Perfecto</span>
        </div>
      )}

      <div className={s.bannerHead}>
        <button onClick={onViewProfile} className={s.bannerAuthor} type="button">
          <div className={s.userAvatar}><Avatar profile={author} size={42} /></div>
          <div className={s.userMeta}>
            <div className={s.userName}>{author?.display_name || 'Coleccionista'}</div>
            <div className={s.userSub}>
              Ofrece {listing.offered_ids.length} · Busca {listing.wanted_ids.length}
            </div>
          </div>
        </button>
        <button
          onClick={onToggleFavorite}
          className={`${s.favStar} ${isFavorite ? s.favStarOn : ''}`}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          type="button">
          {isFavorite ? <StarFilled/> : <IconStar size={18}/>}
        </button>
      </div>

      <div className={s.bannerColumns}>
        {offeredCards.length > 0 && (
          <div className={s.bannerSection}>
            <div className={`${s.bannerSectionTitle} ${s.bannerSectionTitleHave}`}>
              <IconArrowUp size={12}/>
              <span>OFRECE</span>
              <span className={s.matchCount}>{offeredCards.length}</span>
            </div>
            <div className={s.cardsList}>
              {offeredCards.map(c => (
                <div key={c.id} className={s.miniCard} style={{ borderLeftColor: typeColor(c.type) }}>
                  <span className={s.miniCardFlag}>{c.flag}</span>
                  <div className={s.miniCardBody}>
                    <div className={s.miniCardName}>{c.name}</div>
                    <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
                  </div>
                  <span className={s.miniCardNum}>#{c.num}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wantedCards.length > 0 && (
          <div className={s.bannerSection}>
            <div className={`${s.bannerSectionTitle} ${s.bannerSectionTitleWant}`}>
              <IconArrowDown size={12}/>
              <span>BUSCA</span>
              <span className={s.matchCount}>{wantedCards.length}</span>
            </div>
            <div className={s.cardsList}>
              {wantedCards.map(c => (
                <div key={c.id} className={s.miniCard} style={{ borderLeftColor: typeColor(c.type) }}>
                  <span className={s.miniCardFlag}>{c.flag}</span>
                  <div className={s.miniCardBody}>
                    <div className={s.miniCardName}>{c.name}</div>
                    <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
                  </div>
                  <span className={s.miniCardNum}>#{c.num}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(listing.meeting_point || listing.meeting_time_label || listing.note) && (
        <div className={s.bannerInfo}>
          {listing.meeting_point && (
            <div className={s.bannerInfoLine}>
              <IconPin size={14} className={s.bannerInfoIcon}/>
              <span>{listing.meeting_point}</span>
            </div>
          )}
          {listing.meeting_time_label && (
            <div className={s.bannerInfoLine}>
              <IconClock size={14} className={s.bannerInfoIcon}/>
              <span>{listing.meeting_time_label}</span>
            </div>
          )}
          {listing.note && (
            <div className={s.bannerNote}>
              <IconQuote size={14} className={s.bannerNoteIcon}/>
              <span>"{listing.note}"</span>
            </div>
          )}
        </div>
      )}

      <div className={s.bannerActions}>
        {isMine ? (
          <>
            <span className={s.bannerOwnTag}>TU OFERTA</span>
            <button onClick={onDelete} className={s.btnGhost} type="button">
              <IconX size={14}/> <span>Eliminar</span>
            </button>
            <button onClick={onComplete} className={s.btnPrimary} type="button">
              <IconCheck size={14}/> <span>Marcar concretada</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={onChat} className={s.btnGhost} type="button">
              <IconChat size={14}/> <span>Chatear</span>
            </button>
            <button onClick={onTrade} className={s.btnGhost} type="button">
              <IconHandshake size={14}/> <span>Contra oferta</span>
            </button>
            <button
              onClick={onAccept}
              disabled={busyAccept}
              className={s.btnPrimary}
              type="button">
              {busyAccept
                ? <span>Enviando…</span>
                : <><IconCheck size={14}/> <span>Aceptar Oferta</span></>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MineFaltantes({ allItems, myMissingSet, onExport, onCreateRequest }) {
  const items = useMemo(
    () => allItems.filter(c => myMissingSet.has(c.id)),
    [allItems, myMissingSet]
  )
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <div className={s.emptyIcon}><IconCardStack size={48} sw={1.5}/></div>
        <div className={s.emptyTitle}>SIN FALTANTES</div>
        <div className={s.emptyText}>¡Tenés todo el álbum!</div>
      </div>
    )
  }
  return (
    <>
      <SectionHead
        icon={<IconCardStack size={18}/>}
        title="Mis Faltantes"
        count={items.length}
        action={
          <button className={s.btnPrimary} type="button" onClick={onExport}>
            <IconDownload size={14}/> <span>Exportar PDF</span>
          </button>
        }
      />
      <div className={s.sectionSub}>
        Cartas que te faltan — pedile a algún coleccionista o publica una oferta.
      </div>
      <div className={s.cardsList}>
        {items.map(c => (
          <div key={c.id} className={s.miniCard} style={{ borderLeftColor: typeColor(c.type) }}>
            <span className={s.miniCardFlag}>{c.flag}</span>
            <div className={s.miniCardBody}>
              <div className={s.miniCardName}>{c.name}</div>
              <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
            </div>
            <span className={s.miniCardNum}>#{c.num}</span>
            {onCreateRequest && (
              <button
                type="button"
                className={s.miniCardCta}
                onClick={() => onCreateRequest(c)}
                aria-label="Pedir esta carta"
              >
                Pedirla
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/* Map known card types to semantic colors. Falls back to gold-3. */
function typeColor(type) {
  if (!type) return 'var(--gold-3)'
  const t = String(type).toLowerCase()
  if (t.includes('escudo')) return 'var(--type-escudo)'
  if (t.includes('plantel')) return 'var(--type-plantel)'
  if (t.includes('jugador')) return 'var(--type-jugador)'
  if (t.includes('museo') || t.includes('museum')) return 'var(--type-museum)'
  if (t.includes('intro')) return 'var(--type-intro)'
  if (t.includes('hero')) return 'var(--type-heroes)'
  if (t.includes('icon')) return 'var(--type-icon)'
  if (t.includes('rookie')) return 'var(--type-rookie)'
  if (t.includes('keeper') || t.includes('arq')) return 'var(--type-keeper)'
  if (t.includes('def')) return 'var(--type-defense)'
  if (t.includes('mid') || t.includes('medio')) return 'var(--type-mid)'
  if (t.includes('fwd') || t.includes('del')) return 'var(--type-fwd)'
  if (t.includes('momentum')) return 'var(--type-momentum)'
  return 'var(--gold-3)'
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-componente: row de trade request en la Bandeja
// ───────────────────────────────────────────────────────────────────────────
function TradeRow({ trade, profile, itemsById, isIncoming, onAccept, onReject, onCancel, onCoordinate, onComplete, readonly }) {
  const fmtCards = (ids) => ids.slice(0, 3).map(id => {
    const c = itemsById[id]
    return c ? `#${c.num} ${c.name}` : null
  }).filter(Boolean).join(', ')
  const offText = trade.offered_ids.length > 0
    ? `${fmtCards(trade.offered_ids)}${trade.offered_ids.length > 3 ? ` +${trade.offered_ids.length - 3}` : ''}`
    : '—'
  const wantText = trade.wanted_ids.length > 0
    ? `${fmtCards(trade.wanted_ids)}${trade.wanted_ids.length > 3 ? ` +${trade.wanted_ids.length - 3}` : ''}`
    : '—'
  const time = trade.meeting_time_label || (trade.meeting_time_exact
    ? new Date(trade.meeting_time_exact).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
    : null)

  const STATUS_BADGE = {
    pending:   { label: isIncoming ? 'RECIBIDA' : 'ESPERANDO RESPUESTA', tone: 'gold'   },
    accepted:  { label: 'ACEPTADA',  tone: 'green' },
    declined:  { label: 'RECHAZADA', tone: 'red'   },
    cancelled: { label: 'CANCELADA', tone: 'mute'  },
    completed: { label: 'CONCRETADA', tone: 'blue' },
  }
  const badge = STATUS_BADGE[trade.status] || STATUS_BADGE.pending

  return (
    <div className={s.tradeRow}>
      <div className={s.tradeRowHead}>
        <div className={s.userAvatar}><Avatar profile={profile} size={36} /></div>
        <div className={s.userMeta}>
          <div className={s.userName}>{profile?.display_name || 'Coleccionista'}</div>
          <div className={s.userSub}>
            {isIncoming ? 'Te propone' : 'Le propusiste'}
          </div>
        </div>
        <span className={`${s.tradeBadge} ${s[`tradeBadge_${badge.tone}`] || ''}`}>{badge.label}</span>
      </div>
      <div className={s.tradeRowBody}>
        <div className={s.tradeLine}><strong>{isIncoming ? 'Te ofrece:' : 'Ofreces:'}</strong> {offText}</div>
        <div className={s.tradeLine}><strong>{isIncoming ? 'Te pide:' : 'Pides:'}</strong> {wantText}</div>
        {trade.meeting_point && (
          <div className={s.tradeLine}>
            <IconPin size={13} className={s.tradeLineIcon}/>
            <span>{trade.meeting_point}</span>
          </div>
        )}
        {time && (
          <div className={s.tradeLine}>
            <IconClock size={13} className={s.tradeLineIcon}/>
            <span>{time}</span>
          </div>
        )}
        {trade.message && <div className={s.tradeMessage}>"{trade.message}"</div>}
      </div>
      {!readonly && (
        <div className={s.tradeActions}>
          {trade.status === 'pending' && isIncoming && (
            <>
              <button onClick={onAccept} className={s.btnAccept} type="button">
                <IconCheck size={13}/> <span>Aceptar</span>
              </button>
              <button onClick={onReject} className={s.btnReject} type="button">
                <IconX size={13}/> <span>Rechazar</span>
              </button>
            </>
          )}
          {trade.status === 'pending' && !isIncoming && onCancel && (
            <button onClick={onCancel} className={s.btnGhost} type="button">
              <IconX size={13}/> <span>Cancelar</span>
            </button>
          )}
          {trade.status === 'accepted' && (
            <>
              {onCoordinate && (
                <button onClick={onCoordinate} className={s.btnGhost} type="button">
                  <IconChat size={13}/> <span>Coordinar</span>
                </button>
              )}
              {onComplete && (
                <button onClick={onComplete} className={s.btnAccept} type="button">
                  <IconCheck size={13}/> <span>Marcar concretado</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-componente: lista seleccionable de cartas en el drill-down
// ───────────────────────────────────────────────────────────────────────────
function DrillList({ cards, picked, onToggle, emptyText, matchHighlightSet }) {
  if (cards.length === 0) {
    return <div className={s.matchEmptyText}>{emptyText}</div>
  }
  return (
    <div className={s.cardsList}>
      {cards.map(c => {
        const isPicked = picked.has(c.id)
        const isMatch  = matchHighlightSet?.has(c.id)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={`${s.miniCard} ${s.miniCardPickable} ${isPicked ? s.miniCardPicked : ''}`}
            style={{ borderLeftColor: typeColor(c.type) }}>
            <span className={s.miniCardCheck} aria-hidden>
              {isPicked ? <IconCheck size={14}/> : <span className={s.miniCardCheckBox}/>}
            </span>
            <span className={s.miniCardFlag}>{c.flag}</span>
            <div className={s.miniCardBody}>
              <div className={s.miniCardName}>
                {c.name}
                {isMatch && (
                  <span className={s.miniCardMatchBadge}>
                    <IconSparkle size={9}/> matchea
                  </span>
                )}
              </div>
              <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
            </div>
            <span className={s.miniCardNum}>#{c.num}</span>
          </button>
        )
      })}
    </div>
  )
}
