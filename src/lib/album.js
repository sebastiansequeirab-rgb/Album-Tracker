// Helpers genéricos para load/save de cualquier álbum (adrenalyn | sticker).
// Usan los mismos patrones load-bearing que Tracker.jsx tiene cableados:
//   - .maybeSingle() (no .single()) para distinguir "no hay fila" de "error"
//   - .upsert(..., { onConflict: 'user_id' }) para evitar 409s
//
// El que llama es responsable de seedear el initial state si no hay fila —
// estos helpers son solo SELECT/UPSERT.

import { supabase } from '../supabaseClient'
import { ALBUM_TABLE, ALBUM_TYPES, ALBUM_ADRENALYN, ALBUM_STICKER } from '../data'
import { buildInitialState }        from '../data/adrenalyn'
import { buildInitialStickerState } from '../data/stickers'

function tableFor(albumType) {
  const t = ALBUM_TABLE[albumType]
  if (!t) throw new Error(`Unknown albumType: ${albumType}`)
  return t
}

export function buildInitialFor(albumType) {
  if (albumType === ALBUM_ADRENALYN) return buildInitialState()
  if (albumType === ALBUM_STICKER)   return buildInitialStickerState()
  throw new Error(`Unknown albumType: ${albumType}`)
}

export async function loadAlbum(albumType, userId) {
  const { data, error } = await supabase
    .from(tableFor(albumType))
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function loadAlbumByUserId(albumType, userId) {
  return loadAlbum(albumType, userId)
}

export async function saveAlbum(albumType, userId, payload) {
  const { error } = await supabase
    .from(tableFor(albumType))
    .upsert({ user_id: userId, data: payload }, { onConflict: 'user_id' })
  if (error) throw error
}

// Lee colecciones de varios usuarios para un álbum dado (usado por el
// Marketplace para precalcular matches).
export async function loadAlbumByUserIds(albumType, userIds) {
  if (!userIds.length) return {}
  const { data, error } = await supabase
    .from(tableFor(albumType))
    .select('user_id, data')
    .in('user_id', userIds)
  if (error) throw error
  const map = {}
  for (const row of data || []) map[row.user_id] = row.data || {}
  return map
}

// Activa un álbum para el usuario actual: agrega a active_albums (idempotente)
// y siembra la colección si todavía no existe (con el initial state correspondiente).
export async function activateAlbum(albumType, userId) {
  if (!ALBUM_TYPES.includes(albumType)) {
    throw new Error(`Unknown albumType: ${albumType}`)
  }

  // 1. Asegurar que existe la fila de collection (seed con initial state si falta)
  const existing = await loadAlbum(albumType, userId)
  if (existing == null) {
    await saveAlbum(albumType, userId, buildInitialFor(albumType))
  }

  // 2. Agregar el albumType a active_albums del perfil (idempotente)
  // RLS permite SELECT/UPDATE solo del propio user, así que esta query
  // se ejecuta como el authenticated user.
  const { data: profile, error: selErr } = await supabase
    .from('adrenalyn_profiles')
    .select('active_albums')
    .eq('user_id', userId)
    .maybeSingle()
  if (selErr) throw selErr

  const current = profile?.active_albums || []
  if (!current.includes(albumType)) {
    const next = [...current, albumType]
    const { error: updErr } = await supabase
      .from('adrenalyn_profiles')
      .update({ active_albums: next })
      .eq('user_id', userId)
    if (updErr) throw updErr
    return next
  }
  return current
}

// Desactiva un álbum (lo saca de active_albums; la data persiste en la tabla
// de collection para que no se pierda si lo reactiva después).
export async function deactivateAlbum(albumType, userId) {
  const { data: profile, error: selErr } = await supabase
    .from('adrenalyn_profiles')
    .select('active_albums')
    .eq('user_id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  const current = profile?.active_albums || []
  const next = current.filter(a => a !== albumType)
  if (next.length === current.length) return current
  const { error: updErr } = await supabase
    .from('adrenalyn_profiles')
    .update({ active_albums: next })
    .eq('user_id', userId)
  if (updErr) throw updErr
  return next
}
