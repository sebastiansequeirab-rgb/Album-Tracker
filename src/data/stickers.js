// Panini FIFA World Cup 2026 Sticker Album (oficial Latam) — 980 stickers
//
// Estructura oficial:
//   #00-08    → Intro (9):     Cubierta, Mascota, Balón, Ciudades, Trofeo, etc.
//   #9-968    → 48 selecciones × 20 stickers c/u (960 total).
//                Por bloque de equipo:
//                  pos 1  → Escudo (foil)
//                  pos 2-12 → 11 jugadores
//                  pos 13 → Foto del plantel (team photo)
//                  pos 14-20 → 7 jugadores
//   #969-979  → FIFA Museum (11): campeones históricos al final del álbum.
//
// Total: 9 + 960 + 11 = 980.
//
// Los nombres de jugadores son PLACEHOLDERS genéricos ("Jugador 1", "Jugador 2",
// etc.). El usuario los reemplaza con la lista real cuando reciba el álbum
// oficial. NO reproducimos el checklist oficial de Panini.
//
// IDs son determinísticos y ESTABLES — se guardan en el blob `data` jsonb del
// usuario. Nunca renombrar después del primer guardado sin migrar.

import { STICKER_TEAMS } from './teams'

// Tipos de sticker (mapping para la UI)
export const STM = {
  'Intro':       { e: '🏟️', l: 'Intro',     c: '#60A5FA' },
  'FIFA Museum': { e: '🏆', l: 'Museum',    c: '#FCD34D' },
  'Player':      { e: '⚽', l: 'Jugador',   c: '#A3E635' },
  'Team Group':  { e: '👥', l: 'Plantel',   c: '#A78BFA' },
  'Team Crest':  { e: '🛡️', l: 'Escudo',    c: '#F472B6' },
}

// Estados de sticker (espejo del Adrenalyn ST para reusar componentes visuales)
export const SST = {
  missing:   { l: 'Falta',  bg: '#0C1220', bd: '#1E293B', tx: '#475569', dot: '#334155', tag: '#1E293B' },
  have:      { l: 'Tengo',  bg: '#041E0F', bd: '#15803D', tx: '#4ADE80', dot: '#22C55E', tag: '#052E16' },
  duplicate: { l: 'Repet.', bg: '#180A00', bd: '#D97706', tx: '#FCD34D', dot: '#F59E0B', tag: '#1C1008' },
}

// 9 stickers de intro (#00-08)
const INTRO_LABELS = [
  'Cubierta', 'Mascota', 'Balón Oficial', 'Ciudades Sede 1', 'Ciudades Sede 2',
  'Ciudades Sede 3', 'Trofeo', 'Logo del Torneo', 'Embajadores',
]

// 11 stickers de FIFA Museum (#969-979)
const MUSEUM_LABELS = [
  'Campeón 1930', 'Campeón 1950', 'Campeón 1958', 'Campeón 1966', 'Campeón 1970',
  'Campeón 1978', 'Campeón 1986', 'Campeón 1998', 'Campeón 2006', 'Campeón 2018',
  'Campeón 2022',
]

export function buildStickers() {
  const out = []

  // 1) Intro (#00-08) — empieza en 0, no en 1.
  INTRO_LABELS.forEach((label, i) => {
    out.push({
      id:   `INT-${i + 1}`,    // ID legacy estable (1..9 internamente)
      num:  i,                  // numeración oficial 0..8
      name: label,
      team: 'FIFA WC 2026',
      flag: '🏆',
      type: 'Intro',
      cat:  'special',
    })
  })

  // 2) 48 equipos × 20 stickers (#9-968).
  STICKER_TEAMS.forEach((team, k) => {
    const base = 9 + k * 20

    // pos 1 → Escudo (foil)
    out.push({
      id:   `${team.id}-C`,
      num:  base,
      name: `${team.name} — Escudo`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Crest',
      cat:  'rare',
    })

    // pos 2-12 → Jugadores 1..11
    for (let i = 1; i <= 11; i++) {
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  base + i,
        name: `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }

    // pos 13 → Foto del plantel
    out.push({
      id:   `${team.id}-G`,
      num:  base + 12,
      name: `${team.name} — Plantel`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Group',
      cat:  'special',
    })

    // pos 14-20 → Jugadores 12..18
    for (let i = 12; i <= 18; i++) {
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  base + (i + 1),  // 14..20
        name: `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }
  })

  // 3) FIFA Museum (#969-979) — al FINAL del álbum.
  MUSEUM_LABELS.forEach((label, i) => {
    out.push({
      id:   `MUS-${i + 1}`,    // ID legacy estable
      num:  969 + i,            // 969..979
      name: label,
      team: 'FIFA Museum',
      flag: '🏆',
      type: 'FIFA Museum',
      cat:  'rare',
    })
  })

  return out
}

export function buildInitialStickerState() {
  const state = {}
  for (const s of buildStickers()) state[s.id] = 'missing'
  return state
}

// Sanity checks en runtime
if (typeof window !== 'undefined') {
  const all = buildStickers()
  if (all.length !== 980) console.warn(`buildStickers() devolvió ${all.length}, esperado 980`)
  // Verificar que los nums cubren 0..979 sin huecos ni duplicados
  const nums = new Set(all.map(s => s.num))
  if (nums.size !== 980) console.warn('buildStickers(): nums duplicados detectados')
  for (let n = 0; n < 980; n++) {
    if (!nums.has(n)) { console.warn(`buildStickers(): falta el num ${n}`); break }
  }
}
