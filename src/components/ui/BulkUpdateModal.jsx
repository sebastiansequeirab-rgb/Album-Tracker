import { useEffect } from 'react'
import s from './BulkUpdateModal.module.css'

const ACTIONS = [
  { v: 'have',      l: 'Tengo',    e: '✅' },
  { v: 'duplicate', l: 'Repetida', e: '🔄' },
  { v: 'missing',   l: 'Falta',    e: '❌' },
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
        <header className={s.head}>
          <div>
            <h2 className={s.title}>✏️ ACTUALIZACIÓN RÁPIDA</h2>
            <div className={s.sub}>Pegá o escribí los números que querés actualizar</div>
          </div>
          <button type="button" onClick={onClose} className={s.close} aria-label="Cerrar">×</button>
        </header>

        <textarea
          value={quickText}
          onChange={e => setQuickText(e.target.value)}
          placeholder="Ej: 1, 3, 4-7, 10, 15-20"
          className={s.textarea}
          autoFocus
        />

        <div className={s.hint}>
          💡 Acepta comas, espacios o saltos de línea. Rangos con "-".
          {quickText && (
            <span className={s.hintMatch}>
              → {count} {count === 1 ? 'carta coincide' : 'cartas coinciden'}
            </span>
          )}
        </div>

        <div className={s.actions}>
          {ACTIONS.map(b => (
            <button
              key={b.v}
              type="button"
              onClick={() => setQuickAction(b.v)}
              className={`${s.actionBtn} ${quickAction === b.v ? s[`action_${b.v}`] : ''}`}
              aria-pressed={quickAction === b.v}
            >
              <span aria-hidden="true">{b.e}</span> {b.l}
            </button>
          ))}
        </div>

        {count > 0 && count <= 20 && (
          <div className={s.preview}>
            <div className={s.previewTitle}>Vista previa · {count}</div>
            <div className={s.previewList}>
              {matchedCards.map((c, i) => (
                <div
                  key={c.id}
                  className={s.previewRow}
                  style={{ animationDelay: `${Math.min(i * 40, 480)}ms` }}
                >
                  <span className={s.previewNum}>#{c.num}</span>
                  <span aria-hidden="true">{c.flag}</span>
                  <span className={s.previewName}>{c.name}</span>
                  <span className={s.previewTeam}>{c.team}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {count > 20 && (
          <div className={s.previewBulk}>📋 {count} cartas afectadas</div>
        )}

        <button
          type="button"
          onClick={onApply}
          disabled={count === 0}
          className={`${s.cta} ${count > 0 ? actionVariant : ''}`}
        >
          Aplicar a {count} carta{count !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
