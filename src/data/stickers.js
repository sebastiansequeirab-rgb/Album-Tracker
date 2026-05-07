// Panini FIFA World Cup 2026 Sticker Album (oficial Latam) — 980 stickers
//
// Numeración del álbum:
//   Intro:  9 stickers — código 00 (Panini Logo) + FWC-1..FWC-8 (emblemas,
//           mascotas, eslogan, balón oficial, países sede). Internamente
//           num=0..8.
//   Equipo: 48 selecciones × 20 stickers — codes XXX-1..XXX-20.
//             #1     → Escudo
//             #2-12  → 11 jugadores
//             #13    → Foto del plantel
//             #14-20 → 7 jugadores
//   Museum: 11 stickers — código FWC-9..FWC-19 (campeones históricos).
//           Internamente num=1..11.
//
// Los nombres reales vienen de panini-checklist.json (parseo del checklist
// oficial Panini WC 2026 — fuente cartophilic-info-exch.blogspot.com).
//
// IDs son determinísticos y ESTABLES:
//   - Intro:  INT-1..INT-9
//   - Equipo: <teamId>-C (escudo), <teamId>-P01..P11 + P12..P18 (jugadores),
//             <teamId>-G (plantel)
//   - Museum: MUS-1..MUS-11
// NUNCA renombrar después del primer guardado sin migración explícita.

import { STICKER_TEAMS } from './teams'
import checklist from './panini-checklist.json'

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

export function buildStickers() {
  const out = []

  // 1) Intro — num 0..8 — códigos 00 + FWC-1..FWC-8.
  checklist.intro.forEach((entry) => {
    out.push({
      id:   `INT-${entry.num + 1}`,    // INT-1..INT-9 (estables)
      num:  entry.num,                  // 0..8 (display: code field)
      code: entry.code,                 // "00", "FWC-1"..."FWC-8"
      name: entry.name,
      team: 'FIFA WC 2026',
      flag: '🏆',
      type: 'Intro',
      cat:  'special',
    })
  })

  // 2) 48 equipos × 20 stickers — num 1..20 LOCAL al equipo.
  STICKER_TEAMS.forEach((team) => {
    const teamData = checklist.teams[team.id] || {}

    // #1 → Escudo
    out.push({
      id:   `${team.id}-C`,
      num:  1,
      code: `${team.id}-1`,
      name: `${team.name} — Escudo`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Crest',
      cat:  'rare',
    })

    // #2-12 → Jugadores 1..11
    for (let i = 1; i <= 11; i++) {
      const pos = i + 1                   // posición real en el álbum (2..12)
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  pos,
        code: `${team.id}-${pos}`,
        name: teamData[String(pos)] || `Jugador ${i}`,
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
      code: `${team.id}-13`,
      name: `${team.name} — Plantel`,
      team: team.name,
      flag: team.flag,
      conf: team.conf,
      type: 'Team Group',
      cat:  'special',
    })

    // #14-20 → Jugadores 12..18
    for (let i = 12; i <= 18; i++) {
      const pos = i + 2                   // posición real (14..20)
      out.push({
        id:   `${team.id}-P${String(i).padStart(2, '0')}`,
        num:  pos,
        code: `${team.id}-${pos}`,
        name: teamData[String(pos)] || `Jugador ${i}`,
        team: team.name,
        flag: team.flag,
        conf: team.conf,
        type: 'Player',
        cat:  'base',
      })
    }
  })

  // 3) FIFA Museum — num 1..11 — códigos FWC-9..FWC-19.
  checklist.museum.forEach((entry) => {
    out.push({
      id:   `MUS-${entry.num}`,
      num:  entry.num,                  // 1..11
      code: entry.code,                 // "FWC-9"..."FWC-19"
      name: entry.name,
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
  const ids = new Set(all.map(s => s.id))
  if (ids.size !== all.length) console.warn('buildStickers(): IDs duplicados detectados')
}
