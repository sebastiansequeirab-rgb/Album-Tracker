import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  loadMyThreads, loadThreadMessages, sendMessage, markThreadRead,
  loadProfile, subscribeToInbox,
} from '../lib/marketplace'
import s from './ChatPanel.module.css'

/* ──────────────────────────────────────────────────────────────────────────
   SVG icons — broadcast × vault. Inline, currentColor for theming.
   Avatar emojis preserved (user identity).
   ────────────────────────────────────────────────────────────────────────── */
const Svg = ({ size = 16, sw = 2, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
)
const IconArrowLeft = (p) => <Svg sw={2.5} {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Svg>
const IconChat      = (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>
const IconSend      = (p) => <Svg sw={2.5} {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Svg>
const IconAlert     = (p) => <Svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>
const IconHand      = (p) => <Svg {...p}><path d="M11 17l2 2a1 1 0 1 0 3-3"/><path d="M14 14l3 3a1 1 0 0 0 3-3l-7-7-3 3"/><path d="M3 7l4-4 4 4-4 4-4-4z"/><path d="M7 11l-4 4 3 3 4-4"/></Svg>
const IconRetry     = (p) => <Svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Svg>
const IconClock     = (p) => <Svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>
const IconWave      = (p) => <Svg {...p}><path d="M2 12c2 0 2-3 4-3s2 6 4 6 2-9 4-9 2 6 4 6 2-3 4-3"/></Svg>

export default function ChatPanel({
  myId,
  myProfile,
  initialCounterpartId,
  profilesById,
  onActiveCounterpartChange,
  onMessagesChanged,
  flash,
}) {
  const [threads,         setThreads]         = useState([])
  const [activeCpId,      setActiveCpId]      = useState(initialCounterpartId || null)
  const [activeProfile,   setActiveProfile]   = useState(null)
  const [messages,        setMessages]        = useState([])
  const [draft,           setDraft]           = useState('')
  const [loadingList,     setLoadingList]     = useState(false)
  const [loadingThread,   setLoadingThread]   = useState(false)
  const [sending,         setSending]         = useState(false)
  const scrollRef = useRef(null)
  const rootRef   = useRef(null)

  // Asegurar que el panel quede a la vista cuando montamos / abrimos un hilo
  useLayoutEffect(() => {
    if (rootRef.current && typeof window !== 'undefined') {
      // Scroll al top de la ventana para que el panel sea visible
      window.scrollTo(0, 0)
      // Y también scrollIntoView del propio panel por si hay containers anidados
      rootRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [activeCpId])

  const [listError, setListError] = useState(null)

  // Cargar lista de hilos
  const reloadThreads = async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const t = await loadMyThreads(myId)
      setThreads(Array.isArray(t) ? t : [])
    } catch(e) {
      console.error('loadMyThreads error:', e)
      setListError(e?.message || 'Error cargando mensajes')
      flash?.(`⚠️ ${e?.message || 'Error cargando mensajes'}`, '#F87171')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    reloadThreads()
    /* eslint-disable-next-line */
  }, [myId])

  // Si recibimos initialCounterpartId desde fuera (ej: clic en "Chat" en drill-down),
  // abrir ese hilo
  useEffect(() => {
    if (initialCounterpartId && initialCounterpartId !== activeCpId) {
      setActiveCpId(initialCounterpartId)
    }
  }, [initialCounterpartId])  // eslint-disable-line

  // Realtime: escuchar nuevos mensajes entrantes y refrescar threads/messages.
  // CUALQUIER throw acá rompe el render del componente, así que envolvemos todo
  // en try/catch y validamos el shape del payload.
  useEffect(() => {
    let unsub = () => {}
    try {
      unsub = subscribeToInbox(myId, (newMsg) => {
        try {
          if (!newMsg?.sender_id) return
          setActiveCpId(curCp => {
            if (curCp === newMsg.sender_id) {
              setMessages(prev => [...prev, newMsg])
              markThreadRead(myId, newMsg.sender_id).catch(() => {})
              onMessagesChanged?.()
            } else {
              flash?.('💬 Nuevo mensaje','#FCD34D')
            }
            return curCp
          })
          reloadThreads()
          onMessagesChanged?.()
        } catch (e) {
          console.warn('Realtime callback error:', e)
        }
      })
    } catch (e) {
      console.warn('subscribeToInbox setup error:', e)
    }
    return () => { try { unsub?.() } catch {} }
  }, [myId])  // eslint-disable-line

  // Cargar mensajes del hilo activo + profile
  useEffect(() => {
    let cancelled = false
    if (!activeCpId) {
      setMessages([])
      setActiveProfile(null)
      return
    }
    onActiveCounterpartChange?.(activeCpId)
    setLoadingThread(true)
    ;(async () => {
      try {
        const [msgs, prof] = await Promise.all([
          loadThreadMessages(myId, activeCpId),
          profilesById?.[activeCpId]
            ? Promise.resolve(profilesById[activeCpId])
            : loadProfile(activeCpId),
        ])
        if (cancelled) return
        setMessages(Array.isArray(msgs) ? msgs : [])
        setActiveProfile(prof || null)
        await markThreadRead(myId, activeCpId).catch(() => {})
        onMessagesChanged?.()
      } catch(e) {
        console.error('loadThreadMessages error:', e)
        if (!cancelled) flash?.(`⚠️ ${e?.message || 'Error cargando hilo'}`, '#F87171')
      } finally {
        if (!cancelled) setLoadingThread(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeCpId, myId])  // eslint-disable-line

  // Auto-scroll al fondo cuando cambian mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const onSend = async () => {
    const text = draft.trim()
    if (!text || sending || !activeCpId) return
    setSending(true)
    try {
      const m = await sendMessage(myId, activeCpId, text)
      setMessages(prev => [...prev, m])
      setDraft('')
      reloadThreads()
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'No se pudo enviar'}`, '#F87171')
    }
    setSending(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const fmtTime = (iso) => {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    return sameDay
      ? d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })
  }

  // ============================================================ VISTA HILO
  if (activeCpId) {
    return (
      <div ref={rootRef} className={s.threadView}>
        <div className={s.threadHead}>
          <button
            onClick={() => { setActiveCpId(null); onActiveCounterpartChange?.(null) }}
            className={s.backBtn}
            aria-label="Volver"
            type="button">
            <IconArrowLeft size={16}/>
          </button>
          <div className={s.threadAvatar}>{activeProfile?.avatar_emoji || '👤'}</div>
          <div className={s.threadHeadBody}>
            <div className={s.threadHeadName}>
              {activeProfile?.display_name || (loadingThread ? 'Cargando…' : 'Coleccionista')}
            </div>
            <div className={s.threadHeadSub}>
              <span className={s.statusDot} aria-hidden/>
              <span>Chat 1:1 · tiempo real</span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className={s.threadScroll}>
          {loadingThread && (
            <div className={s.threadLoading}>
              <IconClock size={28}/>
              <span>Cargando conversación…</span>
            </div>
          )}
          {!loadingThread && messages.length === 0 && (
            <div className={s.threadEmpty}>
              <div className={s.threadEmptyIcon}><IconWave size={32} sw={1.5}/></div>
              <div className={s.threadEmptyTitle}>SIN MENSAJES TODAVÍA</div>
              <div className={s.threadEmptyText}>
                Mandá el primero abajo para empezar la conversación.
              </div>
            </div>
          )}
          {messages.map(m => {
            const mine = m.sender_id === myId
            const isSystem = m.content.startsWith('🤝 ')
            return (
              <div key={m.id} className={`${s.bubbleRow} ${mine ? s.bubbleRowMine : ''} ${isSystem ? s.bubbleRowSystem : ''}`}>
                <div className={`${s.bubble} ${mine ? s.bubbleMine : s.bubbleTheirs} ${isSystem ? s.bubbleSystem : ''}`}>
                  {isSystem && <IconHand size={13} className={s.bubbleSystemIcon}/>}
                  <div className={s.bubbleContent}>{m.content}</div>
                  <div className={s.bubbleTime}>{fmtTime(m.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={s.composer}>
          <textarea
            className={s.composerInput}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribí un mensaje…"
            rows={1}
            maxLength={2000}
          />
          <button
            onClick={onSend}
            disabled={sending || !draft.trim()}
            className={s.composerSend}
            aria-label="Enviar"
            type="button">
            {sending ? <IconClock size={16}/> : <IconSend size={16}/>}
          </button>
        </div>
      </div>
    )
  }

  // ============================================================ VISTA LISTA
  // Header siempre visible — garantiza que el panel nunca quede en blanco
  // aunque loadMyThreads falle o devuelva null.
  const safeThreads = Array.isArray(threads) ? threads : []
  return (
    <div ref={rootRef} className={s.listView}>
      <div className={s.listHeader}>
        <span className={s.listHeaderNum}>05</span>
        <h3 className={s.listHeaderTitle}>Mensajes</h3>
        <span className={s.listHeaderRule} aria-hidden/>
        <span className={s.listHeaderSub}>
          {safeThreads.length === 0
            ? 'Sin hilos'
            : `${safeThreads.length} ${safeThreads.length === 1 ? 'hilo' : 'hilos'}`}
        </span>
      </div>

      {loadingList && (
        <div className={s.listLoading}>
          <IconClock size={28}/>
          <span>Cargando hilos…</span>
        </div>
      )}

      {!loadingList && listError && (
        <div className={s.listEmpty}>
          <div className={s.listEmptyIcon} data-tone="alert"><IconAlert size={32} sw={1.6}/></div>
          <div className={s.listEmptyTitle}>ERROR CARGANDO MENSAJES</div>
          <div className={s.listEmptyText}>{listError}</div>
          <button onClick={reloadThreads} className={s.listRetry} type="button">
            <IconRetry size={14}/> <span>Reintentar</span>
          </button>
        </div>
      )}

      {!loadingList && !listError && safeThreads.length === 0 && (
        <div className={s.listEmpty}>
          <div className={s.listEmptyIcon}><IconChat size={32} sw={1.5}/></div>
          <div className={s.listEmptyTitle}>SIN MENSAJES AÚN</div>
          <div className={s.listEmptyText}>
            Tap "Iniciar chat" en cualquier oferta para empezar una conversación.
          </div>
        </div>
      )}

      {!loadingList && !listError && safeThreads.length > 0 && (
        <div className={s.threadItems}>
          {safeThreads.map(t => {
            if (!t?.counterpart_id) return null
            const prof = profilesById?.[t.counterpart_id]
            const isFromMe = t.last_sender_id === myId
            const hasUnread = t.unread_count > 0
            return (
              <button
                key={t.counterpart_id}
                type="button"
                onClick={() => setActiveCpId(t.counterpart_id)}
                className={`${s.threadItem} ${hasUnread ? s.threadItemUnread : ''}`}>
                <div className={s.threadItemAvatar}>{prof?.avatar_emoji || '👤'}</div>
                <div className={s.threadItemBody}>
                  <div className={s.threadItemHead}>
                    <span className={s.threadItemName}>{prof?.display_name || 'Coleccionista'}</span>
                    <span className={s.threadItemTime}>{fmtTime(t.last_message_at)}</span>
                  </div>
                  <div className={s.threadItemPreview}>
                    {isFromMe && <span className={s.threadItemMe}>Tú: </span>}
                    {t.last_message}
                  </div>
                </div>
                {hasUnread && (
                  <span className={s.threadItemBadge}>{t.unread_count}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
