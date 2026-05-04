// Barrel central. Re-exporta todo lo del Adrenalyn (compat con imports
// `from '../data'` existentes en Tracker.jsx y Marketplace.jsx) + los símbolos
// nuevos del Sticker Album.

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
