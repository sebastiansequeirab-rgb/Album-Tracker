import { useState, useEffect, useMemo } from 'react'
import {
  loadVisibleProfiles, loadProfile, loadCollectionsByUserIds, loadCollection,
  loadFriendships, partitionFriendships, friendshipBetween,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  computeMatches, buildTradeMessage,
} from '../lib/marketplace'
import { buildCards, TEAMS_LIST } from '../data'
import s from './Marketplace.module.css'

const ALL_CARDS = buildCards()
const CARDS_BY_ID = Object.fromEntries(ALL_CARDS.map(c => [c.id, c]))

export default function Marketplace({ session, myCol, myProfile, onGoToProfile, flash }) {
  const [sub,         setSub]         = useState('all') // 'all' | 'friends' | 'mine' | 'requests'
  const [profiles,    setProfiles]    = useState([])
  const [collections, setCollections] = useState({})
  const [friendships, setFriendships] = useState([])
  const [profilesById,setProfilesById]= useState({})
  const [loading,     setLoading]     = useState(true)
  const [selUserId,   setSelUserId]   = useState(null)
  const [selCol,      setSelCol]      = useState(null)
  const [showTrade,   setShowTrade]   = useState(false)
  const [tradeMsg,    setTradeMsg]    = useState('')

  const myId = session.user.id

  const reload = async () => {
    setLoading(true)
    try {
      const [vp, fs] = await Promise.all([
        loadVisibleProfiles(myId),
        loadFriendships(myId),
      ])
      setProfiles(vp)
      setFriendships(fs)
      const ids = vp.map(p => p.user_id)
      const cm  = await loadCollectionsByUserIds(ids)
      setCollections(cm)
      const map = {}
      for (const p of vp) map[p.user_id] = p
      setProfilesById(map)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error cargando marketplace'}`, '#F87171')
    }
    setLoading(false)
  }

  useEffect(() => { reload() /* eslint-disable-next-line */ }, [myId])

  const { incoming, outgoing, accepted } = useMemo(() => partitionFriendships(friendships, myId), [friendships, myId])

  const friendIdSet = useMemo(() => {
    const s = new Set()
    for (const f of accepted) s.add(f.requester_id === myId ? f.receiver_id : f.requester_id)
    return s
  }, [accepted, myId])

  const profilesView = useMemo(() => {
    const list = profiles.map(p => {
      const matches = computeMatches(myCol, collections[p.user_id] || {})
      return { ...p, matches }
    })
    if (sub === 'friends') return list.filter(p => friendIdSet.has(p.user_id))
    return list
  }, [profiles, collections, myCol, sub, friendIdSet])

  const onSelectUser = async (uid) => {
    setSelUserId(uid)
    setSelCol(null)
    try {
      // We may already have it; fall back to direct fetch.
      const col = collections[uid] || await loadCollection(uid)
      setSelCol(col)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'No se pudo cargar la colección'}`, '#F87171')
      setSelUserId(null)
    }
  }

  const onSendFriendRequest = async (otherId) => {
    try {
      await sendFriendRequest(myId, otherId)
      flash?.('💌 Solicitud enviada','#FCD34D')
      const fs = await loadFriendships(myId)
      setFriendships(fs)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'No se pudo enviar la solicitud'}`, '#F87171')
    }
  }

  const onAccept = async (id) => {
    try {
      await acceptFriendRequest(id)
      flash?.('🤝 Amigos agregados','#4ADE80')
      const fs = await loadFriendships(myId)
      setFriendships(fs)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error'}`, '#F87171')
    }
  }

  const onReject = async (id) => {
    try {
      await rejectFriendRequest(id)
      const fs = await loadFriendships(myId)
      setFriendships(fs)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error'}`, '#F87171')
    }
  }

  const openTradeModal = () => {
    if (!selUserId || !selCol) return
    const otherProf = profilesById[selUserId]
    const matches = computeMatches(myCol, selCol)
    const msg = buildTradeMessage({
      myName: myProfile?.display_name || 'Coleccionista',
      theirName: otherProf?.display_name || 'amigo',
      theyHaveIWant: matches.theyHaveIWant,
      iHaveTheyWant: matches.iHaveTheyWant,
      allCardsById: CARDS_BY_ID,
    })
    setTradeMsg(msg)
    setShowTrade(true)
  }

  const copy = (txt) => {
    navigator.clipboard?.writeText(txt).then(() => flash?.('📋 Copiado','#FCD34D'))
  }

  // ────────────────────────────────────────────────────────── Render helpers
  const myDups = useMemo(() => ALL_CARDS.filter(c => myCol[c.id] === 'duplicate'), [myCol])

  if (selUserId) {
    const prof = profilesById[selUserId]
    const matches = selCol ? computeMatches(myCol, selCol) : null
    const friendship = friendshipBetween(friendships, myId, selUserId)
    const friendStatus = friendship?.status

    return (
      <div className={s.wrap}>
        <button onClick={() => { setSelUserId(null); setSelCol(null) }} className={s.btnSecondary} style={{ marginBottom: 16 }}>
          ← Volver al Marketplace
        </button>

        <div className={s.detailHead}>
          <div className={s.detailAvatar}>{prof?.avatar_emoji || '👤'}</div>
          <div className={s.detailBody}>
            <div className={s.detailName}>{prof?.display_name || 'Coleccionista'}</div>
            <div className={s.detailSub}>
              {selCol ? `${Object.values(selCol).filter(v => v !== 'missing').length} cartas en colección` : 'Cargando…'}
              {friendStatus === 'accepted' && ' · 🤝 Amigos'}
              {friendStatus === 'pending' && friendship?.requester_id === myId && ' · 💌 Solicitud enviada'}
              {friendStatus === 'pending' && friendship?.receiver_id === myId && ' · 📩 Quiere ser tu amigo'}
            </div>
            <div className={s.detailActions}>
              {!friendStatus && (
                <button onClick={() => onSendFriendRequest(selUserId)} className={s.btnSecondary}>
                  ➕ Agregar amigo
                </button>
              )}
              {friendStatus === 'pending' && friendship?.receiver_id === myId && (
                <>
                  <button onClick={() => onAccept(friendship.id)} className={s.btnAccept}>Aceptar</button>
                  <button onClick={() => onReject(friendship.id)} className={s.btnReject}>Rechazar</button>
                </>
              )}
              {matches && (matches.theyHaveIWant.length > 0 || matches.iHaveTheyWant.length > 0) && (
                <button onClick={openTradeModal} className={s.btnPrimary}>
                  🤝 Solicitar trade
                </button>
              )}
            </div>
          </div>
        </div>

        {!selCol && <div className={s.emptyText}>Cargando colección…</div>}

        {matches && (
          <>
            <div className={s.matchSection}>
              <div className={s.matchSectionTitle} style={{ color: 'var(--have)' }}>
                ⬆️ TE PUEDE DAR <span className={s.matchCount}>{matches.theyHaveIWant.length}</span>
              </div>
              {matches.theyHaveIWant.length === 0 ? (
                <div className={s.matchEmptyText}>No tiene duplicados de cartas que te falten.</div>
              ) : (
                <div className={s.cardsList}>
                  {matches.theyHaveIWant.map(id => {
                    const c = CARDS_BY_ID[id]; if (!c) return null
                    return (
                      <div key={id} className={s.miniCard}>
                        <span className={s.miniCardFlag}>{c.flag}</span>
                        <div className={s.miniCardBody}>
                          <div className={s.miniCardName}>{c.name}</div>
                          <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
                        </div>
                        <span className={s.miniCardNum}>#{c.num}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={s.matchSection}>
              <div className={s.matchSectionTitle} style={{ color: 'var(--accent)' }}>
                ⬇️ LE PUEDES DAR <span className={s.matchCount}>{matches.iHaveTheyWant.length}</span>
              </div>
              {matches.iHaveTheyWant.length === 0 ? (
                <div className={s.matchEmptyText}>No tienes duplicados de cartas que le falten.</div>
              ) : (
                <div className={s.cardsList}>
                  {matches.iHaveTheyWant.map(id => {
                    const c = CARDS_BY_ID[id]; if (!c) return null
                    return (
                      <div key={id} className={s.miniCard}>
                        <span className={s.miniCardFlag}>{c.flag}</span>
                        <div className={s.miniCardBody}>
                          <div className={s.miniCardName}>{c.name}</div>
                          <div className={s.miniCardMeta}>{c.team} · {c.type}</div>
                        </div>
                        <span className={s.miniCardNum}>#{c.num}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {showTrade && (
          <div className={s.modalBackdrop} onClick={() => setShowTrade(false)}>
            <div className={s.modalCard} onClick={e => e.stopPropagation()}>
              <div className={s.modalHead}>
                <div>
                  <div className={s.modalTitle}>🤝 PROPONER TRADE</div>
                  <div className={s.modalSub}>Contacta a {prof?.display_name} por fuera de la app</div>
                </div>
                <button onClick={() => setShowTrade(false)} className={s.modalClose}>×</button>
              </div>

              <div className={s.contactList}>
                {prof?.contact?.instagram && (
                  <div className={s.contactRow}>
                    <span className={s.contactIcon}>📸</span>
                    <span className={s.contactValue}>@{String(prof.contact.instagram).replace(/^@/, '')}</span>
                    <button onClick={() => copy('@' + String(prof.contact.instagram).replace(/^@/, ''))} className={s.contactCopy}>Copiar</button>
                  </div>
                )}
                {prof?.contact?.whatsapp && (
                  <div className={s.contactRow}>
                    <span className={s.contactIcon}>💬</span>
                    <span className={s.contactValue}>{prof.contact.whatsapp}</span>
                    <button onClick={() => copy(prof.contact.whatsapp)} className={s.contactCopy}>Copiar</button>
                  </div>
                )}
                {prof?.contact?.email && (
                  <div className={s.contactRow}>
                    <span className={s.contactIcon}>✉️</span>
                    <span className={s.contactValue}>{prof.contact.email}</span>
                    <button onClick={() => copy(prof.contact.email)} className={s.contactCopy}>Copiar</button>
                  </div>
                )}
                {!prof?.contact?.instagram && !prof?.contact?.whatsapp && !prof?.contact?.email && (
                  <div className={s.matchEmptyText}>Este usuario no agregó contactos. Pídele que llene su perfil.</div>
                )}
              </div>

              <div className={s.matchSectionTitle} style={{ color: 'var(--text-muted)' }}>MENSAJE SUGERIDO</div>
              <textarea className={s.messageBox} value={tradeMsg} onChange={e => setTradeMsg(e.target.value)} />
              <button onClick={() => copy(tradeMsg)} className={s.btnPrimary} style={{ width: '100%', marginTop: 12 }}>
                📋 Copiar mensaje
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────── List view
  const subtabs = [
    { id: 'all',      i: '🌐', l: 'Todos' },
    { id: 'friends',  i: '🤝', l: 'Amigos',      b: friendIdSet.size },
    { id: 'mine',     i: '📋', l: 'Mi lista',    b: myDups.length },
    { id: 'requests', i: '📬', l: 'Solicitudes', b: incoming.length },
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

      {/* TODOS / AMIGOS */}
      {(sub === 'all' || sub === 'friends') && (
        <>
          {!myProfile?.marketplace_visible && (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>🌐</div>
              <div className={s.emptyTitle}>NO ESTÁS VISIBLE</div>
              <div className={s.emptyText}>
                Activa "Visible en Marketplace" en tu perfil para que otros puedan ver tus cartas y proponerte trades.
              </div>
              <button onClick={onGoToProfile} className={s.emptyCta}>Ir a mi perfil</button>
            </div>
          )}

          {myProfile?.marketplace_visible && loading && (
            <div className={s.emptyText} style={{ padding: 30 }}>Cargando coleccionistas…</div>
          )}

          {myProfile?.marketplace_visible && !loading && profilesView.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>{sub === 'friends' ? '🤝' : '🌐'}</div>
              <div className={s.emptyTitle}>{sub === 'friends' ? 'SIN AMIGOS AÚN' : 'NADIE MÁS POR ACÁ'}</div>
              <div className={s.emptyText}>
                {sub === 'friends'
                  ? 'Acepta solicitudes o agrega coleccionistas desde "Todos".'
                  : 'Sé el primero en compartir el link con tus amigos. Cuando otros activen Marketplace aparecerán aquí.'}
              </div>
            </div>
          )}

          {myProfile?.marketplace_visible && !loading && profilesView.length > 0 && (
            <div className={s.usersGrid}>
              {profilesView
                .sort((a,b) => (b.matches.theyHaveIWant.length + b.matches.iHaveTheyWant.length)
                              - (a.matches.theyHaveIWant.length + a.matches.iHaveTheyWant.length))
                .map(p => {
                  const fr = friendshipBetween(friendships, myId, p.user_id)
                  return (
                    <div key={p.user_id} onClick={() => onSelectUser(p.user_id)} className={s.userCard}>
                      <div className={s.userCardHead}>
                        <div className={s.userAvatar}>{p.avatar_emoji}</div>
                        <div className={s.userMeta}>
                          <div className={s.userName}>{p.display_name}</div>
                          <div className={s.userSub}>{Object.values(collections[p.user_id] || {}).filter(v => v !== 'missing').length} cartas</div>
                          {fr?.status === 'accepted' && <span className={`${s.friendBadge} ${s.friendBadgeAccepted}`}>🤝 Amigo</span>}
                          {fr?.status === 'pending' && <span className={`${s.friendBadge} ${s.friendBadgePending}`}>⏳ Pendiente</span>}
                        </div>
                      </div>
                      <div className={s.matchRow}>
                        <div className={`${s.matchPill} ${s.matchPillThey}`}>
                          <div className={s.matchLabel}>Te puede dar</div>
                          {p.matches.theyHaveIWant.length}
                        </div>
                        <div className={`${s.matchPill} ${s.matchPillI}`}>
                          <div className={s.matchLabel}>Le das</div>
                          {p.matches.iHaveTheyWant.length}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}

      {/* MI LISTA (old Intercambio) */}
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

      {/* SOLICITUDES */}
      {sub === 'requests' && (
        <>
          {incoming.length === 0 && outgoing.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyEmoji}>📭</div>
              <div className={s.emptyTitle}>SIN SOLICITUDES</div>
              <div className={s.emptyText}>Cuando alguien te quiera agregar como amigo aparecerá aquí.</div>
            </div>
          ) : (
            <div className={s.requestList}>
              {incoming.length > 0 && (
                <>
                  <div className={s.matchSectionTitle} style={{ color: 'var(--accent)' }}>
                    📩 ENTRANTES <span className={s.matchCount}>{incoming.length}</span>
                  </div>
                  {incoming.map(f => {
                    const p = profilesById[f.requester_id]
                    return (
                      <div key={f.id} className={s.requestRow}>
                        <div className={s.userAvatar}>{p?.avatar_emoji || '👤'}</div>
                        <div className={s.userMeta}>
                          <div className={s.userName}>{p?.display_name || 'Coleccionista'}</div>
                          <div className={s.userSub}>Quiere ser tu amigo</div>
                        </div>
                        <div className={s.requestActions}>
                          <button onClick={() => onAccept(f.id)} className={s.btnAccept}>Aceptar</button>
                          <button onClick={() => onReject(f.id)} className={s.btnReject}>Rechazar</button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {outgoing.length > 0 && (
                <>
                  <div className={s.matchSectionTitle} style={{ color: 'var(--text-faint)', marginTop: 14 }}>
                    📤 ENVIADAS <span className={s.matchCount}>{outgoing.length}</span>
                  </div>
                  {outgoing.map(f => {
                    const p = profilesById[f.receiver_id]
                    return (
                      <div key={f.id} className={s.requestRow}>
                        <div className={s.userAvatar}>{p?.avatar_emoji || '👤'}</div>
                        <div className={s.userMeta}>
                          <div className={s.userName}>{p?.display_name || 'Coleccionista'}</div>
                          <div className={s.userSub}>Esperando respuesta…</div>
                        </div>
                        <button onClick={() => onReject(f.id)} className={s.btnSecondary}>Cancelar</button>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
