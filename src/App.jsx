import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Tracker from './components/Tracker'
import AlbumOnboarding from './components/AlbumOnboarding'
import PublicProfile from './components/PublicProfile'
import { ensureMyProfile } from './lib/marketplace'
import { activateAlbum } from './lib/album'
import { ALBUM_ADRENALYN, ALBUM_STICKER, ALBUM_TYPES } from './data'

const ALBUM_STORAGE_KEY = 'adrenalyn:currentAlbum'

function readStoredAlbum() {
  try {
    const v = localStorage.getItem(ALBUM_STORAGE_KEY)
    return ALBUM_TYPES.includes(v) ? v : null
  } catch { return null }
}

function persistAlbum(albumType) {
  try { localStorage.setItem(ALBUM_STORAGE_KEY, albumType) } catch { /* noop */ }
}

export default function App() {
  return (
    <Routes>
      <Route path="/u/:slug" element={<PublicProfile />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  )
}

function MainApp() {
  const [session, setSession]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [profile, setProfile]             = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentAlbum, setCurrentAlbumRaw] = useState(readStoredAlbum())

  const setCurrentAlbum = useCallback(async (album) => {
    setCurrentAlbumRaw(album)
    if (album) persistAlbum(album)
    // Si el usuario clickea un álbum no activado en el AlbumSwitcher
    // (que ahora siempre muestra los 2), lo activamos al vuelo.
    if (!album || !session?.user?.id) return
    try {
      const next = await activateAlbum(album, session.user.id)
      setProfile(p => p ? { ...p, active_albums: next } : p)
    } catch (err) {
      console.warn('activateAlbum failed:', err)
    }
  }, [session])

  // Boot: validar sesión existente con el server, signOut si JWT roto
  useEffect(() => {
    const boot = async () => {
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          await supabase.auth.signOut()
          setSession(null)
          setLoading(false)
          return
        }
      }
      setSession(existing)
      setLoading(false)
    }
    boot()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Sesión cambia → invalidar profile cache
      if (!s) {
        setProfile(null)
        setCurrentAlbumRaw(null)
        try { localStorage.removeItem(ALBUM_STORAGE_KEY) } catch { /* noop */ }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Cargar/asegurar perfil cuando hay sesión
  useEffect(() => {
    if (!session) { setProfile(null); return }
    let cancelled = false
    setProfileLoading(true)
    ensureMyProfile(session.user.id, session.user.email)
      .then(p => {
        if (cancelled) return
        setProfile(p)
        // Decidir el currentAlbum inicial:
        //   - si el usuario tiene un valor persistido y sigue siendo activo, respetarlo
        //   - si no, usar el primer activo
        const active = p?.active_albums || []
        const stored = readStoredAlbum()
        if (stored && active.includes(stored)) {
          setCurrentAlbumRaw(stored)
        } else if (active.length > 0) {
          setCurrentAlbumRaw(active[0])
          persistAlbum(active[0])
        } else {
          setCurrentAlbumRaw(null)
        }
      })
      .catch(err => console.warn('Profile load failed:', err))
      .finally(() => { if (!cancelled) setProfileLoading(false) })
    return () => { cancelled = true }
  }, [session])

  // Callback cuando cambian los álbumes activos del perfil (desde Profile o Onboarding)
  const onProfileAlbumsChanged = useCallback((nextActive) => {
    setProfile(p => p ? { ...p, active_albums: nextActive } : p)
    if (!nextActive.length) {
      setCurrentAlbumRaw(null)
      return
    }
    if (!nextActive.includes(currentAlbum)) {
      setCurrentAlbumRaw(nextActive[0])
      persistAlbum(nextActive[0])
    }
  }, [currentAlbum])

  const onOnboardingPicked = useCallback((albumType) => {
    setCurrentAlbumRaw(albumType)
    persistAlbum(albumType)
    // Refrescar profile para reflejar active_albums
    setProfile(p => p ? { ...p, active_albums: [albumType] } : p)
  }, [])

  // Loading splash
  if (loading) return <Splash />
  if (!session) return <Auth />
  if (profileLoading && !profile) return <Splash />

  // Onboarding gate: usuario sin álbumes activos → elegir uno
  const activeAlbums = profile?.active_albums || []
  if (activeAlbums.length === 0) {
    return <AlbumOnboarding session={session} onPicked={onOnboardingPicked} />
  }

  // Si current no es válido (fue desactivado), corregir al vuelo
  const album = activeAlbums.includes(currentAlbum) ? currentAlbum : activeAlbums[0]

  return (
    <Tracker
      key={album}
      session={session}
      albumType={album}
      activeAlbums={activeAlbums}
      onSwitchAlbum={setCurrentAlbum}
      onAlbumsChanged={onProfileAlbumsChanged}
    />
  )
}

function Splash() {
  return (
    <div style={{ background:'#06080F', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, fontFamily:'sans-serif' }}>
      <div style={{ fontSize:52 }}>⚽</div>
      <div style={{ color:'#FCD34D', fontSize:14, fontWeight:700, letterSpacing:3 }}>CARGANDO...</div>
    </div>
  )
}
