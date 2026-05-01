import { supabase } from '../supabaseClient'

export const EMOJI_AVATARS = ['⚽','🥅','🏆','🎯','🔥','💎','⭐','🚀','🦁','🐺','🐯','🦅','🦈','🐉','👑','🎩']

export const DEFAULT_PROFILE = {
  display_name: '',
  avatar_emoji: '⚽',
  contact: { instagram: '', whatsapp: '', email: '' },
  marketplace_visible: false,
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

  const seed = {
    user_id: userId,
    display_name: deriveDisplayName(fallbackEmail),
    avatar_emoji: '⚽',
    contact: {},
    marketplace_visible: false,
  }
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .insert(seed)
    .select('*')
    .single()
  if (error) throw error
  return data
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
    contact: profile.contact || {},
    marketplace_visible: !!profile.marketplace_visible,
  }
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

export async function loadVisibleProfiles(currentUserId) {
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .select('user_id, display_name, avatar_emoji, contact, marketplace_visible, updated_at')
    .eq('marketplace_visible', true)
    .neq('user_id', currentUserId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('adrenalyn_profiles')
    .select('user_id, display_name, avatar_emoji, contact, marketplace_visible')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
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
// Friendships
// ─────────────────────────────────────────────────────────────────────────────

export async function loadFriendships(currentUserId) {
  const { data, error } = await supabase
    .from('adrenalyn_friendships')
    .select('*')
    .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export function partitionFriendships(friendships, currentUserId) {
  const accepted = []
  const incoming = []
  const outgoing = []
  for (const f of friendships) {
    if (f.status === 'accepted') accepted.push(f)
    else if (f.status === 'pending') {
      if (f.receiver_id === currentUserId) incoming.push(f)
      else outgoing.push(f)
    }
  }
  return { accepted, incoming, outgoing }
}

export function friendshipBetween(friendships, currentUserId, otherId) {
  return friendships.find(f =>
    (f.requester_id === currentUserId && f.receiver_id === otherId) ||
    (f.requester_id === otherId && f.receiver_id === currentUserId)
  ) || null
}

export async function sendFriendRequest(currentUserId, receiverId) {
  const { data, error } = await supabase
    .from('adrenalyn_friendships')
    .insert({ requester_id: currentUserId, receiver_id: receiverId, status: 'pending' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabase
    .from('adrenalyn_friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function rejectFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('adrenalyn_friendships')
    .delete()
    .eq('id', friendshipId)
  if (error) throw error
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
