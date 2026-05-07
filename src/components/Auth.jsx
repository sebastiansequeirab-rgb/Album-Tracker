import { useState } from 'react'
import { supabase } from '../supabaseClient'
import s from './Auth.module.css'

const IconMail = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
  </svg>
)
const IconLock = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" />
  </svg>
)
const IconEye = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const IconEyeOff = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 4.06-4.94" />
    <path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.16 3.19" />
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M2 2l20 20" />
  </svg>
)
const IconArrow = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)
const IconArrowLeft = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M19 12H5M11 5l-7 7 7 7" />
  </svg>
)
const IconTrophy = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4" /><path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
    <path d="M6 5v6a6 6 0 0 0 12 0V5" /><path d="M9 21h6" /><path d="M12 17v4" />
  </svg>
)

export default function Auth() {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [pass,     setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [load,     setLoad]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')

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
        setOk('¡Cuenta creada! Ya podés iniciar sesión.')
        setMode('login')
      }
    } catch(ex) {
      setErr(ex.message || 'Error inesperado')
    }
    setLoad(false)
  }

  const handleForgot = async () => {
    setErr(''); setOk('')
    if (!email) {
      setErr('Escribí tu email primero para enviarte el link de reseteo.')
      return
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        emailRedirectTo: 'https://wc2026albumtracker.vercel.app/reset-password',
      })
      if (error) throw error
      setOk(`Te enviamos un link a ${email} para resetear tu contraseña.`)
    } catch(ex) {
      setErr(ex.message || 'No se pudo enviar el email')
    }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setErr(''); setOk('')
  }

  return (
    <div className={s.wrap}>
      <div className={s.stage}>

        <div className={s.card}>
          <div className={s.welcome}>
            <span className={s.welcomeIcon}><IconTrophy /></span>
            <span>Bienvenido,</span>
            <em className={s.welcomeAccent}>coleccionista</em>
          </div>

          {err && <div className={s.err}>⚠️ {err}</div>}
          {ok  && <div className={s.ok}>✓ {ok}</div>}

          <form onSubmit={handle} className={s.form}>
            <div className={s.field}>
              <label className={s.label}>
                <span className={s.labelNum}>01</span>
                Correo electrónico
              </label>
              <div className={s.inputBox}>
                <span className={s.inputIcon}><IconMail /></span>
                <input
                  className={s.input}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>
                <span className={s.labelNum}>02</span>
                Contraseña
              </label>
              <div className={s.inputBox}>
                <span className={s.inputIcon}><IconLock /></span>
                <input
                  className={s.input}
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  className={s.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPass ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className={s.optionsRow}>
                <label className={s.rememberRow}>
                  <span
                    className={`${s.checkbox} ${remember ? s.checkboxOn : ''}`}
                    onClick={() => setRemember(v => !v)}>
                    {remember ? '✓' : ''}
                  </span>
                  <span onClick={() => setRemember(v => !v)}>Recordarme</span>
                </label>
                <button type="button" className={s.forgot} onClick={handleForgot}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <div className={s.ctaStack}>
              <button type="submit" disabled={load} className={s.cta}>
                {load ? 'CARGANDO…' : (mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA')}
                {!load && <IconArrow />}
              </button>
              <button type="button" className={s.ctaGhost} onClick={switchMode}>
                {mode === 'login'
                  ? <><span className={s.plus} />CREAR CUENTA</>
                  : <><IconArrowLeft />INICIAR SESIÓN</>}
              </button>
            </div>
          </form>
        </div>
        {/* Features bar (Álbum / Adrenalyn / Intercambia / Sigue tu progreso) está
            baked-in en /login-bg.jpg, por eso no se renderiza en HTML */}
      </div>
    </div>
  )
}
