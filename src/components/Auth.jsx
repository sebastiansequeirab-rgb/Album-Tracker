import { useState } from 'react'
import { supabase } from '../supabaseClient'
import s from './Auth.module.css'

export default function Auth() {
  const [mode,  setMode]  = useState('login')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [load,  setLoad]  = useState(false)
  const [err,   setErr]   = useState('')
  const [ok,    setOk]    = useState('')

  const handle = async e => {
    e.preventDefault()
    setErr(''); setOk(''); setLoad(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error
        setOk('¡Cuenta creada! Revisa tu email para confirmar.')
      }
    } catch(e) {
      setErr(e.message || 'Error inesperado')
    }
    setLoad(false)
  }

  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.logo}>⚽</div>
        <div className={s.title}>ADRENALYN XL</div>
        <div className={s.sub}>FIFA WORLD CUP 2026™ · COLLECTION TRACKER</div>

        {err && <div className={s.err}>⚠️ {err}</div>}
        {ok  && <div className={s.ok}>✓ {ok}</div>}

        <form onSubmit={handle}>
          <label className={s.label}>EMAIL</label>
          <input className={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />

          <label className={s.label}>CONTRASEÑA</label>
          <input className={s.input} type="password" value={pass}
            onChange={e => setPass(e.target.value)} placeholder="••••••••" required minLength={6} />

          <button type="submit" disabled={load} className={s.btn}>
            {load ? '...' : mode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
          </button>
        </form>

        <div className={s.toggle}>
          {mode === 'login' ? (
            <>¿No tienes cuenta? <span onClick={() => setMode('signup')} className={s.toggleLink}>Regístrate</span></>
          ) : (
            <>¿Ya tienes cuenta? <span onClick={() => setMode('login')} className={s.toggleLink}>Inicia sesión</span></>
          )}
        </div>
      </div>
    </div>
  )
}
