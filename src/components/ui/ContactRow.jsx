import { whatsappHrefForNumber, cleanPhoneNumber } from '../../lib/shareMessage'
import s from './ContactRow.module.css'

/* Ícono inline minimal (currentColor) para no depender de pack externo. */
const IconWa = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.52 3.48A11.93 11.93 0 0 0 12.05 0C5.5 0 .14 5.36.14 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.65a11.94 11.94 0 0 0 5.78 1.48h.01c6.55 0 11.91-5.36 11.91-11.93 0-3.18-1.24-6.18-3.45-8.42zm-8.47 18.34h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98 1-3.62-.24-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.86-9.89 9.86zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
  </svg>
)
const IconIg = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
)
const IconMail = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

/* Pill de contacto.
   - Solo renderiza los campos que existan (whatsapp / instagram / email).
   - Si pasas `tradeDraft`, el WhatsApp pre-llena el chat con ese texto. Sin
     tradeDraft, manda un saludo genérico con el nombre del que solicita.
   - Si no hay ningún contacto disponible, no renderiza nada (devuelve null) — el
     caller no necesita un guard explícito.
*/
export default function ContactRow({
  profile,
  tradeDraft = '',
  myName = '',
  compact = false,
}) {
  if (!profile) return null
  const wa = profile.contact?.whatsapp || ''
  const ig = (profile.contact?.instagram || '').replace(/^@/, '').trim()
  const email = (profile.contact?.email || '').trim()

  const waClean = cleanPhoneNumber(wa)
  const hasAny = !!(waClean || ig || email)
  if (!hasAny) return null

  const waText = tradeDraft ||
    `Hola ${profile.display_name || ''}, soy ${myName || 'un coleccionista'} desde WC Album Tracker — quería coordinar un cambio.`
  const waHref = whatsappHrefForNumber(wa, waText)

  return (
    <div className={`${s.row} ${compact ? s.compact : ''}`}>
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${s.pill} ${s.wa}`}
          title={`Escribir a ${profile.display_name || 'WhatsApp'}`}
        >
          <IconWa size={14}/>
          <span className={s.label}>WhatsApp</span>
        </a>
      )}
      {ig && (
        <a
          href={`https://instagram.com/${encodeURIComponent(ig)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${s.pill} ${s.ig}`}
          title={`Instagram @${ig}`}
        >
          <IconIg size={14}/>
          <span className={s.label}>@{ig}</span>
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className={`${s.pill} ${s.email}`}
          title={`Email a ${email}`}
        >
          <IconMail size={14}/>
          <span className={s.label}>Email</span>
        </a>
      )}
    </div>
  )
}
