/* Mensaje WhatsApp para compartir tu álbum.
   Foco en MAXIMIZAR info concreta — listamos TODOS los países con TODOS los
   números separados por coma. Sin truncado, sin "…+X", sin "+países más".
   El receptor ve la lista completa para revisar contra su álbum sin abrir
   el perfil web. */

const APP_URL = 'https://wc2026albumtracker.vercel.app'

export function buildShareMessage({
  profile,
  items,
  col,
  extras = {},                    // { [id]: extraCount } — duplicadas adicionales
  totalLabel = 'stickers',
  albumLabel = 'Álbum Panini WC 2026',
  include = 'both',
} = {}) {
  const total = items.length
  const have = items.filter(c => (col[c.id] || 'missing') !== 'missing').length
  // Cuenta TOTAL de duplicadas: cada carta status='duplicate' cuenta como
  // 1 + extras[id] (default 1). Esto refleja que el usuario tiene N copias
  // extra que puede intercambiar.
  const dups = items.reduce((acc, c) => {
    if (col[c.id] !== 'duplicate') return acc
    return acc + 1 + (extras[c.id] || 0)
  }, 0)
  const missing = total - have
  const pct = total ? Math.round(have / total * 100) : 0
  const profileUrl = profile?.slug ? `${APP_URL}/u/${profile.slug}` : null
  const name = profile?.display_name || 'Coleccionista'

  const bar = progressBar(pct)

  const out = []
  out.push(`⚽  ${albumLabel.toUpperCase()}`)
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
    out.push(`❌ ME FALTAN  (${missingItems.length})`)
    appendCountriesFull(out, missingItems)
  }

  if ((include === 'duplicate' || include === 'both') && dupItems.length) {
    out.push('')
    out.push(`🔄 MIS REPETIDAS  (${dupItems.length})`)
    appendCountriesFull(out, dupItems)
  }

  out.push('')
  out.push(`¿Cambiamos? 🤝`)
  out.push(APP_URL)

  return out.join('\n')
}

/* Lista TODOS los países con TODOS los números — sin truncado.
   Países ordenados por cantidad descendente para que el ojo enganche
   primero los grupos grandes. Números separados por coma para máxima
   densidad. */
function appendCountriesFull(out, items) {
  const groups = new Map()
  for (const it of items) {
    const key = it.team || 'Otros'
    if (!groups.has(key)) groups.set(key, { flag: it.flag || '🏳️', items: [] })
    groups.get(key).items.push(it)
  }
  const sorted = [...groups.entries()]
    .sort((a, b) => b[1].items.length - a[1].items.length)

  for (const [team, g] of sorted) {
    // Ordenar números asc dentro del país.
    const nums = g.items
      .slice()
      .sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
      .map(c => c.num)
      .join(', ')
    out.push(`${g.flag} *${team}* (${g.items.length}): ${nums}`)
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

/* Mensaje minimal — solo el link al perfil + invitación corta. Para cuando el
   usuario solo quiere mandar el link sin la lista enorme. */
export function buildShareLinkOnly({
  profile,
  albumLabel = 'Álbum Panini WC 2026',
} = {}) {
  const url = profile?.slug
    ? `${APP_URL}/u/${profile.slug}`
    : APP_URL
  const name = profile?.display_name || 'Mi álbum'
  return `⚽ ${name} · ${albumLabel}\n${url}\n\n¿Cambiamos? 🤝`
}

/* Limpia un teléfono a solo dígitos para wa.me/<num>. Tolerante con +, espacios,
   paréntesis y guiones. Devuelve '' si quedó vacío para que el caller decida. */
export function cleanPhoneNumber(raw) {
  if (!raw) return ''
  return String(raw).replace(/[^\d]/g, '')
}

/* Link wa.me con número (chat directo) y texto pre-cargado. Si number está
   vacío, retorna null — el caller decide si mostrar el botón. */
export function whatsappHrefForNumber(number, text) {
  const clean = cleanPhoneNumber(number)
  if (!clean) return null
  const t = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${clean}${t}`
}

/* Mensaje WhatsApp para un trade 1:1 — resumen compacto con lo que pides y lo
   que ofreces, agrupado por país. Pensado para el botón "WhatsApp" del modal
   de trade y para el botón de contacto en el perfil del coleccionista. */
export function buildTradeWhatsappText({
  myName,
  targetName,
  theyGiveMe = [],   // items que les pido (sus dups que me faltan)
  iGiveThem = [],    // items que les ofrezco (mis dups que les faltan)
  meetingPoint = '',
  meetingTime = '',
  appUrl = APP_URL,
} = {}) {
  const out = []
  out.push(`🤝  *Trade · Panini WC 2026*`)
  out.push('')
  out.push(`Hola ${targetName || 'coleccionista'}, soy ${myName || 'un coleccionista'} desde WC Album Tracker.`)

  if (theyGiveMe.length) {
    out.push('')
    out.push(`📥 *Me interesan tus repetidas* (${theyGiveMe.length})`)
    appendTradeGroups(out, theyGiveMe)
  }
  if (iGiveThem.length) {
    out.push('')
    out.push(`📤 *Te ofrezco mis repetidas* (${iGiveThem.length})`)
    appendTradeGroups(out, iGiveThem)
  }
  if (!theyGiveMe.length && !iGiveThem.length) {
    out.push('')
    out.push('Quería coordinar un cambio. Te paso el detalle por acá o por la app.')
  }

  if (meetingPoint || meetingTime) {
    out.push('')
    out.push(`📍 ${[meetingPoint, meetingTime].filter(Boolean).join(' · ')}`)
  }

  out.push('')
  out.push(`Te dejé el detalle en el chat de la app: ${appUrl}`)
  return out.join('\n')
}

function appendTradeGroups(out, items) {
  const groups = new Map()
  for (const it of items) {
    const key = it.team || 'Otros'
    if (!groups.has(key)) groups.set(key, { flag: it.flag || '🏳️', items: [] })
    groups.get(key).items.push(it)
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].items.length - a[1].items.length)
  for (const [team, g] of sorted) {
    const nums = g.items
      .slice()
      .sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
      .map(c => c.num)
      .join(', ')
    out.push(`${g.flag} ${team} (${g.items.length}): ${nums}`)
  }
}
