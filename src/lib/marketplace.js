import { supabase } from '../supabaseClient'

export const EMOJI_AVATARS = ['⚽','🥅','🏆','🎯','🔥','💎','⭐','🚀','🦁','🐺','🐯','🦅','🦈','🐉','👑','🎩']

export const DEFAULT_PROFILE = {
  display_name: '',
  avatar_emoji: '⚽',
  contact: { instagram: '', whatsapp: '', email: '' },
  marketplace_visible: false,
  meeting_points: [],
}

export function deriveDisplayName(email) {
  if (!email) return 'Coleccionista'
  return email.split('@')[0].slice(0, 30)
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureMyProfile(userId, fallbackEmail) {
  const { data: existing, error: selErr } = await supabase
    .from('adrenalyn_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing) return existing

  const displayName = deriveDisplayName(fallbackEmail)
  const seed = {
    user_id: userId,
    display_name: displayName,
    avatar_emoji: '⚽',
    contact: {},
    marketplace_visible: true,
    meeting_points: [],
    slug: makeSlug(displayName, userId),
  }
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .insert(seed)
    .select('*')
    .single()
  if (error) throw error
  return data
}

function makeSlug(displayName, userId) {
  const base = String(displayName || 'coleccionista')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = String(userId || '').slice(0, 6)
  return `${base || 'coleccionista'}-${suffix}`
}

export async function loadMyProfile(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveMyProfile(userId, profile) {
  const payload = {
    user_id: userId,
    display_name: profile.display_name?.trim() || 'Coleccionista',
    avatar_emoji: profile.avatar_emoji || '⚽',
    avatar_url: profile.avatar_url || null,
    contact: profile.contact || {},
    marketplace_visible: !!profile.marketplace_visible,
    meeting_points: Array.isArray(profile.meeting_points) ? profile.meeting_points : [],
  }
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Sube una imagen de avatar al bucket "avatars/<userId>/<timestamp>.<ext>" y
// devuelve la URL pública. Reemplaza cualquier avatar previo del usuario.
export async function uploadAvatar(userId, file) {
  if (!file) throw new Error('Sin archivo')
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${userId}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  return pub?.publicUrl || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

export async function loadVisibleProfiles(currentUserId) {
  // Try with the new schema fields first; fall back if columns don't exist yet.
  try {
    const { data, error } = await supabase
      .from('adrenalyn_profiles')
      .select('user_id, display_name, avatar_emoji, avatar_url, contact, marketplace_visible, meeting_points, updated_at, slug, trades_completed')
      .eq('marketplace_visible', true)
      .neq('user_id', currentUserId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('column')) {
      const { data, error } = await supabase
        .from('adrenalyn_profiles')
        .select('user_id, display_name, avatar_emoji, contact, marketplace_visible, meeting_points, updated_at')
        .eq('marketplace_visible', true)
        .neq('user_id', currentUserId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data || []
    }
    throw err
  }
}

export async function loadProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('adrenalyn_profiles')
      .select('user_id, display_name, avatar_emoji, avatar_url, contact, marketplace_visible, meeting_points, slug, trades_completed')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('column')) {
      const { data, error } = await supabase
        .from('adrenalyn_profiles')
        .select('user_id, display_name, avatar_emoji, contact, marketplace_visible, meeting_points')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    }
    throw err
  }
}

export async function loadCollection(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_collections')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.data || {}
}

export async function loadCollectionsByUserIds(userIds) {
  if (!userIds.length) return {}
  const { data, error } = await supabase
    .from('adrenalyn_collections')
    .select('user_id, data')
    .in('user_id', userIds)
  if (error) throw error
  const map = {}
  for (const row of data || []) map[row.user_id] = row.data || {}
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// Favorites (unilateral)
// ─────────────────────────────────────────────────────────────────────────────

export async function loadMyFavorites(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_favorites')
    .select('id, target_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addFavorite(userId, targetId) {
  const { data, error } = await supabase
    .from('adrenalyn_favorites')
    .insert({ user_id: userId, target_id: targetId })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function removeFavorite(userId, targetId) {
  const { error } = await supabase
    .from('adrenalyn_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('target_id', targetId)
  if (error) throw error
}

export function isFavorite(favorites, targetId) {
  return Array.isArray(favorites) && favorites.some(f => f.target_id === targetId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages (chat in-app)
// ─────────────────────────────────────────────────────────────────────────────

export async function loadThreadMessages(myId, otherId) {
  // Filter by both endpoints — RLS already restricts to messages I'm part of,
  // and the .in() pair guarantees only this 1:1 thread (excludes other threads).
  const { data, error } = await supabase
    .from('adrenalyn_messages')
    .select('*')
    .in('sender_id',    [myId, otherId])
    .in('recipient_id', [myId, otherId])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// Lista hilos: counterpart + last message + unread count
export async function loadMyThreads(myId) {
  // RLS ya garantiza que sólo veamos mensajes donde participamos. Sin filter
  // explícito evitamos el .or() que a veces da problemas de PostgREST.
  const { data, error } = await supabase
    .from('adrenalyn_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const map = new Map()
  for (const m of data || []) {
    const counterpart = m.sender_id === myId ? m.recipient_id : m.sender_id
    if (!map.has(counterpart)) {
      map.set(counterpart, {
        counterpart_id: counterpart,
        last_message: m.content,
        last_message_at: m.created_at,
        last_sender_id: m.sender_id,
        unread_count: 0,
      })
    }
    const t = map.get(counterpart)
    if (m.recipient_id === myId && !m.read_at) t.unread_count += 1
  }
  return Array.from(map.values())
}

export async function sendMessage(senderId, recipientId, content) {
  const trimmed = (content || '').trim()
  if (!trimmed) throw new Error('Mensaje vacío')
  const { data, error } = await supabase
    .from('adrenalyn_messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, content: trimmed.slice(0, 2000) })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function markThreadRead(myId, otherId) {
  const { error } = await supabase
    .from('adrenalyn_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .eq('sender_id', otherId)
    .is('read_at', null)
  if (error) throw error
}

export async function loadUnreadCount(myId) {
  const { count, error } = await supabase
    .from('adrenalyn_messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', myId)
    .is('read_at', null)
  if (error) throw error
  return count || 0
}

export function subscribeToInbox(myId, onInsert) {
  const channel = supabase
    .channel(`adrenalyn_inbox:${myId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'adrenalyn_messages',
        filter: `recipient_id=eq.${myId}`,
      },
      payload => onInsert(payload.new),
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade requests
// ─────────────────────────────────────────────────────────────────────────────

export async function loadMyTradeRequests(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_trade_requests')
    .select('*')
    .or(`initiator_id.eq.${userId},target_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createTradeRequest(payload) {
  const row = {
    initiator_id: payload.initiator_id,
    target_id: payload.target_id,
    album_type: payload.album_type,
    offered_ids: payload.offered_ids || [],
    wanted_ids: payload.wanted_ids || [],
    meeting_point: payload.meeting_point || null,
    meeting_time_exact: payload.meeting_time_exact || null,
    meeting_time_label: payload.meeting_time_label || null,
    message: payload.message || null,
  }
  const { data, error } = await supabase
    .from('adrenalyn_trade_requests')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateTradeRequestStatus(id, status) {
  const { data, error } = await supabase
    .from('adrenalyn_trade_requests')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// Public listings
// ─────────────────────────────────────────────────────────────────────────────

export async function loadActivePublicListings(albumType) {
  const { data, error } = await supabase
    .from('adrenalyn_public_listings')
    .select('*')
    .eq('status', 'active')
    .eq('album_type', albumType)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function loadMyPublicListings(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_public_listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPublicListing(payload) {
  const row = {
    user_id: payload.user_id,
    album_type: payload.album_type,
    offered_ids: payload.offered_ids || [],
    wanted_ids: payload.wanted_ids || [],
    note: payload.note || null,
    meeting_point: payload.meeting_point || null,
    meeting_time_label: payload.meeting_time_label || null,
  }
  const { data, error } = await supabase
    .from('adrenalyn_public_listings')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function closePublicListing(id) {
  const { data, error } = await supabase
    .from('adrenalyn_public_listings')
    .update({ status: 'closed' })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade history (intercambios concretados)
// ─────────────────────────────────────────────────────────────────────────────

export async function recordTradeHistory({
  user_id, partner_id = null, album_type,
  received_ids = [], given_ids = [], note = null,
}) {
  const { data, error } = await supabase
    .from('adrenalyn_trade_history')
    .insert({
      user_id,
      partner_id,
      album_type,
      received_ids,
      given_ids,
      note,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function loadMyTradeHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('adrenalyn_trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('relation')) return []
    throw err
  }
}

export async function deletePublicListing(id) {
  const { error } = await supabase
    .from('adrenalyn_public_listings')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function completePublicListing(id) {
  // Tries to set status='completed' with completed_at; falls back to 'closed' if
  // the column doesn't exist yet (schema migration pending).
  try {
    const { data, error } = await supabase
      .from('adrenalyn_public_listings')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  } catch (err) {
    if (String(err?.message || '').toLowerCase().includes('completed_at')) {
      const { data, error } = await supabase
        .from('adrenalyn_public_listings')
        .update({ status: 'closed' })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    }
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Meeting points (helpers locales sobre profile.meeting_points jsonb)
// ─────────────────────────────────────────────────────────────────────────────

export const MEETING_POINT_TYPES = [
  { id: 'university', label: 'Universidad' },
  { id: 'shopping',   label: 'Centro comercial' },
  { id: 'home',       label: 'Casa' },
  { id: 'other',      label: 'Otro' },
]

export function newMeetingPoint({ name, type = 'other', hint = '' } = {}) {
  return {
    id: crypto.randomUUID(),
    name: (name || '').trim(),
    type,
    hint: (hint || '').trim(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────────

export function computeMatches(myCol, theirCol) {
  const theyHaveIWant = []
  const iHaveTheyWant = []
  const ids = new Set([...Object.keys(myCol), ...Object.keys(theirCol)])
  for (const id of ids) {
    const mine  = myCol[id]
    const their = theirCol[id]
    if (mine === 'missing' && their === 'duplicate') theyHaveIWant.push(id)
    if (mine === 'duplicate' && their === 'missing') iHaveTheyWant.push(id)
  }
  return { theyHaveIWant, iHaveTheyWant }
}

export function buildTradeMessage({ myName, theirName, theyHaveIWant, iHaveTheyWant, allCardsById }) {
  const fmt = ids => ids
    .map(id => allCardsById[id])
    .filter(Boolean)
    .slice(0, 30)
    .map(c => `#${c.num} ${c.name} (${c.team})`)
    .join('\n  ')
  return [
    `¡Hola ${theirName}! Soy ${myName} y vi tu listing en Adrenalyn Tracker.`,
    '',
    `Te puedo dar (${iHaveTheyWant.length}):`,
    `  ${fmt(iHaveTheyWant) || '—'}`,
    '',
    `Me puedes dar (${theyHaveIWant.length}):`,
    `  ${fmt(theyHaveIWant) || '—'}`,
    '',
    '¿Hacemos el trade?',
  ].join('\n')
}
