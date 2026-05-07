/* Mensaje WhatsApp para compartir tu álbum.
   Optimizado para que la app LUZCA: copy con vibra, formato limpio,
   resumen visual con barras de progreso ASCII y top países. No vuelca
   cientos de stickers — invita a abrir el perfil web para la lista
   completa.                                                                 */

const APP_URL = 'https://album-tracker-three.vercel.app'
const TOP_COUNTRIES = 6     // muestra top N países en cada sección

export function buildShareMessage({
  profile,
  items,
  col,
  totalLabel = 'stickers',
  albumLabel = 'Álbum Panini WC 2026',
  include = 'both',
} = {}) {
  const total = items.length
  const have = items.filter(c => (col[c.id] || 'missing') !== 'missing').length
  const dups = items.filter(c => col[c.id] === 'duplicate').length
  const missing = total - have
  const pct = total ? Math.round(have / total * 100) : 0
  const profileUrl = profile?.slug ? `${APP_URL}/u/${profile.slug}` : null
  const name = profile?.display_name || 'Coleccionista'

  const bar = progressBar(pct)

  const out = []
  out.push(`╔═══════════════════════════╗`)
  out.push(`  ⚽  ${albumLabel.toUpperCase()}`)
  out.push(`╚═══════════════════════════╝`)
  out.push('')
  out.push(`👤  *${name}*`)
  out.push(`${bar}  ${pct}%`)
  out.push(`✅ ${have}/${total} ${totalLabel}   🔄 ${dups} repetidas   ❌ ${missing} faltantes`)

  if (profileUrl) {
    out.push('')
    out.push(`🔗 *Mi perfil con la lista completa:*`)
    out.push(profileUrl)
  }

  const missingItems = items.filter(c => (col[c.id] || 'missing') === 'missing')
  const dupItems = items.filter(c => col[c.id] === 'duplicate')

  if ((include === 'missing' || include === 'both') && missingItems.length) {
    out.push('')
    out.push(`━━━ ❌ ME FALTAN  (${missingItems.length}) ━━━`)
    appendTopCountries(out, missingItems)
  }

  if ((include === 'duplicate' || include === 'both') && dupItems.length) {
    out.push('')
    out.push(`━━━ 🔄 TENGO REPETIDAS  (${dupItems.length}) ━━━`)
    appendTopCountries(out, dupItems)
  }

  out.push('')
  out.push(`━━━━━━━━━━━━━━━━━━━━━━━`)
  out.push(`¿Cambiamos? 🤝`)
  out.push(`Sumate al tracker y armamos el álbum:`)
  out.push(APP_URL)

  return out.join('\n')
}

function appendTopCountries(out, items) {
  const groups = new Map()
  for (const it of items) {
    const key = it.team || 'Otros'
    if (!groups.has(key)) groups.set(key, { flag: it.flag || '🏳️', items: [] })
    groups.get(key).items.push(it)
  }
  // Ordenar por cantidad descendente y tomar TOP_COUNTRIES.
  const sorted = [...groups.entries()]
    .sort((a, b) => b[1].items.length - a[1].items.length)
  const top = sorted.slice(0, TOP_COUNTRIES)
  const rest = sorted.slice(TOP_COUNTRIES)

  for (const [team, g] of top) {
    const nums = g.items
      .slice(0, 14)                   // tope por país
      .map(c => `#${c.num}`)
      .join(' · ')
    const more = g.items.length > 14 ? ` …+${g.items.length - 14}` : ''
    out.push(`${g.flag}  *${team}*  (${g.items.length})`)
    out.push(`     ${nums}${more}`)
  }
  if (rest.length) {
    const restCount = rest.reduce((a, [, g]) => a + g.items.length, 0)
    const flags = rest.map(([, g]) => g.flag).slice(0, 12).join(' ')
    out.push(`${flags}  +${restCount} en ${rest.length} países más → mira mi perfil`)
  }
}

function progressBar(pct) {
  const total = 14
  const filled = Math.round((pct / 100) * total)
  const empty = total - filled
  return '▰'.repeat(filled) + '▱'.repeat(empty)
}

export function copyShareMessage(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.reject(new Error('Clipboard no disponible'))
  }
  return navigator.clipboard.writeText(text)
}

export function whatsappHref(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
