// Las 48 selecciones del Mundial 2026 — actualizadas según el checklist
// oficial Panini FIFA WC 2026 (fuente: cartophilic-info-exch.blogspot.com,
// last update 19-04-2026, 980 stickers complete).
//
// Orden: posiciones 1-48 del checklist físico Panini (custom, no agrupado
// por confederación). El orden de este array determina el orden en el que
// se renderan los stickers en la app — los IDs (MEX, BRA, etc.) son
// estables y no cambian, así que la data guardada en Supabase no se
// afecta. Intro (00, FWC-1..FWC-8) y Museum (FWC-9..FWC-19) viven en
// data/stickers.js (antes y después de los teams respectivamente).
//
// shape: { id, name, flag, conf }

export const STICKER_TEAMS = [
  { id: 'MEX', name: 'México',               flag: '🇲🇽', conf: 'CONCACAF' }, //  1
  { id: 'RSA', name: 'Sudáfrica',            flag: '🇿🇦', conf: 'CAF'      }, //  2
  { id: 'KOR', name: 'Corea del Sur',        flag: '🇰🇷', conf: 'AFC'      }, //  3
  { id: 'CZE', name: 'Chequia',              flag: '🇨🇿', conf: 'UEFA'     }, //  4
  { id: 'CAN', name: 'Canadá',               flag: '🇨🇦', conf: 'CONCACAF' }, //  5
  { id: 'BIH', name: 'Bosnia y Herzegovina', flag: '🇧🇦', conf: 'UEFA'     }, //  6
  { id: 'QAT', name: 'Catar',                flag: '🇶🇦', conf: 'AFC'      }, //  7
  { id: 'SUI', name: 'Suiza',                flag: '🇨🇭', conf: 'UEFA'     }, //  8
  { id: 'BRA', name: 'Brasil',               flag: '🇧🇷', conf: 'CONMEBOL' }, //  9
  { id: 'MAR', name: 'Marruecos',            flag: '🇲🇦', conf: 'CAF'      }, // 10
  { id: 'HAI', name: 'Haití',                flag: '🇭🇹', conf: 'CONCACAF' }, // 11
  { id: 'SCO', name: 'Escocia',              flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf: 'UEFA'     }, // 12
  { id: 'USA', name: 'Estados Unidos',       flag: '🇺🇸', conf: 'CONCACAF' }, // 13
  { id: 'PAR', name: 'Paraguay',             flag: '🇵🇾', conf: 'CONMEBOL' }, // 14
  { id: 'AUS', name: 'Australia',            flag: '🇦🇺', conf: 'AFC'      }, // 15
  { id: 'TUR', name: 'Turquía',              flag: '🇹🇷', conf: 'UEFA'     }, // 16
  { id: 'GER', name: 'Alemania',             flag: '🇩🇪', conf: 'UEFA'     }, // 17
  { id: 'CUW', name: 'Curazao',              flag: '🇨🇼', conf: 'CONCACAF' }, // 18
  { id: 'CIV', name: 'Costa de Marfil',      flag: '🇨🇮', conf: 'CAF'      }, // 19
  { id: 'ECU', name: 'Ecuador',              flag: '🇪🇨', conf: 'CONMEBOL' }, // 20
  { id: 'NED', name: 'Países Bajos',         flag: '🇳🇱', conf: 'UEFA'     }, // 21
  { id: 'JPN', name: 'Japón',                flag: '🇯🇵', conf: 'AFC'      }, // 22
  { id: 'SWE', name: 'Suecia',               flag: '🇸🇪', conf: 'UEFA'     }, // 23
  { id: 'TUN', name: 'Túnez',                flag: '🇹🇳', conf: 'CAF'      }, // 24
  { id: 'BEL', name: 'Bélgica',              flag: '🇧🇪', conf: 'UEFA'     }, // 25
  { id: 'EGY', name: 'Egipto',               flag: '🇪🇬', conf: 'CAF'      }, // 26
  { id: 'IRN', name: 'Irán',                 flag: '🇮🇷', conf: 'AFC'      }, // 27
  { id: 'NZL', name: 'Nueva Zelanda',        flag: '🇳🇿', conf: 'OFC'      }, // 28
  { id: 'ESP', name: 'España',               flag: '🇪🇸', conf: 'UEFA'     }, // 29
  { id: 'CPV', name: 'Cabo Verde',           flag: '🇨🇻', conf: 'CAF'      }, // 30
  { id: 'KSA', name: 'Arabia Saudita',       flag: '🇸🇦', conf: 'AFC'      }, // 31
  { id: 'URU', name: 'Uruguay',              flag: '🇺🇾', conf: 'CONMEBOL' }, // 32
  { id: 'FRA', name: 'Francia',              flag: '🇫🇷', conf: 'UEFA'     }, // 33
  { id: 'SEN', name: 'Senegal',              flag: '🇸🇳', conf: 'CAF'      }, // 34
  { id: 'IRQ', name: 'Irak',                 flag: '🇮🇶', conf: 'AFC'      }, // 35
  { id: 'NOR', name: 'Noruega',              flag: '🇳🇴', conf: 'UEFA'     }, // 36
  { id: 'ARG', name: 'Argentina',            flag: '🇦🇷', conf: 'CONMEBOL' }, // 37
  { id: 'ALG', name: 'Argelia',              flag: '🇩🇿', conf: 'CAF'      }, // 38
  { id: 'AUT', name: 'Austria',              flag: '🇦🇹', conf: 'UEFA'     }, // 39
  { id: 'JOR', name: 'Jordania',             flag: '🇯🇴', conf: 'AFC'      }, // 40
  { id: 'POR', name: 'Portugal',             flag: '🇵🇹', conf: 'UEFA'     }, // 41
  { id: 'COD', name: 'RD del Congo',         flag: '🇨🇩', conf: 'CAF'      }, // 42
  { id: 'UZB', name: 'Uzbekistán',           flag: '🇺🇿', conf: 'AFC'      }, // 43
  { id: 'COL', name: 'Colombia',             flag: '🇨🇴', conf: 'CONMEBOL' }, // 44
  { id: 'ENG', name: 'Inglaterra',           flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA'     }, // 45
  { id: 'CRO', name: 'Croacia',              flag: '🇭🇷', conf: 'UEFA'     }, // 46
  { id: 'GHA', name: 'Ghana',                flag: '🇬🇭', conf: 'CAF'      }, // 47
  { id: 'PAN', name: 'Panamá',               flag: '🇵🇦', conf: 'CONCACAF' }, // 48
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
