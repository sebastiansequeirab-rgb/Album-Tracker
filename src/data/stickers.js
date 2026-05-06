// Panini FIFA World Cup 2026 Sticker Album (oficial Latam) — 980 stickers
//
// IMPORTANTE: la numeración del álbum NO es global (no hay #333). Cada
// sticker se identifica por sección + número local:
//
//   Intro:  #00 a #08 (9 stickers).
//   Equipo: ARG #1..#20, BRA #1..#20, etc. (48 selecciones × 20 = 960).
//             #1     → Escudo (foil)
//             #2-12  → 11 jugadores
//             #13    → Foto del plantel
//             #14-20 → 7 jugadores
//   Museo:  #1 a #11 (campeones históricos), después de los equipos.
//
// El field `num` guarda ese número LOCAL. Para distinguir entre stickers de
// distintos equipos con el mismo num, usar `team` + `num`. El orden visual
// del álbum lo da el orden del array que devuelve buildStickers().
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

// 9 stickers de intro (numerados #00-08)
const INTRO_LABELS = [
  'Cubierta', 'Mascota', 'Balón Oficial', 'Ciudades Sede 1', 'Ciudades Sede 2',
  'Ciudades Sede 3', 'Trofeo', 'Logo del Torneo', 'Embajadores',
]

// 11 stickers de FIFA Museum (numerados #1-11 dentro del Museo)
const MUSEUM_LABELS = [
  'Campeón 1930', 'Campeón 1950', 'Campeón 1958', 'Campeón 1966', 'Campeón 1970',
  'Campeón 1978', 'Campeón 1986', 'Campeón 1998', 'Campeón 2006', 'Campeón 2018',
  'Campeón 2022',
]

export function buildStickers() {
  const out = []

  // 1) Intro — num 0..8.
  INTRO_LABELS.forEach((label, i) => {
    out.push({
      id:   `INT-${i + 1}`,    // ID legacy estable
      num:  i,                  // 0..8
      name: label,
      team: 'FIFA WC 2026',
      flag: '🏆',
      type: 'Intro',
      cat:  'special',
    })
  })

  // 2) 48 equipos × 20 stickers — num 1..20 LOCAL al equipo.
  STICKER_TEAMS.forEach((team) => {
    // #1 → Escudo (foil)
    out.push({
      id:   `${team.id}-C`,
      num:  1,
      name: `${team.name} — Escudo`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Crest',
      cat:  'rare',
    })

    // #2-12 → Jugadores 1..11
    for (let i = 1; i <= 11; i++) {
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  i + 1,
        name: `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }

    // #13 → Foto del plantel
    out.push({
      id:   `${team.id}-G`,
      num:  13,
      name: `${team.name} — Plantel`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Group',
      cat:  'special',
    })

    // #14-20 → Jugadores 12..18
    for (let i = 12; i <= 18; i++) {
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  i + 2,             // 14..20
        name: `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }
  })

  // 3) FIFA Museum — num 1..11 dentro de la sección.
  MUSEUM_LABELS.forEach((label, i) => {
    out.push({
      id:   `MUS-${i + 1}`,
      num:  i + 1,               // 1..11
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
  // IDs únicos
  const ids = new Set(all.map(s => s.id))
  if (ids.size !== all.length) console.warn('buildStickers(): IDs duplicados detectados')
}
