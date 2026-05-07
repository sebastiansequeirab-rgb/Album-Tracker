/* Genera un mensaje formateado para WhatsApp con resumen del progreso del
   álbum + lista de faltantes/repetidas agrupadas por país. Incluye el link
   público al perfil + invitación a la app.

   Pensado para copiar/pegar en chats — usa emojis, banderas y texto plano
   con saltos de línea (no markdown, porque WA no lo renderiza).             */

const APP_URL = 'https://album-tracker-three.vercel.app'

export function buildShareMessage({
  profile,           // { display_name, slug, avatar_url, ... }
  items,             // ALL_ITEMS del álbum
  col,               // { id: 'have'|'duplicate'|'missing' }
  totalLabel = 'STICKERS',
  albumLabel = 'Álbum Panini WC 2026',
  include = 'both',  // 'missing' | 'duplicate' | 'both'
  maxPerSection = 200, // tope por sección para no romper WA con mensajes ultra largos
} = {}) {
  const total = items.length
  const have = items.reduce((acc, c) => acc + ((col[c.id] || 'missing') !== 'missing' ? 1 : 0), 0)
  const pct = total ? Math.round(have / total * 100) : 0

  const profileUrl = profile?.slug ? `${APP_URL}/u/${profile.slug}` : null
  const name = profile?.display_name || 'Coleccionista'

  const lines = []
  lines.push('🎯 *' + albumLabel + '*')
  lines.push(`👤 ${name}  ·  ${have}/${total} ${totalLabel}  ·  ${pct}%`)
  if (profileUrl) {
    lines.push('')
    lines.push('🔗 Mi perfil:')
    lines.push(profileUrl)
  }

  const missing = items.filter(c => (col[c.id] || 'missing') === 'missing')
  const dups    = items.filter(c => col[c.id] === 'duplicate')

  if ((include === 'missing' || include === 'both') && missing.length) {
    lines.push('')
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`❌ ME FALTAN  (${missing.length})`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    appendGrouped(lines, missing, maxPerSection)
  }

  if ((include === 'duplicate' || include === 'both') && dups.length) {
    lines.push('')
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`🔄 TENGO REPETIDAS  (${dups.length})`)
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    appendGrouped(lines, dups, maxPerSection)
  }

  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━')
  lines.push('¿Cambiamos? 🤝')
  lines.push('Sumate al tracker:')
  lines.push(APP_URL)

  return lines.join('\n')
}

function appendGrouped(lines, items, maxItems) {
  const groups = new Map()
  for (const it of items) {
    const key = it.team || 'Otros'
    if (!groups.has(key)) groups.set(key, { flag: it.flag || '🏳️', items: [] })
    groups.get(key).items.push(it)
  }
  let count = 0
  for (const [team, g] of groups) {
    if (count >= maxItems) {
      lines.push('')
      lines.push(`…y ${items.length - count} más. Mira la lista completa en mi perfil.`)
      return
    }
    lines.push('')
    lines.push(`${g.flag} *${team}*  (${g.items.length})`)
    const nums = g.items
      .map(c => `#${c.num}`)
      .join(' · ')
    lines.push(`   ${nums}`)
    count += g.items.length
  }
}

/* Helper para abrir whatsapp con el mensaje (mobile) o copiar al portapapeles. */
export function copyShareMessage(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.reject(new Error('Clipboard no disponible'))
  }
  return navigator.clipboard.writeText(text)
}

export function whatsappHref(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
