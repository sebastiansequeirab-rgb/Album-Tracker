import { useEffect } from 'react'
import s from './BulkUpdateModal.module.css'

/* ── Inline SVG icons (no emojis in chrome) ──────────────────────────── */
const IconPencil = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
)
const IconClose = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconCheck = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconRefresh = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const IconX = (p) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconStack = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 7l9-4 9 4-9 4-9-4z" />
    <path d="M3 12l9 4 9-4" />
    <path d="M3 17l9 4 9-4" />
  </svg>
)

const ACTIONS = [
  { v: 'have',      l: 'Tengo',    Icon: IconCheck },
  { v: 'duplicate', l: 'Repetida', Icon: IconRefresh },
  { v: 'missing',   l: 'Falta',    Icon: IconX },
]

export default function BulkUpdateModal({
  open,
  onClose,
  quickText,
  setQuickText,
  quickAction,
  setQuickAction,
  matchedCards,
  onApply,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const count = matchedCards.length
  const actionVariant = s[`action_${quickAction}`] || ''

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        className={s.card}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Actualización rápida"
      >
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <header className={s.head}>
          <div className={s.headTitleRow}>
            <span className={s.headIcon} aria-hidden="true"><IconPencil /></span>
            <div className={s.headCopy}>
              <h2 className={s.title}>ACTUALIZACIÓN RÁPIDA</h2>
              <div className={s.headRule} aria-hidden="true" />
            </div>
          </div>
          <button type="button" onClick={onClose} className={s.close} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <p className={s.sub}>
          Pegá o escribí los números de tus cartas. Podés usar rangos: 1, 3, 5-10, 225
        </p>

        {/* Section 01 — Entrada */}
        <section className={s.section}>
          <div className={s.label}>
            <span className={s.labelNum}>01</span>
            <span className={s.labelText}>ENTRADA</span>
          </div>
          <div className={s.inputBox}>
            <textarea
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              placeholder="1, 3, 5-10, 225"
              className={s.textarea}
              autoFocus
            />
          </div>
          <div className={s.hint}>
            Acepta comas, espacios o saltos de línea. Rangos con "-".
            {quickText && (
              <span className={s.hintMatch}>
                {count} {count === 1 ? 'COINCIDENCIA' : 'COINCIDENCIAS'}
              </span>
            )}
          </div>
        </section>

        {/* Action selector — broadcast pill */}
        <section className={s.section}>
          <div className={s.label}>
            <span className={s.labelNum}>02</span>
            <span className={s.labelText}>ACCIÓN</span>
          </div>
          <div className={s.actions}>
            {ACTIONS.map(b => {
              const ActionIcon = b.Icon
              return (
                <button
                  key={b.v}
                  type="button"
                  onClick={() => setQuickAction(b.v)}
                  className={`${s.actionBtn} ${quickAction === b.v ? s[`action_${b.v}`] : ''}`}
                  aria-pressed={quickAction === b.v}
                >
                  <span className={s.actionIcon} aria-hidden="true"><ActionIcon /></span>
                  <span>{b.l}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Section 03 — Vista previa */}
        {count > 0 && count <= 20 && (
          <section className={s.section}>
            <div className={s.label}>
              <span className={s.labelNum}>03</span>
              <span className={s.labelText}>VISTA PREVIA — {count} {count === 1 ? 'CARTA' : 'CARTAS'}</span>
            </div>
            <div className={s.preview}>
              {matchedCards.map((c, i) => (
                <div
                  key={c.id}
                  className={s.previewRow}
                  style={{ animationDelay: `${Math.min(i * 40, 480)}ms` }}
                >
                  <span className={s.previewCheck} aria-hidden="true"><IconCheck /></span>
                  <span className={s.previewNum}>#{c.num}</span>
                  <span className={s.previewFlag} aria-hidden="true">{c.flag}</span>
                  <div className={s.previewBody}>
                    <span className={s.previewName}>{c.name}</span>
                    <span className={s.previewTeam}>{c.team}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {count > 20 && (
          <section className={s.section}>
            <div className={s.label}>
              <span className={s.labelNum}>03</span>
              <span className={s.labelText}>VISTA PREVIA</span>
            </div>
            <div className={s.previewBulk}>
              <span className={s.previewBulkIcon} aria-hidden="true"><IconStack /></span>
              <span><strong>{count}</strong> cartas afectadas</span>
            </div>
          </section>
        )}

        <div className={s.ctaStack}>
          <button
            type="button"
            onClick={onApply}
            disabled={count === 0}
            className={`${s.cta} ${count > 0 ? actionVariant : ''}`}
          >
            APLICAR A {count} CARTA{count !== 1 ? 'S' : ''}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={s.ctaGhost}
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  )
}
