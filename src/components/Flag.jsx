// Renderiza una bandera real (SVG) desde flagcdn.com (libre uso, dominio público).
//
// Acepta cualquiera de:
//   - emoji  : el flag emoji (ej "🇦🇷"). Decodifica regional indicator pair → ISO.
//   - fifa   : código FIFA del equipo (ej "ARG"). Usa el map FIFA→ISO.
//   - iso    : código ISO 3166-1 alpha-2 directo (ej "ar"). Más rápido.
//
// Para Inglaterra/Escocia (subdivisiones GB), forzamos los códigos especiales.

const FIFA_TO_ISO = {
  ARG:'ar', BRA:'br', USA:'us', MEX:'mx', CAN:'ca', URU:'uy', PAR:'py',
  COL:'co', ECU:'ec', PER:'pe', BOL:'bo', VEN:'ve', CHI:'cl',
  ENG:'gb-eng', SCO:'gb-sct', WAL:'gb-wls', NIR:'gb-nir',
  FRA:'fr', GER:'de', ESP:'es', POR:'pt', ITA:'it', NED:'nl', BEL:'be',
  SUI:'ch', AUT:'at', NOR:'no', DEN:'dk', POL:'pl', SWE:'se', CRO:'hr',
  TUR:'tr', UKR:'ua', SRB:'rs', GRE:'gr', CZE:'cz', HUN:'hu', ROU:'ro',
  IRL:'ie', SVK:'sk', BIH:'ba', MKD:'mk', SVN:'si', ALB:'al', BLR:'by',
  KOS:'xk', FIN:'fi', BUL:'bg', GEO:'ge', LUX:'lu', ARM:'am', AZE:'az',
  ALG:'dz', CIV:'ci', CPV:'cv', EGY:'eg', GHA:'gh', MAR:'ma', RSA:'za',
  SEN:'sn', TUN:'tn', NGA:'ng', CMR:'cm', COD:'cd', GUI:'gn', MLI:'ml',
  AUS:'au', IRN:'ir', JPN:'jp', JOR:'jo', KOR:'kr', QAT:'qa', KSA:'sa',
  UZB:'uz', CHN:'cn', UAE:'ae', IRQ:'iq', PRK:'kp', LBN:'lb', SYR:'sy',
  THA:'th', VIE:'vn', PHI:'ph', IDN:'id', MAS:'my',
  CUW:'cw', HAI:'ht', PAN:'pa', JAM:'jm', CRC:'cr', HON:'hn', SLV:'sv',
  GUA:'gt', NCA:'ni', TRI:'tt', BAH:'bs', SUR:'sr', GUY:'gy',
  NZL:'nz', FIJ:'fj', SOL:'sb', VAN:'vu',
}

function isoCodeFromEmoji(emoji) {
  if (!emoji) return null
  const trimmed = emoji.trim()
  // Subdivisiones GB (Inglaterra, Escocia, Gales): tag-sequence emojis
  if (trimmed === '🏴󠁧󠁢󠁥󠁮󠁧󠁿') return 'gb-eng'
  if (trimmed === '🏴󠁧󠁢󠁳󠁣󠁴󠁿') return 'gb-sct'
  if (trimmed === '🏴󠁧󠁢󠁷󠁬󠁳󠁿') return 'gb-wls'
  // Regional indicator pair (estándar de country flag)
  if (trimmed.length < 4) return null
  const cp1 = trimmed.codePointAt(0)
  const cp2 = trimmed.codePointAt(2)
  if (cp1 < 0x1F1E6 || cp1 > 0x1F1FF || cp2 < 0x1F1E6 || cp2 > 0x1F1FF) return null
  const a = String.fromCharCode(cp1 - 0x1F1E6 + 65).toLowerCase()
  const b = String.fromCharCode(cp2 - 0x1F1E6 + 65).toLowerCase()
  return a + b
}

export default function Flag({
  emoji,
  fifa,
  iso,
  size = 22,
  alt = '',
  className,
  style,
  fallback = true,
}) {
  let code = iso?.toLowerCase()
  if (!code && fifa) code = FIFA_TO_ISO[fifa] || null
  if (!code && emoji) code = isoCodeFromEmoji(emoji)

  if (!code) {
    return fallback
      ? <span className={className} style={{ fontSize: size * 0.95, lineHeight: 1, ...style }}>{emoji || '🏴'}</span>
      : null
  }

  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={alt || code}
      loading="lazy"
      className={className}
      onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { textContent: emoji || '🏴' })) }}
      style={{
        width: size,
        height: Math.round(size * 0.7),
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 2,
        objectFit: 'cover',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
        ...style,
      }}
    />
  )
}
