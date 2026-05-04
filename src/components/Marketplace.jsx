import { useState, useEffect, useMemo } from 'react'
import {
  loadVisibleProfiles, loadProfile,
  loadMyFavorites, addFavorite, removeFavorite,
  loadMyTradeRequests, updateTradeRequestStatus,
  loadActivePublicListings, closePublicListing,
  sendMessage,
  computeMatches,
} from '../lib/marketplace'
import { loadAlbum, loadAlbumByUserIds } from '../lib/album'
import { ALBUM_CONFIG, ALBUM_ADRENALYN } from '../data'
import TradeRequestModal from './TradeRequestModal'
import CreatePublicListingModal from './CreatePublicListingModal'
import ChatPanel from './ChatPanel'
import s from './Marketplace.module.css'

export default function Marketplace({
  session,
  albumType = ALBUM_ADRENALYN,
  myCol,
  myProfile,
  onGoToProfile,
  onUnreadChange,
  flash,
}) {
  const cfg = ALBUM_CONFIG[albumType]
  const ALL_ITEMS   = useMemo(() => cfg.buildItems(), [albumType])
  const ITEMS_BY_ID = useMemo(() => Object.fromEntries(ALL_ITEMS.map(c => [c.id, c])), [ALL_ITEMS])
  const TEAMS_LIST  = cfg.teams
  const totalItems  = ALL_ITEMS.length
  const [sub,         setSub]         = useState('all') // 'all' | 'favorites' | 'messages' | 'inbox' | 'mine'
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
  const [tradeRequests,setTradeRequests]= useState([])
  const [listings,     setListings]     = useState([])
  const [listingProfiles, setListingProfiles] = useState({}) // user_id -> profile
  const [showCreate,   setShowCreate]   = useState(false)
  const [chatCpId,     setChatCpId]     = useState(null) // counterpart id activo en chat

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
      setListings(pl.filter(l => l.user_id !== myId))
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

  const favoriteIdSet = useMemo(() => new Set(favorites.map(f => f.target_id)), [favorites])

  const profilesView = useMemo(() => {
    const list = profiles.map(p => {
      const matches = computeMatches(myCol, collections[p.user_id] || {})
      return { ...p, matches }
    })
    if (sub === 'favorites') return list.filter(p => favoriteIdSet.has(p.user_id))
    return list
  }, [profiles, collections, myCol, sub, favoriteIdSet])

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

  const openTradeModal = () => {
    if (!selUserId || !selCol) return
    setShowTrade(true)
  }

  const onTradeSent = async (created) => {
    try {
      const tr = await loadMyTradeRequests(myId)
      setTradeRequests(tr)
      // Mensaje system al chat con el target del trade
      if (created?.target_id) {
        sendMessage(myId, created.target_id,
          '🤝 Te envié una solicitud de trade — abrí Bandeja para verla.'
        ).catch(() => {})
        // Auto-abrir chat con el target tras enviar el trade
        openChatWith(created.target_id)
      }
    } catch { /* sin-op */ }
  }

  const openChatWith = (otherId) => {
    if (!otherId) return
    setChatCpId(otherId)
    setSelUserId(null)
    setSelCol(null)
    setSelProfile(null)
    setSub('messages')
    // Scroll al top para que el usuario vea el chat
    if (typeof window !== 'undefined') {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
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
      setListings(pl.filter(l => l.user_id !== myId))
    } catch { /* sin-op */ }
  }

  const onCloseListing = async (id) => {
    try {
      await closePublicListing(id)
      const pl = await loadActivePublicListings(albumType)
      setListings(pl.filter(l => l.user_id !== myId))
      flash?.('🔒 Oferta cerrada','#94A3B8')
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error'}`, '#F87171')
    }
  }

  const copy = (txt) => {
    navigator.clipboard?.writeText(txt).then(() => flash?.('📋 Copiado','#FCD34D'))
  }

  // ────────────────────────────────────────────────────────── Render helpers
  const myDups = useMemo(() => ALL_ITEMS.filter(c => myCol[c.id] === 'duplicate'), [myCol, ALL_ITEMS])
  const myMissingSet = useMemo(() => {
    const out = new Set()
    for (const c of ALL_ITEMS) if ((myCol[c.id] || 'missing') === 'missing') out.add(c.id)
    return out
  }, [myCol, ALL_ITEMS])

  // ============================================================ DRILL-DOWN
  if (selUserId) {
    const prof = selProfile
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

    return (
      <div className={s.wrap}>
        <button onClick={() => { setSelUserId(null); setSelCol(null); setSelProfile(null) }} className={s.btnSecondary} style={{ marginBottom: 16 }}>
          ← Volver al Marketplace
        </button>

        <div className={s.detailHead}>
          <div className={s.detailAvatar}>{prof?.avatar_emoji || '👤'}</div>
          <div className={s.detailBody}>
            <div className={s.detailName}>{prof?.display_name || 'Coleccionista'}</div>
            <div className={s.detailSub}>
              {selCol ? `${theirCount}/${totalItems} cartas · ${theirPct}%` : 'Cargando…'}
            </div>
            <div className={s.detailActions}>
              <button onClick={() => onToggleFavorite(selUserId)} className={isFav ? s.btnAccent : s.btnSecondary}>
                {isFav ? '⭐ Favorito' : '☆ Favoritear'}
              </button>
              <button onClick={() => openChatWith(selUserId)} className={s.btnSecondary}>
                💬 Chat
              </button>
              <button
                onClick={openTradeModal}
                disabled={!selCol || (pickedTheirs.size === 0 && pickedMine.size === 0)}
                className={s.btnPrimary}>
                🤝 Proponer trade
              </button>
            </div>
          </div>
        </div>

        {!selCol && <div className={s.emptyText}>Cargando colección…</div>}

        {selCol && (
          <>
            <div className={s.drillTabs}>
              <button
                onClick={() => setDrillTab('theirs')}
                className={`${s.drillTab} ${drillTab === 'theirs' ? s.drillTabActive : ''}`}>
                SUS DUPLICATES <span className={s.matchCount}>{theirsList.length}</span>
              </button>
              <button
                onClick={() => setDrillTab('mine')}
                className={`${s.drillTab} ${drillTab === 'mine' ? s.drillTabActive : ''}`}>
                MIS DUPLICATES <span className={s.matchCount}>{mineList.length}</span>
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

        <TradeRequestModal
          open={showTrade}
          onClose={() => setShowTrade(false)}
          onSent={onTradeSent}
          myId={myId}
          targetProfile={selProfile}
          albumType={albumType}
          itemsById={ITEMS_BY_ID}
          offeredIds={Array.from(pickedMine)}
          wantedIds={Array.from(pickedTheirs)}
          flash={flash}
        />
      </div>
    )
  }

  // ============================================================ LIST VIEW
  const incomingPending = tradeRequests.filter(t => t.target_id === myId && t.status === 'pending')
  const outgoingPending = tradeRequests.filter(t => t.initiator_id === myId && t.status === 'pending')
  const closedTrades    = tradeRequests.filter(t => t.status !== 'pending')

  const subtabs = [
    { id: 'all',       i: '🌐', l: 'Todos' },
    { id: 'favorites', i: '⭐', l: 'Favoritos', b: favoriteIdSet.size },
    { id: 'messages',  i: '💬', l: 'Mensajes' },
    { id: 'inbox',     i: '📬', l: 'Bandeja',   b: incomingPending.length },
    { id: 'mine',      i: '📋', l: 'Mi lista',  b: myDups.length },
  ]

  return (
    <div className={s.wrap}>
      <div className={s.subnav}>
        {subtabs.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`${s.subnavBtn} ${sub === t.id ? s.subnavBtnActive : ''}`}>
            <span>{t.i}</span> <span>{t.l}</span>
            {t.b > 0 && <span className={s.subnavBadge}>{t.b}</span>}
          </button>
        ))}
      </div>

      {/* TODOS — Solo ofertas activas como banners desglosados */}
      {sub === 'all' && (
        <>
          {!myProfile?.marketplace_visible ? (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>🌐</div>
              <div className={s.emptyTitle}>NO ESTÁS VISIBLE</div>
              <div className={s.emptyText}>
                Activa "Visible en Marketplace" en tu perfil para ver y publicar ofertas.
              </div>
              <button onClick={onGoToProfile} className={s.emptyCta}>Ir a mi perfil</button>
            </div>
          ) : (
            <>
              <div className={s.listingsHead}>
                <div>
                  <div className={s.listingsTitle}>📢 OFERTAS ACTIVAS</div>
                  <div className={s.listingsSub}>
                    {listings.length} {listings.length === 1 ? 'oferta' : 'ofertas'} en {ALBUM_CONFIG[albumType].label || albumType}
                  </div>
                </div>
                <button className={s.btnPrimary} onClick={() => setShowCreate(true)}>
                  + Nueva oferta
                </button>
              </div>

              {loading && <div className={s.emptyText} style={{ padding: 30 }}>Cargando ofertas…</div>}

              {!loading && listings.length === 0 && (
                <div className={s.empty}>
                  <div className={s.emptyEmoji}>📢</div>
                  <div className={s.emptyTitle}>SIN OFERTAS AÚN</div>
                  <div className={s.emptyText}>
                    Nadie publicó ofertas en este álbum. ¡Sé el primero! Tap "+ Nueva oferta".
                  </div>
                </div>
              )}

              {!loading && listings.length > 0 && (
                <div className={s.bannerList}>
                  {listings.map(l => (
                    <ListingBanner
                      key={l.id}
                      listing={l}
                      author={listingProfiles[l.user_id]}
                      itemsById={ITEMS_BY_ID}
                      isFavorite={favoriteIdSet.has(l.user_id)}
                      onToggleFavorite={() => onToggleFavorite(l.user_id)}
                      onChat={() => openChatWith(l.user_id)}
                      onTrade={() => onSelectUser(l.user_id, {
                        wanted: l.offered_ids,
                        offered: [],
                      })}
                      onViewProfile={() => onSelectUser(l.user_id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* FAVORITOS — perfiles de coleccionistas marcados con ⭐ */}
      {sub === 'favorites' && (
        <>
          {!myProfile?.marketplace_visible && (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>🌐</div>
              <div className={s.emptyTitle}>NO ESTÁS VISIBLE</div>
              <div className={s.emptyText}>
                Activa "Visible en Marketplace" en tu perfil para ver coleccionistas.
              </div>
              <button onClick={onGoToProfile} className={s.emptyCta}>Ir a mi perfil</button>
            </div>
          )}

          {myProfile?.marketplace_visible && loading && (
            <div className={s.emptyText} style={{ padding: 30 }}>Cargando…</div>
          )}

          {myProfile?.marketplace_visible && !loading && profilesView.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>⭐</div>
              <div className={s.emptyTitle}>SIN FAVORITOS AÚN</div>
              <div className={s.emptyText}>
                Marca con ⭐ a los coleccionistas que te interesen desde sus ofertas o perfil.
              </div>
            </div>
          )}

          {myProfile?.marketplace_visible && !loading && profilesView.length > 0 && (
            <div className={s.usersGrid}>
              {profilesView
                .sort((a,b) => (b.matches.theyHaveIWant.length + b.matches.iHaveTheyWant.length)
                              - (a.matches.theyHaveIWant.length + a.matches.iHaveTheyWant.length))
                .map(p => {
                  const fav = favoriteIdSet.has(p.user_id)
                  const colCount = Object.values(collections[p.user_id] || {}).filter(v => v !== 'missing').length
                  return (
                    <div key={p.user_id} className={s.userCard}>
                      <div className={s.userCardHead} onClick={() => onSelectUser(p.user_id)}>
                        <div className={s.userAvatar}>{p.avatar_emoji}</div>
                        <div className={s.userMeta}>
                          <div className={s.userName}>{p.display_name}</div>
                          <div className={s.userSub}>{colCount}/{totalItems} cartas</div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(p.user_id) }}
                          className={`${s.favStar} ${fav ? s.favStarOn : ''}`}
                          aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                          {fav ? '⭐' : '☆'}
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
                        <button onClick={() => openChatWith(p.user_id)} className={s.btnSecondary}>💬 Chat</button>
                        <button onClick={() => onSelectUser(p.user_id)} className={s.btnPrimary}>🤝 Trade</button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}

      {/* MENSAJES — chat in-app */}
      {sub === 'messages' && (
        <ChatPanel
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
          {tradeRequests.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>📬</div>
              <div className={s.emptyTitle}>SIN TRADES AÚN</div>
              <div className={s.emptyText}>
                Cuando alguien te proponga un trade aparecerá acá. Vos también podés iniciar uno
                desde el drill-down de cualquier coleccionista.
              </div>
            </div>
          ) : (
            <>
              {incomingPending.length > 0 && (
                <div className={s.tradeSection}>
                  <div className={s.tradeSectionTitle}>
                    📩 RECIBIDAS <span className={s.matchCount}>{incomingPending.length}</span>
                  </div>
                  {incomingPending.map(t => (
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
              )}

              {outgoingPending.length > 0 && (
                <div className={s.tradeSection}>
                  <div className={s.tradeSectionTitle} style={{ color: 'var(--text-faint)' }}>
                    📤 ENVIADAS <span className={s.matchCount}>{outgoingPending.length}</span>
                  </div>
                  {outgoingPending.map(t => (
                    <TradeRow
                      key={t.id}
                      trade={t}
                      profile={profilesById[t.target_id] || listingProfiles[t.target_id]}
                      itemsById={ITEMS_BY_ID}
                      onCancel={() => onUpdateTradeStatus(t.id, 'cancelled')}
                    />
                  ))}
                </div>
              )}

              {closedTrades.length > 0 && (
                <div className={s.tradeSection}>
                  <div className={s.tradeSectionTitle} style={{ color: 'var(--text-faint)' }}>
                    📚 HISTORIAL <span className={s.matchCount}>{closedTrades.length}</span>
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
          )}
        </>
      )}

      {/* MI LISTA */}
      {sub === 'mine' && (
        <>
          {myDups.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>🃏</div>
              <div className={s.emptyTitle}>SIN REPETIDAS AÚN</div>
              <div className={s.emptyText}>Cuando marques cartas como "Repetida" aparecerán aquí, listas para intercambio.</div>
            </div>
          ) : (
            <>
              <div className={s.myListHead}>
                <div>
                  <div className={s.myListTitle}>📋 MIS REPETIDAS</div>
                  <div className={s.myListSub}>{myDups.length} cartas listas para intercambio</div>
                </div>
                <button className={s.btnPrimary} onClick={() => {
                  const txt = myDups.map(c => `#${c.num} ${c.name} (${c.team}) [${c.type}]`).join('\n')
                  copy(txt)
                }}>
                  📋 Copiar lista
                </button>
              </div>

              {['ultra-rare','rare','special','base'].map(cat => {
                const cd = myDups.filter(c => c.cat === cat)
                if (!cd.length) return null
                const cl = { base:'#475569', special:'#C084FC', rare:'#FCD34D', 'ultra-rare':'#F43F5E' }
                const nl = { base:'Base', special:'Especiales', rare:'⭐ Raras', 'ultra-rare':'💎 Ultra Raras' }
                return (
                  <div key={cat} style={{ marginBottom: 24 }}>
                    <div className={s.matchSectionTitle} style={{ color: cl[cat], borderBottom: `1px solid ${cl[cat]}22`, paddingBottom: 6 }}>
                      {nl[cat]} <span className={s.matchCount}>{cd.length}</span>
                    </div>
                    {[...new Set(cd.map(c => c.team))].sort().map(teamName => {
                      const tc = cd.filter(c => c.team === teamName)
                      const tf = TEAMS_LIST.find(t => t.name === teamName)
                      return (
                        <div key={teamName} style={{
                          marginBottom: 12, background: 'var(--bg-card)',
                          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 14,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 18 }}>{tf?.flag || '🌐'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{teamName}</span>
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
          )}
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
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-componente: banner desglosado de un listing público (full info, no clic-para-expandir)
// ───────────────────────────────────────────────────────────────────────────
function ListingBanner({ listing, author, itemsById, isFavorite, onToggleFavorite, onChat, onTrade, onViewProfile }) {
  const offeredCards = listing.offered_ids.map(id => itemsById[id]).filter(Boolean)
  const wantedCards  = listing.wanted_ids.map(id => itemsById[id]).filter(Boolean)
  return (
    <div className={s.banner}>
      <div className={s.bannerHead}>
        <button onClick={onViewProfile} className={s.bannerAuthor} type="button">
          <div className={s.userAvatar}>{author?.avatar_emoji || '👤'}</div>
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
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
          {isFavorite ? '⭐' : '☆'}
        </button>
      </div>

      {offeredCards.length > 0 && (
        <div className={s.bannerSection}>
          <div className={s.bannerSectionTitle} style={{ color: 'var(--have)' }}>
            ⬆️ OFRECE <span className={s.matchCount}>{offeredCards.length}</span>
          </div>
          <div className={s.cardsList}>
            {offeredCards.map(c => (
              <div key={c.id} className={s.miniCard}>
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
          <div className={s.bannerSectionTitle} style={{ color: 'var(--accent)' }}>
            ⬇️ BUSCA <span className={s.matchCount}>{wantedCards.length}</span>
          </div>
          <div className={s.cardsList}>
            {wantedCards.map(c => (
              <div key={c.id} className={s.miniCard}>
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

      {(listing.meeting_point || listing.meeting_time_label || listing.note) && (
        <div className={s.bannerInfo}>
          {listing.meeting_point && <div className={s.bannerInfoLine}>📍 {listing.meeting_point}</div>}
          {listing.meeting_time_label && <div className={s.bannerInfoLine}>⏰ {listing.meeting_time_label}</div>}
          {listing.note && <div className={s.bannerNote}>"{listing.note}"</div>}
        </div>
      )}

      <div className={s.bannerActions}>
        <button onClick={onChat} className={s.btnSecondary}>💬 Iniciar chat</button>
        <button onClick={onTrade} className={s.btnPrimary}>🤝 Proponer trade</button>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-componente: row de trade request en la Bandeja
// ───────────────────────────────────────────────────────────────────────────
function TradeRow({ trade, profile, itemsById, isIncoming, onAccept, onReject, onCancel, readonly }) {
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
  const statusLabel = {
    accepted: '✅ Aceptada',
    declined: '✋ Rechazada',
    cancelled: '🚫 Cancelada',
    completed: '🎉 Completada',
  }[trade.status]
  return (
    <div className={s.tradeRow}>
      <div className={s.tradeRowHead}>
        <div className={s.userAvatar}>{profile?.avatar_emoji || '👤'}</div>
        <div className={s.userMeta}>
          <div className={s.userName}>{profile?.display_name || 'Coleccionista'}</div>
          <div className={s.userSub}>
            {isIncoming ? 'Te propone' : (readonly ? statusLabel : 'Esperando respuesta…')}
          </div>
        </div>
      </div>
      <div className={s.tradeRowBody}>
        <div className={s.tradeLine}><strong>{isIncoming ? 'Te ofrece:' : 'Ofreces:'}</strong> {offText}</div>
        <div className={s.tradeLine}><strong>{isIncoming ? 'Te pide:' : 'Pides:'}</strong> {wantText}</div>
        {trade.meeting_point && <div className={s.tradeLine}>📍 {trade.meeting_point}</div>}
        {time && <div className={s.tradeLine}>⏰ {time}</div>}
        {trade.message && <div className={s.tradeMessage}>"{trade.message}"</div>}
      </div>
      {!readonly && (
        <div className={s.tradeActions}>
          {isIncoming && (
            <>
              <button onClick={onAccept} className={s.btnAccept}>Aceptar</button>
              <button onClick={onReject} className={s.btnReject}>Rechazar</button>
            </>
          )}
          {!isIncoming && onCancel && (
            <button onClick={onCancel} className={s.btnSecondary}>Cancelar</button>
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
            className={`${s.miniCard} ${s.miniCardPickable} ${isPicked ? s.miniCardPicked : ''}`}>
            <span className={s.miniCardCheck}>{isPicked ? '☑' : '☐'}</span>
            <span className={s.miniCardFlag}>{c.flag}</span>
            <div className={s.miniCardBody}>
              <div className={s.miniCardName}>
                {c.name}
                {isMatch && <span className={s.miniCardMatchBadge}>★ matchea</span>}
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
