// Panini FIFA World Cup 2026 Sticker Album (Latam) — 980 stickers
//
// Estructura oficial:
//   - 9 stickers de intro (cover, mascot, ball, host cities, etc.)
//   - 11 stickers de FIFA Museum (campeones históricos)
//   - 48 selecciones x 20 = 960 stickers de equipos
//       - 18 retratos de jugadores
//       - 1 foto grupal del equipo
//       - 1 escudo oficial (foil)
//   - Total: 980
//
// Los nombres de jugadores son PLACEHOLDERS genéricos ("Jugador 1", "Jugador 2",
// etc). El usuario los reemplaza con la lista real cuando reciba el álbum
// oficial. NO reproducimos el checklist oficial de Panini.
//
// IDs son determinísticos y estables — se guardan en el blob `data` jsonb del
// usuario, así que no se pueden cambiar después del primer guardado sin migrar.

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

// 9 stickers de intro
const INTRO_LABELS = [
  'Cubierta', 'Mascota', 'Balón Oficial', 'Ciudades Sede 1', 'Ciudades Sede 2',
  'Ciudades Sede 3', 'Trofeo', 'Logo del Torneo', 'Embajadores',
]

// 11 stickers de FIFA Museum (campeones históricos genéricos)
const MUSEUM_LABELS = [
  'Campeón 1930', 'Campeón 1950', 'Campeón 1958', 'Campeón 1966', 'Campeón 1970',
  'Campeón 1978', 'Campeón 1986', 'Campeón 1998', 'Campeón 2006', 'Campeón 2018',
  'Campeón 2022',
]

export function buildStickers() {
  const out = []

  // 1) Intro stickers (1-9)
  INTRO_LABELS.forEach((label, i) => {
    out.push({
      id:   `INT-${i + 1}`,
      num:  i + 1,
      name: label,
      team: 'FIFA WC 2026',
      flag: '🏆',
      type: 'Intro',
      cat:  'special',
    })
  })

  // 2) FIFA Museum (10-20)
  MUSEUM_LABELS.forEach((label, i) => {
    out.push({
      id:   `MUS-${i + 1}`,
      num:  9 + i + 1,
      name: label,
      team: 'FIFA Museum',
      flag: '🏆',
      type: 'FIFA Museum',
      cat:  'rare',
    })
  })

  // 3) 48 equipos x 20 (21-980)
  let n = 21
  for (const team of STICKER_TEAMS) {
    // 18 retratos de jugadores (placeholders)
    for (let i = 1; i <= 18; i++) {
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  n++,
        name: `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }
    // 1 foto grupal
    out.push({
      id:   `${team.id}-G`,
      num:  n++,
      name: `${team.name} — Plantel`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Group',
      cat:  'special',
    })
    // 1 escudo (foil)
    out.push({
      id:   `${team.id}-C`,
      num:  n++,
      name: `${team.name} — Escudo`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Crest',
      cat:  'rare',
    })
  }

  return out
}

export function buildInitialStickerState() {
  const state = {}
  for (const s of buildStickers()) state[s.id] = 'missing'
  return state
}

// Sanity check
if (typeof window !== 'undefined') {
  const total = buildStickers().length
  if (total !== 980) console.warn(`buildStickers() devolvió ${total}, esperado 980`)
}
