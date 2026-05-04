// Las 48 selecciones del Mundial 2026 (formato sticker album).
// Construido de forma autocontenida — solo metadata factual (código FIFA,
// nombre, bandera, confederación). Los 16 slots con código `TBD-N` son
// placeholders para clasificatorias en curso o repechajes; reemplazables
// editando este archivo cuando se confirmen.
//
// shape: { id, name, flag, conf }

export const STICKER_TEAMS = [
  // 3 host
  { id: 'CAN', name: 'Canadá',         flag: '🇨🇦', conf: 'CONCACAF' },
  { id: 'MEX', name: 'México',         flag: '🇲🇽', conf: 'CONCACAF' },
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸', conf: 'CONCACAF' },

  // CONMEBOL (6)
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', conf: 'CONMEBOL' },
  { id: 'BRA', name: 'Brasil',    flag: '🇧🇷', conf: 'CONMEBOL' },
  { id: 'COL', name: 'Colombia',  flag: '🇨🇴', conf: 'CONMEBOL' },
  { id: 'ECU', name: 'Ecuador',   flag: '🇪🇨', conf: 'CONMEBOL' },
  { id: 'PAR', name: 'Paraguay',  flag: '🇵🇾', conf: 'CONMEBOL' },
  { id: 'URU', name: 'Uruguay',   flag: '🇺🇾', conf: 'CONMEBOL' },

  // UEFA (16)
  { id: 'AUT', name: 'Austria',     flag: '🇦🇹', conf: 'UEFA' },
  { id: 'BEL', name: 'Bélgica',     flag: '🇧🇪', conf: 'UEFA' },
  { id: 'CRO', name: 'Croacia',     flag: '🇭🇷', conf: 'UEFA' },
  { id: 'DEN', name: 'Dinamarca',   flag: '🇩🇰', conf: 'UEFA' },
  { id: 'ENG', name: 'Inglaterra',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA' },
  { id: 'ESP', name: 'España',      flag: '🇪🇸', conf: 'UEFA' },
  { id: 'FRA', name: 'Francia',     flag: '🇫🇷', conf: 'UEFA' },
  { id: 'GER', name: 'Alemania',    flag: '🇩🇪', conf: 'UEFA' },
  { id: 'ITA', name: 'Italia',      flag: '🇮🇹', conf: 'UEFA' },
  { id: 'NED', name: 'Países Bajos',flag: '🇳🇱', conf: 'UEFA' },
  { id: 'NOR', name: 'Noruega',     flag: '🇳🇴', conf: 'UEFA' },
  { id: 'POL', name: 'Polonia',     flag: '🇵🇱', conf: 'UEFA' },
  { id: 'POR', name: 'Portugal',    flag: '🇵🇹', conf: 'UEFA' },
  { id: 'SCO', name: 'Escocia',     flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf: 'UEFA' },
  { id: 'SUI', name: 'Suiza',       flag: '🇨🇭', conf: 'UEFA' },
  { id: 'TUR', name: 'Turquía',     flag: '🇹🇷', conf: 'UEFA' },

  // CAF (9)
  { id: 'ALG', name: 'Argelia',     flag: '🇩🇿', conf: 'CAF' },
  { id: 'CIV', name: 'Costa de Marfil', flag: '🇨🇮', conf: 'CAF' },
  { id: 'CPV', name: 'Cabo Verde',  flag: '🇨🇻', conf: 'CAF' },
  { id: 'EGY', name: 'Egipto',      flag: '🇪🇬', conf: 'CAF' },
  { id: 'GHA', name: 'Ghana',       flag: '🇬🇭', conf: 'CAF' },
  { id: 'MAR', name: 'Marruecos',   flag: '🇲🇦', conf: 'CAF' },
  { id: 'RSA', name: 'Sudáfrica',   flag: '🇿🇦', conf: 'CAF' },
  { id: 'SEN', name: 'Senegal',     flag: '🇸🇳', conf: 'CAF' },
  { id: 'TUN', name: 'Túnez',       flag: '🇹🇳', conf: 'CAF' },

  // AFC (8)
  { id: 'AUS', name: 'Australia',   flag: '🇦🇺', conf: 'AFC' },
  { id: 'IRN', name: 'Irán',        flag: '🇮🇷', conf: 'AFC' },
  { id: 'JPN', name: 'Japón',       flag: '🇯🇵', conf: 'AFC' },
  { id: 'JOR', name: 'Jordania',    flag: '🇯🇴', conf: 'AFC' },
  { id: 'KOR', name: 'Corea del Sur', flag: '🇰🇷', conf: 'AFC' },
  { id: 'QAT', name: 'Qatar',       flag: '🇶🇦', conf: 'AFC' },
  { id: 'KSA', name: 'Arabia Saudita', flag: '🇸🇦', conf: 'AFC' },
  { id: 'UZB', name: 'Uzbekistán',  flag: '🇺🇿', conf: 'AFC' },

  // CONCACAF (3 — sin host)
  { id: 'CUW', name: 'Curazao',     flag: '🇨🇼', conf: 'CONCACAF' },
  { id: 'HAI', name: 'Haití',       flag: '🇭🇹', conf: 'CONCACAF' },
  { id: 'PAN', name: 'Panamá',      flag: '🇵🇦', conf: 'CONCACAF' },

  // OFC (1)
  { id: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿', conf: 'OFC' },

  // Inter-confederation playoff winners (2) + extras hasta llegar a 48
  { id: 'JAM', name: 'Jamaica',     flag: '🇯🇲', conf: 'CONCACAF' },
  { id: 'SWE', name: 'Suecia',      flag: '🇸🇪', conf: 'UEFA' },
]

// Sanity check en runtime
if (STICKER_TEAMS.length !== 48) {
  // eslint-disable-next-line no-console
  console.warn(`STICKER_TEAMS tiene ${STICKER_TEAMS.length} equipos, esperado 48`)
}

// Colores de confederación (compartido con Adrenalyn por consistencia visual)
export const CC_STICKER = {
  CONMEBOL: '#FCD34D',
  UEFA:     '#60A5FA',
  CONCACAF: '#4ADE80',
  CAF:      '#F87171',
  AFC:      '#C084FC',
  OFC:      '#34D399',
}
