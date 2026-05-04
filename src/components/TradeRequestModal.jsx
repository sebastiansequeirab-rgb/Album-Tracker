import { useState, useMemo, useEffect } from 'react'
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
  allItems = [],
  myCol = {},
  targetCol = {},
  prefillOfferedIds = [],
  prefillWantedIds = [],
  prefillMeetingPoint = '',
  prefillMeetingTime = '',
  flash,
}) {
  // ────────── Estado interno (controlado dentro del modal, editable) ──────────
  const [offered, setOffered] = useState(() => new Set(prefillOfferedIds))
  const [wanted,  setWanted]  = useState(() => new Set(prefillWantedIds))
  const [pickerTab, setPickerTab] = useState('offered') // 'offered' | 'wanted'
  const [onlyMatches, setOnlyMatches] = useState(false)
  const [meetingPointId, setMeetingPointId] = useState(prefillMeetingPoint ? 'other' : 'default')
  const [meetingPointFree, setMeetingPointFree] = useState(prefillMeetingPoint)
  const [timeMode, setTimeMode] = useState('label') // 'exact' | 'label'
  const [timeExact, setTimeExact] = useState('')
  const [timeLabel, setTimeLabel] = useState(prefillMeetingTime)
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [err,       setErr]       = useState('')

  // Re-sync state cuando se abre el modal con nuevos prefills
  useEffect(() => {
    if (open) {
      setOffered(new Set(prefillOfferedIds))
      setWanted(new Set(prefillWantedIds))
      setPickerTab('offered')
      setOnlyMatches(false)
      setMeetingPointId(prefillMeetingPoint ? 'other' : 'default')
      setMeetingPointFree(prefillMeetingPoint || '')
      setTimeLabel(prefillMeetingTime || '')
      setTimeExact('')
      setTimeMode('label')
      setMessage('')
      setErr('')
      setSending(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const targetPoints = Array.isArray(targetProfile?.meeting_points) ? targetProfile.meeting_points : []

  // ────────── Compute lists para el picker ──────────
  const myDups = useMemo(() => allItems.filter(c => myCol[c.id] === 'duplicate'), [allItems, myCol])
  const targetDups = useMemo(() => allItems.filter(c => targetCol[c.id] === 'duplicate'), [allItems, targetCol])
  const myMissingSet = useMemo(() => {
    const out = new Set()
    for (const c of allItems) if ((myCol[c.id] || 'missing') === 'missing') out.add(c.id)
    return out
  }, [allItems, myCol])
  const targetMissingSet = useMemo(() => {
    const out = new Set()
    for (const c of allItems) if ((targetCol[c.id] || 'missing') === 'missing') out.add(c.id)
    return out
  }, [allItems, targetCol])

  // OFRECES — mis dups que el target le falten primero
  const offeredList = useMemo(() => {
    const filtered = onlyMatches
      ? myDups.filter(c => targetMissingSet.has(c.id))
      : myDups
    return [...filtered].sort((a, b) => {
      const aMatch = targetMissingSet.has(a.id) ? 0 : 1
      const bMatch = targetMissingSet.has(b.id) ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      return (a.num || 0) - (b.num || 0)
    })
  }, [myDups, targetMissingSet, onlyMatches])

  // PIDES — sus dups que me falten primero
  const wantedList = useMemo(() => {
    const filtered = onlyMatches
      ? targetDups.filter(c => myMissingSet.has(c.id))
      : targetDups
    return [...filtered].sort((a, b) => {
      const aMatch = myMissingSet.has(a.id) ? 0 : 1
      const bMatch = myMissingSet.has(b.id) ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      return (a.num || 0) - (b.num || 0)
    })
  }, [targetDups, myMissingSet, onlyMatches])

  if (!open) return null

  const meetingPointResolved = () => {
    if (meetingPointId === 'other') return meetingPointFree.trim() || null
    if (meetingPointId === 'default') return null
    const found = targetPoints.find(mp => mp.id === meetingPointId)
    return found ? [found.name, found.hint].filter(Boolean).join(' · ') : null
  }

  const toggleOffered = (id) => setOffered(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })
  const toggleWanted = (id) => setWanted(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const onSend = async () => {
    setErr('')
    if (offered.size === 0 && wanted.size === 0) {
      setErr('Tenés que seleccionar al menos una carta para ofrecer o pedir.')
      return
    }
    if (!targetProfile?.user_id) {
      setErr('Falta el destinatario del trade. Cerrá el modal y reintentá.')
      return
    }
    setSending(true)
    try {
      const meeting_point = meetingPointResolved()
      const meeting_time_exact = timeMode === 'exact' && timeExact ? new Date(timeExact).toISOString() : null
      const meeting_time_label = timeMode === 'label' && timeLabel.trim() ? timeLabel.trim() : null
      const payload = {
        initiator_id: myId,
        target_id: targetProfile.user_id,
        album_type: albumType,
        offered_ids: Array.from(offered),
        wanted_ids: Array.from(wanted),
        meeting_point,
        meeting_time_exact,
        meeting_time_label,
        message: message.trim() || null,
      }
      const created = await createTradeRequest(payload)
      flash?.('🤝 Solicitud enviada — abriendo chat…', '#FCD34D')
      onSent?.(created)
      onClose?.()
    } catch (e) {
      console.error('TradeRequestModal.onSend error:', e)
      setErr(e?.message || 'No se pudo enviar la solicitud. Reintentá.')
    } finally {
      setSending(false)
    }
  }

  const list = pickerTab === 'offered' ? offeredList : wantedList
  const picked = pickerTab === 'offered' ? offered : wanted
  const onTogglePick = pickerTab === 'offered' ? toggleOffered : toggleWanted
  const matchSet = pickerTab === 'offered' ? targetMissingSet : myMissingSet

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

        {/* Tabs picker */}
        <div className={s.pickerTabs}>
          <button
            type="button"
            onClick={() => setPickerTab('offered')}
            className={`${s.pickerTab} ${pickerTab === 'offered' ? s.pickerTabActive : ''}`}>
            OFREZCO <span className={s.pickerTabCount}>{offered.size}</span>
          </button>
          <button
            type="button"
            onClick={() => setPickerTab('wanted')}
            className={`${s.pickerTab} ${pickerTab === 'wanted' ? s.pickerTabActive : ''}`}>
            PIDO <span className={s.pickerTabCount}>{wanted.size}</span>
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

        {/* Picker list */}
        <div className={s.pickerList}>
          {list.length === 0 ? (
            <div className={s.pickerEmpty}>
              {pickerTab === 'offered'
                ? (myDups.length === 0
                    ? 'No tenés cartas marcadas como duplicadas todavía.'
                    : 'No tenés duplicadas que le falten al otro coleccionista.')
                : (targetDups.length === 0
                    ? 'El otro coleccionista no tiene duplicadas para ofrecerte.'
                    : 'Sus duplicadas no matchean con tus faltantes (desactivá "Solo matches" para ver todas).')}
            </div>
          ) : (
            list.map(c => {
              const isPicked = picked.has(c.id)
              const isMatch = matchSet.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onTogglePick(c.id)}
                  className={`${s.pickerItem} ${isPicked ? s.pickerItemPicked : ''}`}>
                  <span className={s.pickerCheck}>{isPicked ? '☑' : '☐'}</span>
                  <span className={s.pickerFlag}>{c.flag}</span>
                  <div className={s.pickerBody}>
                    <div className={s.pickerName}>
                      {c.name}
                      {isMatch && <span className={s.pickerMatch}>★ matchea</span>}
                    </div>
                    <div className={s.pickerMeta}>{c.team} · {c.type}</div>
                  </div>
                  <span className={s.pickerNum}>#{c.num}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Meeting point + hora + mensaje */}
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

        {/* Footer fijo: contador + CTA */}
        <div className={s.footer}>
          <div className={s.footerCount}>
            <strong>{wanted.size}</strong> pides · <strong>{offered.size}</strong> ofreces
          </div>
          <button onClick={onSend} disabled={sending} className={s.cta}>
            {sending ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}
