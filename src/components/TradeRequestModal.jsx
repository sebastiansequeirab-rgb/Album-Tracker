import { useState, useMemo } from 'react'
import { createTradeRequest } from '../lib/marketplace'
import s from './TradeRequestModal.module.css'

export default function TradeRequestModal({
  open,
  onClose,
  onSent,
  myId,
  targetProfile,
  albumType,
  itemsById,
  offeredIds = [],
  wantedIds = [],
  flash,
}) {
  const [meetingPointId, setMeetingPointId] = useState('default')
  const [meetingPointFree, setMeetingPointFree] = useState('')
  const [timeMode, setTimeMode] = useState('label') // 'exact' | 'label'
  const [timeExact, setTimeExact] = useState('')
  const [timeLabel, setTimeLabel] = useState('')
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [err,       setErr]       = useState('')

  const targetPoints = Array.isArray(targetProfile?.meeting_points) ? targetProfile.meeting_points : []

  const offeredCards = useMemo(() => offeredIds.map(id => itemsById[id]).filter(Boolean), [offeredIds, itemsById])
  const wantedCards  = useMemo(() => wantedIds.map(id => itemsById[id]).filter(Boolean),  [wantedIds, itemsById])

  if (!open) return null

  const meetingPointResolved = () => {
    if (meetingPointId === 'other') return meetingPointFree.trim() || null
    if (meetingPointId === 'default') return null
    const found = targetPoints.find(mp => mp.id === meetingPointId)
    return found ? [found.name, found.hint].filter(Boolean).join(' · ') : null
  }

  const onSend = async () => {
    if (offeredIds.length === 0 && wantedIds.length === 0) {
      setErr('Tenés que seleccionar al menos una carta para ofrecer o pedir.')
      return
    }
    setSending(true); setErr('')
    try {
      const meeting_point = meetingPointResolved()
      const meeting_time_exact = timeMode === 'exact' && timeExact ? new Date(timeExact).toISOString() : null
      const meeting_time_label = timeMode === 'label' && timeLabel.trim() ? timeLabel.trim() : null
      const created = await createTradeRequest({
        initiator_id: myId,
        target_id: targetProfile.user_id,
        album_type: albumType,
        offered_ids: offeredIds,
        wanted_ids: wantedIds,
        meeting_point,
        meeting_time_exact,
        meeting_time_label,
        message: message.trim() || null,
      })
      flash?.('🤝 Solicitud enviada','#FCD34D')
      onSent?.(created)
      onClose?.()
    } catch(e) {
      setErr(e.message || 'No se pudo enviar la solicitud')
    }
    setSending(false)
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>🤝 PROPONER TRADE</div>
            <div className={s.sub}>A {targetProfile?.display_name || 'Coleccionista'}</div>
          </div>
          <button onClick={onClose} className={s.close} aria-label="Cerrar">×</button>
        </div>

        <div className={s.summary}>
          <div className={s.summarySide}>
            <div className={s.summaryLabel}>OFRECES <span className={s.summaryCount}>{offeredIds.length}</span></div>
            <CardPreview cards={offeredCards} empty="Nada por ahora" />
          </div>
          <div className={s.summarySide}>
            <div className={s.summaryLabel}>PIDES <span className={s.summaryCount}>{wantedIds.length}</span></div>
            <CardPreview cards={wantedCards} empty="Nada por ahora" />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>📍 PUNTO DE ENCUENTRO</label>
          <select className={s.input} value={meetingPointId} onChange={e => setMeetingPointId(e.target.value)}>
            <option value="default">— Sin definir aún —</option>
            {targetPoints.map(mp => (
              <option key={mp.id} value={mp.id}>{mp.name}{mp.hint ? ` (${mp.hint})` : ''}</option>
            ))}
            <option value="other">Otro (escribir)</option>
          </select>
          {meetingPointId === 'other' && (
            <input
              className={s.input}
              type="text"
              maxLength={120}
              value={meetingPointFree}
              onChange={e => setMeetingPointFree(e.target.value)}
              placeholder="Ej: Sambil Caracas, planta baja"
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>⏰ HORA</label>
          <div className={s.timeToggle}>
            <button
              type="button"
              onClick={() => setTimeMode('label')}
              className={`${s.timeBtn} ${timeMode === 'label' ? s.timeBtnActive : ''}`}>
              Periodo libre
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('exact')}
              className={`${s.timeBtn} ${timeMode === 'exact' ? s.timeBtnActive : ''}`}>
              Hora exacta
            </button>
          </div>
          {timeMode === 'label' && (
            <input
              className={s.input}
              type="text"
              maxLength={80}
              value={timeLabel}
              onChange={e => setTimeLabel(e.target.value)}
              placeholder="Ej: Mañana en la tarde, sábado AM"
              style={{ marginTop: 8 }}
            />
          )}
          {timeMode === 'exact' && (
            <input
              className={s.input}
              type="datetime-local"
              value={timeExact}
              onChange={e => setTimeExact(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>💬 MENSAJE (opcional)</label>
          <textarea
            className={s.textarea}
            maxLength={500}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Una nota corta para coordinar el trade…"
          />
          <div className={s.charCount}>{message.length}/500</div>
        </div>

        {err && <div className={s.err}>⚠️ {err}</div>}

        <button onClick={onSend} disabled={sending} className={s.cta}>
          {sending ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </div>
    </div>
  )
}

function CardPreview({ cards, empty }) {
  if (cards.length === 0) {
    return <div className={s.previewEmpty}>{empty}</div>
  }
  const visible = cards.slice(0, 4)
  const more = cards.length - visible.length
  return (
    <div className={s.previewList}>
      {visible.map(c => (
        <div key={c.id} className={s.previewItem}>
          <span className={s.previewFlag}>{c.flag}</span>
          <span className={s.previewNum}>#{c.num}</span>
          <span className={s.previewName}>{c.name}</span>
        </div>
      ))}
      {more > 0 && <div className={s.previewMore}>+{more} más</div>}
    </div>
  )
}
