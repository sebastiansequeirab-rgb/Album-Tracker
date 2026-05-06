import { useEffect, useMemo, useState } from 'react'
import { parseNumberList } from '../data'
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

export default function QuickUpdateModal({
  open,
  onClose,
  cards,           // ALL_ITEMS
  col,             // current collection { id: 'have' | 'duplicate' | 'missing' }
  onApply,         // ({ entered: ids[], left: ids[], note, partnerId }) => Promise
  prefill,         // optional: { enteredIds, leftIds, partnerId, partnerName, note }
}) {
  const [step, setStep] = useState(1)
  const [enteredText, setEnteredText] = useState('')
  const [leftText, setLeftText] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [prefillIds, setPrefillIds] = useState({ entered: null, left: null, partnerId: null, partnerName: null })

  useEffect(() => {
    if (!open) return
    if (prefill) {
      const enteredNums = (prefill.enteredIds || [])
        .map(id => cards.find(c => c.id === id)?.num)
        .filter(n => Number.isFinite(n))
      const leftNums = (prefill.leftIds || [])
        .map(id => cards.find(c => c.id === id)?.num)
        .filter(n => Number.isFinite(n))
      setStep(1)
      setEnteredText(enteredNums.join(', '))
      setLeftText(leftNums.join(', '))
      setNote(prefill.note || (prefill.partnerName ? `Trade con ${prefill.partnerName}` : ''))
      setPrefillIds({
        entered: prefill.enteredIds || null,
        left: prefill.leftIds || null,
        partnerId: prefill.partnerId || null,
        partnerName: prefill.partnerName || null,
      })
    } else {
      setStep(1); setEnteredText(''); setLeftText(''); setNote('')
      setPrefillIds({ entered: null, left: null, partnerId: null, partnerName: null })
    }
    setSubmitting(false)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const enteredIds = useMemo(() => {
    if (prefillIds.entered && enteredText && sameNums(enteredText, prefillIds.entered, cards)) {
      return prefillIds.entered
    }
    return matchByNumber(cards, enteredText)
  }, [cards, enteredText, prefillIds.entered])

  const leftIds = useMemo(() => {
    if (prefillIds.left && leftText && sameNums(leftText, prefillIds.left, cards)) {
      return prefillIds.left
    }
    return matchByNumber(cards, leftText)
  }, [cards, leftText, prefillIds.left])

  if (!open) return null

  const submit = async () => {
    if (submitting) return
    if (enteredIds.length === 0 && leftIds.length === 0) return
    setSubmitting(true)
    try {
      await onApply({
        entered: enteredIds,
        left: leftIds,
        note: note.trim() || null,
        partnerId: prefillIds.partnerId || null,
      })
      onClose()
    } catch (err) {
      console.warn('QuickUpdate apply failed:', err)
      setSubmitting(false)
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        className={s.card}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Intercambio rápido"
      >
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <header className={s.head}>
          <div className={s.headTitleRow}>
            <span className={s.headIcon} aria-hidden="true"><IconHand /></span>
            <div>
              <h2 className={s.title}>INTERCAMBIO RÁPIDO</h2>
              <div className={s.headSub}>Paso {step} de 2</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className={s.close} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        {step === 1 && (
          <section className={s.section}>
            <div className={s.label}>
              <span className={s.labelText}>¿Qué entró?</span>
              <span className={s.labelHint}>Cartas que conseguiste — pasan a "tengo"</span>
            </div>
            <textarea
              value={enteredText}
              onChange={(e) => setEnteredText(e.target.value)}
              placeholder="Ej: 12, 45, 102-110"
              className={s.textarea}
              autoFocus
            />
            <div className={s.matchHint}>
              {enteredIds.length > 0
                ? <strong>{enteredIds.length}</strong>
                : 'Aún no marcaste nada'}
              {enteredIds.length > 0 && (enteredIds.length === 1 ? ' carta detectada' : ' cartas detectadas')}
            </div>

            {enteredIds.length > 0 && enteredIds.length <= 12 && (
              <ul className={s.preview}>
                {enteredIds.map((id) => {
                  const card = cards.find(c => c.id === id)
                  if (!card) return null
                  return (
                    <li key={id} className={s.previewRow}>
                      <span className={s.previewNum}>#{card.num}</span>
                      <span className={s.previewName}>{card.name}</span>
                      <span className={s.previewTeam}>{card.team}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {step === 2 && (
          <section className={s.section}>
            <div className={s.label}>
              <span className={s.labelText}>¿Qué salió?</span>
              <span className={s.labelHint}>Repetidas que entregaste — pasan a "falta" si no quedan</span>
            </div>
            <textarea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              placeholder="Ej: 8, 23, 76"
              className={s.textarea}
              autoFocus
            />
            <div className={s.matchHint}>
              {leftIds.length > 0
                ? <strong>{leftIds.length}</strong>
                : 'Si no entregaste nada, dejá vacío'}
              {leftIds.length > 0 && (leftIds.length === 1 ? ' carta detectada' : ' cartas detectadas')}
            </div>

            <div className={s.label} style={{ marginTop: 16 }}>
              <span className={s.labelText}>Nota (opcional)</span>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Con quién, dónde, etc."
              className={s.input}
              maxLength={160}
            />
          </section>
        )}

        <div className={s.ctaStack}>
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={enteredIds.length === 0}
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
                disabled={submitting || (enteredIds.length === 0 && leftIds.length === 0)}
                className={s.cta}
              >
                {submitting ? 'GUARDANDO…' : 'REGISTRAR INTERCAMBIO'}
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

function matchByNumber(cards, text) {
  const nums = parseNumberList(text || '')
  if (!nums.length) return []
  const set = new Set(nums)
  const out = []
  for (const c of cards) {
    if (typeof c.num === 'number' && set.has(c.num)) out.push(c.id)
  }
  return out
}

function sameNums(text, ids, cards) {
  const nums = new Set(parseNumberList(text || ''))
  if (nums.size !== ids.length) return false
  for (const id of ids) {
    const c = cards.find(x => x.id === id)
    if (!c || !nums.has(c.num)) return false
  }
  return true
}
