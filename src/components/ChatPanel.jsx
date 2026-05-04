import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  loadMyThreads, loadThreadMessages, sendMessage, markThreadRead,
  loadProfile, subscribeToInbox,
} from '../lib/marketplace'
import s from './ChatPanel.module.css'

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

  // Cargar lista de hilos
  const reloadThreads = async () => {
    setLoadingList(true)
    try {
      const t = await loadMyThreads(myId)
      setThreads(t)
    } catch(e) {
      flash?.(`⚠️ ${e.message || 'Error cargando mensajes'}`, '#F87171')
    }
    setLoadingList(false)
  }

  useEffect(() => {
    reloadThreads()
    /* eslint-disable-next-line */
  }, [myId])

  // Si recibimos initialCounterpartId desde fuera (ej: clic en "💬 Chat" en drill-down),
  // abrir ese hilo
  useEffect(() => {
    if (initialCounterpartId && initialCounterpartId !== activeCpId) {
      setActiveCpId(initialCounterpartId)
    }
  }, [initialCounterpartId])  // eslint-disable-line

  // Realtime: escuchar nuevos mensajes entrantes y refrescar threads/messages
  useEffect(() => {
    const unsub = subscribeToInbox(myId, async (newMsg) => {
      // Si tenemos hilo abierto con ese sender, append + mark-read
      setActiveCpId(curCp => {
        if (curCp === newMsg.sender_id) {
          setMessages(prev => [...prev, newMsg])
          // mark-read inmediato
          markThreadRead(myId, newMsg.sender_id).catch(() => {})
          onMessagesChanged?.() // refrescar global unread
        } else {
          // notificación leve
          flash?.('💬 Nuevo mensaje','#FCD34D')
        }
        return curCp
      })
      reloadThreads()
      onMessagesChanged?.()
    })
    return unsub
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
        setMessages(msgs)
        setActiveProfile(prof)
        // Mark-read silencioso
        await markThreadRead(myId, activeCpId).catch(() => {})
        onMessagesChanged?.()
      } catch(e) {
        flash?.(`⚠️ ${e.message || 'Error cargando hilo'}`, '#F87171')
      }
      setLoadingThread(false)
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
            aria-label="Volver">←</button>
          <div className={s.threadAvatar}>{activeProfile?.avatar_emoji || '👤'}</div>
          <div className={s.threadHeadBody}>
            <div className={s.threadHeadName}>
              {activeProfile?.display_name || (loadingThread ? 'Cargando…' : 'Coleccionista')}
            </div>
            <div className={s.threadHeadSub}>💬 Chat 1:1 · en tiempo real</div>
          </div>
        </div>

        <div ref={scrollRef} className={s.threadScroll}>
          {loadingThread && (
            <div className={s.threadLoading}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Cargando conversación…
            </div>
          )}
          {!loadingThread && messages.length === 0 && (
            <div className={s.threadEmpty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
              Todavía no hay mensajes en este hilo.<br/>
              Mandá el primero abajo.
            </div>
          )}
          {messages.map(m => {
            const mine = m.sender_id === myId
            const isSystem = m.content.startsWith('🤝 ')
            return (
              <div key={m.id} className={`${s.bubbleRow} ${mine ? s.bubbleRowMine : ''} ${isSystem ? s.bubbleRowSystem : ''}`}>
                <div className={`${s.bubble} ${mine ? s.bubbleMine : s.bubbleTheirs} ${isSystem ? s.bubbleSystem : ''}`}>
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
          <button onClick={onSend} disabled={sending || !draft.trim()} className={s.composerSend}>
            {sending ? '…' : '➤'}
          </button>
        </div>
      </div>
    )
  }

  // ============================================================ VISTA LISTA
  return (
    <div ref={rootRef} className={s.listView}>
      {loadingList && <div className={s.listLoading}>Cargando…</div>}
      {!loadingList && threads.length === 0 && (
        <div className={s.listEmpty}>
          <div className={s.listEmptyEmoji}>💬</div>
          <div className={s.listEmptyTitle}>SIN MENSAJES AÚN</div>
          <div className={s.listEmptyText}>
            Tap "💬 Chat" en el perfil de cualquier coleccionista para empezar.
          </div>
        </div>
      )}
      {threads.map(t => {
        const prof = profilesById?.[t.counterpart_id]
        const isFromMe = t.last_sender_id === myId
        return (
          <button
            key={t.counterpart_id}
            type="button"
            onClick={() => setActiveCpId(t.counterpart_id)}
            className={s.threadItem}>
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
            {t.unread_count > 0 && (
              <span className={s.threadItemBadge}>{t.unread_count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
