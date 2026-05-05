import { useState, useMemo } from 'react'
import { createPublicListing } from '../lib/marketplace'
import s from './CreatePublicListingModal.module.css'

/* ── Inline SVG icons (no emojis in chrome) ──────────────────────────── */
const IconPlus = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <line x1="12" y1="5"  x2="12" y2="19" />
    <line x1="5"  y1="12" x2="19" y2="12" />
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
const IconNote = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8"  y1="13" x2="16" y2="13" />
    <line x1="8"  y1="17" x2="13" y2="17" />
  </svg>
)
const IconCheck = (p) => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconAlert = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9"  x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

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
      flash?.('Oferta publicada', '#FCD34D')
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
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <header className={s.head}>
          <div className={s.headTitleRow}>
            <span className={s.headIcon} aria-hidden="true"><IconPlus /></span>
            <div className={s.headCopy}>
              <h2 className={s.title}>NUEVA OFERTA</h2>
              <div className={s.headRule} aria-hidden="true" />
            </div>
          </div>
          <button onClick={onClose} className={s.close} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <p className={s.sub}>Visible para todos los coleccionistas del marketplace</p>

        {/* Tabs (broadcast pill) */}
        <div className={s.tabRow} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'offered'}
            onClick={() => setTab('offered')}
            className={`${s.tab} ${tab === 'offered' ? s.tabActive : ''}`}>
            <span>OFREZCO</span>
            <span className={s.tabCount}>{offered.size}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wanted'}
            onClick={() => setTab('wanted')}
            className={`${s.tab} ${tab === 'wanted' ? s.tabActive : ''}`}>
            <span>BUSCO</span>
            <span className={s.tabCount}>{wanted.size}</span>
          </button>
        </div>

        <div className={s.list}>
          {list.length === 0 ? (
            <div className={s.empty}>
              {tab === 'offered'
                ? 'No tenés cartas duplicadas todavía. Marcá algunas como "Repetida" en tu álbum.'
                : 'No tenés cartas faltantes — ¡buen trabajo!'}
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
                  <span className={`${s.itemCheck} ${isPicked ? s.itemCheckOn : ''}`} aria-hidden="true">
                    {isPicked && <IconCheck />}
                  </span>
                  <span className={s.itemFlag} aria-hidden="true">{c.flag}</span>
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

        {/* Meeting point */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>01</span>
            <span className={s.labelIcon} aria-hidden="true"><IconPin /></span>
            <span className={s.labelText}>PUNTO DE ENCUENTRO (OPCIONAL)</span>
          </div>
          <div className={s.inputBox}>
            <select
              className={s.select}
              value={meetingPointId}
              onChange={e => setMeetingPointId(e.target.value)}>
              <option value="default">— Sin definir —</option>
              {myMeetingPoints.map(mp => (
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
                value={meetingPoint}
                onChange={e => setMeetingPoint(e.target.value)}
                placeholder="Ej: Sambil Caracas, planta baja"
              />
            </div>
          )}
          {myMeetingPoints.length === 0 && meetingPointId === 'default' && (
            <div className={s.fieldHint}>
              Tip: agregá tus puntos habituales en Perfil para reusarlos.
            </div>
          )}
        </section>

        {/* Hora */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>02</span>
            <span className={s.labelIcon} aria-hidden="true"><IconClock /></span>
            <span className={s.labelText}>HORA / DISPONIBILIDAD (OPCIONAL)</span>
          </div>
          <div className={s.inputBox}>
            <input
              className={s.input}
              type="text"
              maxLength={80}
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
              placeholder="Ej: Sábados AM, lunes a viernes después de 5pm"
            />
          </div>
        </section>

        {/* Nota */}
        <section className={s.field}>
          <div className={s.label}>
            <span className={s.labelNum}>03</span>
            <span className={s.labelIcon} aria-hidden="true"><IconNote /></span>
            <span className={s.labelText}>NOTA (OPCIONAL)</span>
          </div>
          <div className={s.inputBox}>
            <textarea
              className={s.textarea}
              maxLength={500}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Cualquier detalle extra"
            />
          </div>
          <div className={s.charCount}>{note.length}/500</div>
        </section>

        {err && (
          <div className={s.err}>
            <span aria-hidden="true"><IconAlert /></span>
            <span>{err}</span>
          </div>
        )}

        <div className={s.ctaStack}>
          <button onClick={onSubmit} disabled={busy} className={s.cta}>
            {busy ? 'PUBLICANDO…' : 'PUBLICAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
