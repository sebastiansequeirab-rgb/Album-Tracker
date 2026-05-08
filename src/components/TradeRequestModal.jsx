import { useState, useMemo, useEffect } from 'react'
import { createTradeRequest } from '../lib/marketplace'
import { buildTradeWhatsappText, whatsappHrefForNumber, cleanPhoneNumber } from '../lib/shareMessage'
import s from './TradeRequestModal.module.css'

/* ── Inline SVG icons (no emojis in chrome) ──────────────────────────── */
const IconHandshake = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M11 17l-2 2-3-3 4-4 3 3" />
    <path d="M13 7l2-2 3 3-4 4-3-3" />
    <path d="M5.5 14L3 11.5 5 9.5l2.5 2.5" />
    <path d="M18.5 10L21 12.5 19 14.5 16.5 12" />
    <path d="M12 12l3 3" />
  </svg>
)
const IconClose = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconPin = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconClock = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconChat = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconCheck = (p) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconStar = (p) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)
const IconAlert = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9"  x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export default function TradeRequestModal({
  open,
  onClose,
  onSent,
  myId,
  myProfile,
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
  // ¿El target tiene WhatsApp? Si sí, ofrecemos también disparar wa.me junto
  // con la solicitud al chat interno. El chat se manda SIEMPRE — el toggle solo
  // controla si además abrimos WhatsApp.
  const targetWaClean = cleanPhoneNumber(targetProfile?.contact?.whatsapp || '')
  const [alsoWhatsapp, setAlsoWhatsapp] = useState(true)
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
      // Default ON cuando el target tiene WhatsApp; OFF si no.
      setAlsoWhatsapp(!!targetWaClean)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetWaClean])

  const targetPoints = Array.isArray(targetProfile?.meeting_points) ? targetProfile.meeting_points : []

  // ────────── Compute lists para el picker ──────────
  const myDups = useMemo(() => allItems.filter(c => myCol[c.id] === 'duplicate'), [allItems, myCol])
  // Cualquier carta que tengo (have o duplicate) — usado cuando el usuario quiere
  // ofrecer libremente, incluso una que sea su única copia. La UI marca esas
  // como "única" para que decida.
  const myOwned = useMemo(() => allItems.filter(c => {
    const v = myCol[c.id]
    return v === 'have' || v === 'duplicate'
  }), [allItems, myCol])
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

  // OFRECES — todo lo que tengo (have o duplicate); las que matchean (le faltan
  // al target) van primero, dups antes que únicas.
  const offeredList = useMemo(() => {
    const base = onlyMatches
      ? myDups.filter(c => targetMissingSet.has(c.id))
      : myOwned
    return [...base].sort((a, b) => {
      const aMatch = targetMissingSet.has(a.id) ? 0 : 1
      const bMatch = targetMissingSet.has(b.id) ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      const aDup = myCol[a.id] === 'duplicate' ? 0 : 1
      const bDup = myCol[b.id] === 'duplicate' ? 0 : 1
      if (aDup !== bDup) return aDup - bDup
      return (a.num || 0) - (b.num || 0)
    })
  }, [myDups, myOwned, myCol, targetMissingSet, onlyMatches])

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

      // Si el usuario quiso también avisar por WhatsApp y el target tiene
      // número, abrimos wa.me con el resumen. Esto es ADICIONAL al chat
      // interno — la solicitud ya quedó creada y guardada en DB pase lo que
      // pase con el window.open.
      if (alsoWhatsapp && targetWaClean) {
        const theyGiveMe = allItems.filter(c => wanted.has(c.id))
        const iGiveThem  = allItems.filter(c => offered.has(c.id))
        const waText = buildTradeWhatsappText({
          myName:       myProfile?.display_name || '',
          targetName:   targetProfile?.display_name || '',
          theyGiveMe,
          iGiveThem,
          meetingPoint: meeting_point || '',
          meetingTime:  meeting_time_label || '',
        })
        const waHref = whatsappHrefForNumber(targetWaClean, waText)
        if (waHref && typeof window !== 'undefined') {
          window.open(waHref, '_blank', 'noopener,noreferrer')
        }
      }

      flash?.(
        alsoWhatsapp && targetWaClean
          ? 'Solicitud enviada al chat — abriendo WhatsApp…'
          : 'Solicitud enviada — abriendo chat…',
        '#FCD34D'
      )
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
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <header className={s.head}>
          <div className={s.headTitleRow}>
            <span className={s.headIcon} aria-hidden="true"><IconHandshake /></span>
            <div className={s.headCopy}>
              <h2 className={s.title}>PROPONER TRADE</h2>
              <div className={s.headRule} aria-hidden="true" />
            </div>
          </div>
          <button onClick={onClose} className={s.close} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <p className={s.sub}>
          A <span className={s.subAccent}>{targetProfile?.display_name || 'Coleccionista'}</span>
        </p>

        {/* Tabs picker — broadcast pill */}
        <div className={s.pickerTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pickerTab === 'offered'}
            onClick={() => setPickerTab('offered')}
            className={`${s.pickerTab} ${pickerTab === 'offered' ? s.pickerTabActive : ''}`}>
            <span>OFRECES</span>
            <span className={s.pickerTabCount}>{offered.size}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pickerTab === 'wanted'}
            onClick={() => setPickerTab('wanted')}
            className={`${s.pickerTab} ${pickerTab === 'wanted' ? s.pickerTabActive : ''}`}>
            <span>PIDES</span>
            <span className={s.pickerTabCount}>{wanted.size}</span>
          </button>
        </div>

        <label className={s.filterRow}>
          <span className={`${s.checkbox} ${onlyMatches ? s.checkboxOn : ''}`} aria-hidden="true">
            {onlyMatches && <IconCheck />}
          </span>
          <input
            type="checkbox"
            checked={onlyMatches}
            onChange={e => setOnlyMatches(e.target.checked)}
            className={s.checkboxInput}
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
                  <span className={`${s.pickerCheck} ${isPicked ? s.pickerCheckOn : ''}`} aria-hidden="true">
                    {isPicked && <IconCheck />}
                  </span>
                  <span className={s.pickerFlag} aria-hidden="true">{c.flag}</span>
                  <div className={s.pickerBody}>
                    <div className={s.pickerName}>
                      <span className={s.pickerNameText}>{c.name}</span>
                      {isMatch && (
                        <span className={s.pickerMatch}>
                          <IconStar aria-hidden="true" /> MATCH
                        </span>
                      )}
                    </div>
                    <div className={s.pickerMeta}>{c.team} · {c.type}</div>
                  </div>
                  <span className={s.pickerNum}>#{c.num}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Meeting point */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>01</span>
            <span className={s.labelIcon} aria-hidden="true"><IconPin /></span>
            <span className={s.labelText}>PUNTO DE ENCUENTRO</span>
          </div>
          <div className={s.inputBox}>
            <select
              className={s.select}
              value={meetingPointId}
              onChange={e => setMeetingPointId(e.target.value)}>
              <option value="default">— Sin definir aún —</option>
              {targetPoints.map(mp => (
                <option key={mp.id} value={mp.id}>{mp.name}{mp.hint ? ` (${mp.hint})` : ''}</option>
              ))}
              <option value="other">Otro (escribir)</option>
            </select>
          </div>
          {meetingPointId === 'other' && (
            <div className={s.inputBox} style={{ marginTop: 8 }}>
              <input
                className={s.input}
                type="text"
                maxLength={120}
                value={meetingPointFree}
                onChange={e => setMeetingPointFree(e.target.value)}
                placeholder="Ej: Sambil Caracas, planta baja"
              />
            </div>
          )}
        </section>

        {/* Hora */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>02</span>
            <span className={s.labelIcon} aria-hidden="true"><IconClock /></span>
            <span className={s.labelText}>HORA</span>
          </div>
          <div className={s.timeToggle}>
            <button
              type="button"
              onClick={() => setTimeMode('label')}
              className={`${s.timeBtn} ${timeMode === 'label' ? s.timeBtnActive : ''}`}>
              PERIODO LIBRE
            </button>
            <button
              type="button"
              onClick={() => setTimeMode('exact')}
              className={`${s.timeBtn} ${timeMode === 'exact' ? s.timeBtnActive : ''}`}>
              HORA EXACTA
            </button>
          </div>
          {timeMode === 'label' && (
            <div className={s.inputBox} style={{ marginTop: 8 }}>
              <input
                className={s.input}
                type="text"
                maxLength={80}
                value={timeLabel}
                onChange={e => setTimeLabel(e.target.value)}
                placeholder="Ej: Mañana en la tarde, sábado AM"
              />
            </div>
          )}
          {timeMode === 'exact' && (
            <div className={s.inputBox} style={{ marginTop: 8 }}>
              <input
                className={s.input}
                type="datetime-local"
                value={timeExact}
                onChange={e => setTimeExact(e.target.value)}
              />
            </div>
          )}
        </section>

        {/* Mensaje */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>03</span>
            <span className={s.labelIcon} aria-hidden="true"><IconChat /></span>
            <span className={s.labelText}>MENSAJE (OPCIONAL)</span>
          </div>
          <div className={s.inputBox}>
            <textarea
              className={s.textarea}
              maxLength={500}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Una nota corta para coordinar el trade…"
            />
          </div>
          <div className={s.charCount}>{message.length}/500</div>
        </section>

        {err && (
          <div className={s.err}>
            <span aria-hidden="true"><IconAlert /></span>
            <span>{err}</span>
          </div>
        )}

        {/* Footer fijo: contador + CTA */}
        <div className={s.footer}>
          <div className={s.footerCount}>
            <span className={s.footerCountItem}>
              <strong>{wanted.size}</strong>
              <span>PIDES</span>
            </span>
            <span className={s.footerCountSep} aria-hidden="true">·</span>
            <span className={s.footerCountItem}>
              <strong>{offered.size}</strong>
              <span>OFRECES</span>
            </span>
          </div>

          {/* Checkbox extra: también disparar WhatsApp con el resumen.
              Solo aparece cuando el target dejó número en su perfil. */}
          {targetWaClean && (
            <label className={s.waToggle}>
              <span className={`${s.checkbox} ${alsoWhatsapp ? s.checkboxOn : ''}`} aria-hidden="true">
                {alsoWhatsapp && <IconCheck />}
              </span>
              <input
                type="checkbox"
                checked={alsoWhatsapp}
                onChange={e => setAlsoWhatsapp(e.target.checked)}
                className={s.checkboxInput}
              />
              <span className={s.waToggleLabel}>También avisar por WhatsApp</span>
            </label>
          )}

          <button onClick={onSend} disabled={sending} className={s.cta}>
            {sending ? 'ENVIANDO…' : 'ENVIAR SOLICITUD'}
          </button>
        </div>
      </div>
    </div>
  )
}
