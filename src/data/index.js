// Barrel central. Re-exporta todo lo del Adrenalyn (compat con imports
// `from '../data'` existentes en Tracker.jsx y Marketplace.jsx) + los símbolos
// nuevos del Sticker Album.

import { buildCards, buildInitialState, TM, CC, ST, TEAMS_LIST } from './adrenalyn'
import { STICKER_TEAMS, CC_STICKER } from './teams'
import { buildStickers, buildInitialStickerState, STM, SST } from './stickers'

export * from './adrenalyn'
export * from './teams'
export * from './stickers'

// Constantes de tipo de álbum (single source of truth)
export const ALBUM_ADRENALYN = 'adrenalyn'
export const ALBUM_STICKER   = 'sticker'
export const ALBUM_TYPES     = [ALBUM_ADRENALYN, ALBUM_STICKER]

export const ALBUM_LABELS = {
  [ALBUM_ADRENALYN]: 'Adrenalyn XL',
  [ALBUM_STICKER]:   'Álbum de Stickers',
}

export const ALBUM_TABLE = {
  [ALBUM_ADRENALYN]: 'adrenalyn_collections',
  [ALBUM_STICKER]:   'sticker_collections',
}

// Config completa por álbum — permite que Tracker / Marketplace sean
// album-agnostic. Lookup: ALBUM_CONFIG[albumType].
export const ALBUM_CONFIG = {
  [ALBUM_ADRENALYN]: {
    label:        'Adrenalyn XL',
    subtitle:     'FIFA WORLD CUP 2026™ · COLLECTION TRACKER',
    icon:         '⚽',
    accent:       '#FCD34D',
    buildItems:   buildCards,
    buildInitial: buildInitialState,
    TM, CC, ST,
    teams:        TEAMS_LIST,
    table:        'adrenalyn_collections',
    // Adrenalyn-only Dashboard sections
    showMomentum: true,
    showRare:     true,
    rareTypes:    ['Golden Baller', 'Eternos 22', 'Official Emblem'],
    extraCount:   3,   // Momentum cards
    mainCount:    630, // resto
  },
  [ALBUM_STICKER]: {
    label:        'Álbum de Stickers',
    subtitle:     'PANINI WORLD CUP 2026 · STICKER COLLECTION',
    icon:         '📖',
    accent:       '#10B981',
    buildItems:   buildStickers,
    buildInitial: buildInitialStickerState,
    TM:           STM,
    CC:           CC_STICKER,
    ST:           SST,
    teams:        STICKER_TEAMS,
    table:        'sticker_collections',
    showMomentum: false,
    showRare:     false,
    rareTypes:    [],
    extraCount:   0,
    mainCount:    980,
  },
}
