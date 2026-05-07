import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import s from './Auth.module.css'

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

export default function ResetPassword() {
  const navigate = useNavigate()
  const [pass,     setPass]     = useState('')
  const [pass2,    setPass2]    = useState('')
  const [showPass, setShowPass] = useState(false)
  const [load,     setLoad]     = useState(false)
  const [err,      setErr]      = useState('')
  const [ok,       setOk]       = useState('')
  // Estado de la sesión recovery: 'pending' (esperando token de email),
  // 'ready' (token válido, dejá al user setear pass), 'invalid' (no hay token).
  const [recoveryStatus, setRecoveryStatus] = useState('pending')

  // Supabase auto-detecta el token del hash (#access_token=...&type=recovery)
  // y emite PASSWORD_RECOVERY. Si no hay token después de 1.5s, mostramos
  // mensaje de error con CTA para volver a pedir reset.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryStatus('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // Si ya está signed-in (token recovery procesado), permitir cambio
        setRecoveryStatus('ready')
      }
    })
    // Fallback: si en 1.5s no hubo PASSWORD_RECOVERY, chequear sesión activa.
    // Usuarios pueden estar logueados normalmente y querer cambiar pass también.
    const t = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setRecoveryStatus('ready')
      else setRecoveryStatus(prev => prev === 'pending' ? 'invalid' : prev)
    }, 1500)
    return () => {
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const handle = async e => {
    e.preventDefault()
    setErr(''); setOk('')
    if (pass.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (pass !== pass2) {
      setErr('Las contraseñas no coinciden.')
      return
    }
    setLoad(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) throw error
      setOk('Contraseña actualizada. Te redirigimos…')
      setTimeout(() => navigate('/', { replace: true }), 1400)
    } catch (ex) {
      setErr(ex.message || 'No se pudo actualizar la contraseña.')
    }
    setLoad(false)
  }

  return (
    <div className={s.wrap}>
      <div className={s.stage}>
        <div className={s.card}>
          <div className={s.welcome}>
            <span>Nueva contraseña</span>
          </div>

          {recoveryStatus === 'pending' && (
            <div className={s.ok}>Verificando enlace de recuperación…</div>
          )}

          {recoveryStatus === 'invalid' && (
            <>
              <div className={s.err}>
                ⚠️ El enlace no es válido o expiró. Pedí uno nuevo desde "Iniciar sesión → ¿Olvidaste tu contraseña?".
              </div>
              <div className={s.ctaStack}>
                <button type="button" className={s.cta} onClick={() => navigate('/', { replace: true })}>
                  IR A INICIAR SESIÓN
                  <IconArrow />
                </button>
              </div>
            </>
          )}

          {recoveryStatus === 'ready' && (
            <>
              {err && <div className={s.err}>⚠️ {err}</div>}
              {ok  && <div className={s.ok}>✓ {ok}</div>}

              <form onSubmit={handle} className={s.form}>
                <div className={s.field}>
                  <label className={s.label}>
                    <span className={s.labelNum}>01</span>
                    Nueva contraseña
                  </label>
                  <div className={s.inputBox}>
                    <span className={s.inputIcon}><IconLock /></span>
                    <input
                      className={s.input}
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
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

                <div className={s.field}>
                  <label className={s.label}>
                    <span className={s.labelNum}>02</span>
                    Confirmar contraseña
                  </label>
                  <div className={s.inputBox}>
                    <span className={s.inputIcon}><IconLock /></span>
                    <input
                      className={s.input}
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={pass2}
                      onChange={e => setPass2(e.target.value)}
                      placeholder="••••••••••"
                    />
                  </div>
                </div>

                <div className={s.ctaStack}>
                  <button type="submit" disabled={load} className={s.cta}>
                    {load ? 'GUARDANDO…' : 'GUARDAR NUEVA CONTRASEÑA'}
                    {!load && <IconArrow />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
