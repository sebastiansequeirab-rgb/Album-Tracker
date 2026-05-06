import { useEffect, useMemo, useState } from 'react'
import s from './QuickUpdateModal.module.css'

const IconClose = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconArrow = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)
const IconHand = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 11V6a2 2 0 0 0-4 0v5"/>
    <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
    <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1-5.5-3l-3.5-6c-.7-1.4 0-2.7 1.5-3 1.5-.3 2.5.5 3.5 2"/>
  </svg>
)
const IconCheck = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconSearch = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const MAX_RESULTS = 60

export default function QuickUpdateModal({
  open,
  onClose,
  cards,           // ALL_ITEMS
  col,             // current collection { id: 'have' | 'duplicate' | 'missing' }
  onApply,         // ({ entered, left, note, partnerId }) => Promise
  prefill,         // optional: { enteredIds, leftIds, partnerId, partnerName, tradeId, note }
}) {
  const [step, setStep] = useState(1)
  const [enteredSet, setEnteredSet] = useState(() => new Set())
  const [leftSet, setLeftSet] = useState(() => new Set())
  const [enteredQuery, setEnteredQuery] = useState('')
  const [leftQuery, setLeftQuery] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [partner, setPartner] = useState({ id: null, name: null })

  useEffect(() => {
    if (!open) return
    if (prefill) {
      setEnteredSet(new Set(prefill.enteredIds || []))
      setLeftSet(new Set(prefill.leftIds || []))
      setNote(prefill.note || (prefill.partnerName ? `Cambio con ${prefill.partnerName}` : ''))
      setPartner({ id: prefill.partnerId || null, name: prefill.partnerName || null })
    } else {
      setEnteredSet(new Set()); setLeftSet(new Set())
      setNote(''); setPartner({ id: null, name: null })
    }
    setStep(1); setEnteredQuery(''); setLeftQuery(''); setSubmitting(false)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const submit = async () => {
    if (submitting) return
    if (enteredSet.size === 0 && leftSet.size === 0) return
    setSubmitting(true)
    try {
      await onApply({
        entered: [...enteredSet],
        left: [...leftSet],
        note: note.trim() || null,
        partnerId: partner.id || null,
      })
      onClose()
    } catch (err) {
      console.warn('QuickUpdate apply failed:', err)
      setSubmitting(false)
    }
  }

  const enteredItems = enteredSet.size === 0
    ? []
    : cards.filter(c => enteredSet.has(c.id))
  const leftItems = leftSet.size === 0
    ? []
    : cards.filter(c => leftSet.has(c.id))

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        className={s.card}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar movimiento"
      >
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <header className={s.head}>
          <div className={s.headTitleRow}>
            <span className={s.headIcon} aria-hidden="true"><IconHand /></span>
            <div>
              <h2 className={s.title}>REGISTRAR MOVIMIENTO</h2>
              <div className={s.headSub}>Paso {step} de 2</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className={s.close} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        {step === 1 && (
          <CardPicker
            label="¿Qué entró?"
            hint="Cartas que conseguiste — pasan a 'tengo'"
            placeholder="Buscar por nombre, equipo o número…"
            cards={cards}
            col={col}
            preferStatus="missing"
            query={enteredQuery}
            setQuery={setEnteredQuery}
            picked={enteredSet}
            setPicked={setEnteredSet}
            otherPicked={leftSet}
          />
        )}

        {step === 2 && (
          <>
            <CardPicker
              label="¿Qué salió?"
              hint="Repetidas que entregaste — pasan a 'falta' si era tu única, o quedan en 'tengo' si era duplicada"
              placeholder="Buscar por nombre, equipo o número…"
              cards={cards}
              col={col}
              preferStatus="duplicate"
              query={leftQuery}
              setQuery={setLeftQuery}
              picked={leftSet}
              setPicked={setLeftSet}
              otherPicked={enteredSet}
            />

            <div className={s.section}>
              <div className={s.label}>
                <span className={s.labelText}>Nota (opcional)</span>
                {partner.name && <span className={s.labelHint}>Trade con {partner.name}</span>}
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Con quién, dónde, etc."
                className={s.input}
                maxLength={160}
              />
            </div>
          </>
        )}

        <div className={s.summaryBar}>
          <span className={s.summaryChip}><strong>+{enteredItems.length}</strong> entró</span>
          <span className={s.summaryChip}><strong>−{leftItems.length}</strong> salió</span>
        </div>

        <div className={s.ctaStack}>
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={enteredSet.size === 0}
                className={s.cta}
              >
                SIGUIENTE <IconArrow />
              </button>
              <button type="button" onClick={onClose} className={s.ctaGhost}>CANCELAR</button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || (enteredSet.size === 0 && leftSet.size === 0)}
                className={s.cta}
              >
                {submitting ? 'GUARDANDO…' : 'REGISTRAR MOVIMIENTO'}
              </button>
              <button type="button" onClick={() => setStep(1)} className={s.ctaGhost}>
                ← VOLVER
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CardPicker({
  label, hint, placeholder, cards, col, preferStatus,
  query, setQuery, picked, setPicked, otherPicked,
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = cards
    if (q) {
      const num = Number.isFinite(parseInt(q, 10)) ? parseInt(q, 10) : null
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.team || '').toLowerCase().includes(q) ||
        (num != null && c.num === num)
      )
    } else {
      // Sin query: priorizar cartas en el estado deseado
      list = list.filter(c => (col[c.id] || 'missing') === preferStatus)
    }
    // Sort: estado preferido primero, luego por equipo, luego por num
    return list.slice().sort((a, b) => {
      const aPref = (col[a.id] || 'missing') === preferStatus ? 0 : 1
      const bPref = (col[b.id] || 'missing') === preferStatus ? 0 : 1
      if (aPref !== bPref) return aPref - bPref
      const t = (a.team || '').localeCompare(b.team || '')
      if (t !== 0) return t
      return (a.num || 0) - (b.num || 0)
    }).slice(0, MAX_RESULTS)
  }, [cards, col, query, preferStatus])

  const togglePick = (id) => {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const removePick = (id) => {
    setPicked(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const pickedItems = useMemo(
    () => cards.filter(c => picked.has(c.id)),
    [cards, picked]
  )

  return (
    <section className={s.section}>
      <div className={s.label}>
        <span className={s.labelText}>{label}</span>
        <span className={s.labelHint}>{hint}</span>
      </div>

      {pickedItems.length > 0 && (
        <div className={s.chipList}>
          {pickedItems.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => removePick(c.id)}
              className={s.chip}
              title="Quitar de la selección"
            >
              <span className={s.chipFlag}>{c.flag}</span>
              <span className={s.chipName}>{c.name}</span>
              <span className={s.chipMeta}>{c.team} · #{c.num}</span>
              <IconClose />
            </button>
          ))}
        </div>
      )}

      <div className={s.searchWrap}>
        <span className={s.searchIcon} aria-hidden><IconSearch /></span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={s.search}
          autoFocus
        />
      </div>

      <ul className={s.results}>
        {filtered.length === 0 && (
          <li className={s.resultEmpty}>
            {query.trim()
              ? 'Nada matchea con esa búsqueda.'
              : `No tenés cartas en estado "${preferStatus === 'missing' ? 'falta' : 'repetida'}". Buscá una específica arriba.`}
          </li>
        )}
        {filtered.map(c => {
          const isPicked = picked.has(c.id)
          const isInOther = otherPicked.has(c.id)
          const status = col[c.id] || 'missing'
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => togglePick(c.id)}
                disabled={isInOther}
                className={`${s.resultRow} ${isPicked ? s.resultRowPicked : ''} ${isInOther ? s.resultRowDisabled : ''}`}
                title={isInOther ? 'Ya elegida en el otro lado' : ''}
              >
                <span className={s.resultCheck} aria-hidden>
                  {isPicked && <IconCheck />}
                </span>
                <span className={s.resultFlag}>{c.flag}</span>
                <div className={s.resultBody}>
                  <div className={s.resultName}>{c.name}</div>
                  <div className={s.resultMeta}>{c.team} · #{c.num} · {c.type}</div>
                </div>
                <span className={`${s.resultStatus} ${s[`status_${status}`] || ''}`}>
                  {status === 'have' ? 'Tengo' : status === 'duplicate' ? 'Repetida' : 'Falta'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
