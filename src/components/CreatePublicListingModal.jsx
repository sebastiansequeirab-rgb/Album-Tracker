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
  flash,
}) {
  const [offered, setOffered] = useState(new Set())
  const [wanted,  setWanted]  = useState(new Set())
  const [note,    setNote]    = useState('')
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')
  const [tab,     setTab]     = useState('offered') // 'offered' | 'wanted'

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
      const created = await createPublicListing({
        user_id: myId,
        album_type: albumType,
        offered_ids: Array.from(offered),
        wanted_ids: Array.from(wanted),
        note: note.trim() || null,
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
          <label className={s.label}>📝 NOTA (opcional)</label>
          <textarea
            className={s.textarea}
            maxLength={500}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ej: Solo intercambios en Caracas, prefiero por Instagram"
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
