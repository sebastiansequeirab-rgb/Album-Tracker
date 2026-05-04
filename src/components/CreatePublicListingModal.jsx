import { useState, useMemo } from 'react'
import { createPublicListing } from '../lib/marketplace'
import s from './CreatePublicListingModal.module.css'

export default function CreatePublicListingModal({
  open,
  onClose,
  onCreated,
  myId,
  albumType,
  myCol,
  allItems,
  myProfile,
  flash,
}) {
  const [offered, setOffered] = useState(new Set())
  const [wanted,  setWanted]  = useState(new Set())
  const [note,    setNote]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [tab,     setTab]     = useState('offered') // 'offered' | 'wanted'
  const [meetingPoint, setMeetingPoint] = useState('')
  const [meetingPointId, setMeetingPointId] = useState('default')
  const [meetingTime,  setMeetingTime]  = useState('')

  const myMeetingPoints = Array.isArray(myProfile?.meeting_points) ? myProfile.meeting_points : []

  const myDups = useMemo(() => allItems.filter(c => myCol[c.id] === 'duplicate'), [allItems, myCol])
  const myMissing = useMemo(() => allItems.filter(c => (myCol[c.id] || 'missing') === 'missing'), [allItems, myCol])

  if (!open) return null

  const togglePick = (which, id) => {
    if (which === 'offered') {
      setOffered(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
    } else {
      setWanted(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
    }
  }

  const onSubmit = async () => {
    if (offered.size === 0 && wanted.size === 0) {
      setErr('Tenés que ofrecer o pedir al menos una carta.')
      return
    }
    setBusy(true); setErr('')
    try {
      // Resolver meeting point: dropdown mp del perfil > input libre > null
      let resolvedMeetingPoint = null
      if (meetingPointId === 'other') {
        resolvedMeetingPoint = meetingPoint.trim() || null
      } else if (meetingPointId !== 'default') {
        const found = myMeetingPoints.find(mp => mp.id === meetingPointId)
        resolvedMeetingPoint = found ? [found.name, found.hint].filter(Boolean).join(' · ') : null
      }
      const created = await createPublicListing({
        user_id: myId,
        album_type: albumType,
        offered_ids: Array.from(offered),
        wanted_ids: Array.from(wanted),
        note: note.trim() || null,
        meeting_point: resolvedMeetingPoint,
        meeting_time_label: meetingTime.trim() || null,
      })
      flash?.('📢 Oferta publicada','#FCD34D')
      onCreated?.(created)
      onClose?.()
    } catch(e) {
      setErr(e.message || 'No se pudo publicar')
    }
    setBusy(false)
  }

  const list = tab === 'offered' ? myDups : myMissing
  const picked = tab === 'offered' ? offered : wanted

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.card} onClick={e => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>📢 CREAR OFERTA PÚBLICA</div>
            <div className={s.sub}>Visible para todos los coleccionistas del marketplace</div>
          </div>
          <button onClick={onClose} className={s.close} aria-label="Cerrar">×</button>
        </div>

        <div className={s.tabRow}>
          <button
            type="button"
            onClick={() => setTab('offered')}
            className={`${s.tab} ${tab === 'offered' ? s.tabActive : ''}`}>
            OFREZCO <span className={s.tabCount}>{offered.size}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('wanted')}
            className={`${s.tab} ${tab === 'wanted' ? s.tabActive : ''}`}>
            BUSCO <span className={s.tabCount}>{wanted.size}</span>
          </button>
        </div>

        <div className={s.list}>
          {list.length === 0 ? (
            <div className={s.empty}>
              {tab === 'offered'
                ? 'No tenés cartas duplicadas todavía. Marcá algunas como "Repetida" en tu álbum.'
                : 'No tenés cartas faltantes — ¡buen trabajo! 🎉'}
            </div>
          ) : (
            list.map(c => {
              const isPicked = picked.has(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => togglePick(tab, c.id)}
                  className={`${s.item} ${isPicked ? s.itemPicked : ''}`}>
                  <span className={s.itemCheck}>{isPicked ? '☑' : '☐'}</span>
                  <span className={s.itemFlag}>{c.flag}</span>
                  <div className={s.itemBody}>
                    <div className={s.itemName}>{c.name}</div>
                    <div className={s.itemMeta}>{c.team} · {c.type}</div>
                  </div>
                  <span className={s.itemNum}>#{c.num}</span>
                </button>
              )
            })
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>📍 PUNTO DE ENCUENTRO (opcional)</label>
          <select
            className={s.input}
            value={meetingPointId}
            onChange={e => setMeetingPointId(e.target.value)}>
            <option value="default">— Sin definir —</option>
            {myMeetingPoints.map(mp => (
              <option key={mp.id} value={mp.id}>{mp.name}{mp.hint ? ` (${mp.hint})` : ''}</option>
            ))}
            <option value="other">Otro (escribir)</option>
          </select>
          {meetingPointId === 'other' && (
            <input
              className={s.input}
              type="text"
              maxLength={120}
              value={meetingPoint}
              onChange={e => setMeetingPoint(e.target.value)}
              placeholder="Ej: Sambil Caracas, planta baja"
              style={{ marginTop: 8 }}
            />
          )}
          {myMeetingPoints.length === 0 && meetingPointId === 'default' && (
            <div className={s.fieldHint}>
              Tip: agregá tus puntos habituales en Perfil para reusarlos.
            </div>
          )}
        </div>

        <div className={s.field}>
          <label className={s.label}>⏰ HORA / DISPONIBILIDAD (opcional)</label>
          <input
            className={s.input}
            type="text"
            maxLength={80}
            value={meetingTime}
            onChange={e => setMeetingTime(e.target.value)}
            placeholder="Ej: Sábados AM, lunes a viernes después de 5pm"
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>📝 NOTA (opcional)</label>
          <textarea
            className={s.textarea}
            maxLength={500}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Cualquier detalle extra"
          />
          <div className={s.charCount}>{note.length}/500</div>
        </div>

        {err && <div className={s.err}>⚠️ {err}</div>}

        <button onClick={onSubmit} disabled={busy} className={s.cta}>
          {busy ? 'Publicando…' : 'Publicar oferta'}
        </button>
      </div>
    </div>
  )
}
