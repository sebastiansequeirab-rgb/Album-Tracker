import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Tracker from './components/Tracker'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ background:'#06080F', height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, fontFamily:'sans-serif' }}>
      <div style={{ fontSize:52 }}>⚽</div>
      <div style={{ color:'#FCD34D', fontSize:14, fontWeight:700, letterSpacing:3 }}>CARGANDO...</div>
    </div>
  )

  if (!session) return <Auth />
  return <Tracker session={session} />
}
