import { useState } from 'react'
import { supabase } from '../supabaseClient'

const S = {
  wrap: { minHeight:'100vh', background:'#06080F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:16 },
  card: { background:'linear-gradient(135deg,#0F172A,#162030)', border:'1px solid #1E293B', borderRadius:20, padding:32, width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,.6)' },
  title: { fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:3, color:'#FCD34D', marginBottom:4, textAlign:'center' },
  sub: { fontSize:12, color:'#475569', textAlign:'center', marginBottom:28 },
  label: { fontSize:12, fontWeight:700, color:'#64748B', letterSpacing:1, marginBottom:6, display:'block' },
  input: { width:'100%', background:'#060B18', color:'#E2E8F0', border:'1px solid #334155', borderRadius:10, padding:'11px 14px', fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', marginBottom:16 },
  btn: { width:'100%', padding:'12px', borderRadius:10, border:'none', fontSize:14, fontWeight:800, letterSpacing:1, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'opacity .2s' },
  toggle: { textAlign:'center', marginTop:18, fontSize:13, color:'#475569' },
  err: { background:'#1C0808', border:'1px solid #F87171', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#FCA5A5', marginBottom:16 },
  ok:  { background:'#041E0F', border:'1px solid #16A34A', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#4ADE80', marginBottom:16 },
}

export default function Auth() {
  const [mode,   setMode]  = useState('login') // 'login' | 'signup'
  const [email,  setEmail] = useState('')
  const [pass,   setPass]  = useState('')
  const [load,   setLoad]  = useState(false)
  const [err,    setErr]   = useState('')
  const [ok,     setOk]    = useState('')

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
    <div style={S.wrap}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700;800&display=swap'); *{box-sizing:border-box;} input:focus{border-color:#FCD34D !important;outline:none;}`}</style>
      <div style={S.card}>
        <div style={{textAlign:'center', fontSize:48, marginBottom:8}}>⚽</div>
        <div style={S.title}>ADRENALYN XL</div>
        <div style={S.sub}>FIFA WORLD CUP 2026™ · COLLECTION TRACKER</div>
        {err && <div style={S.err}>⚠️ {err}</div>}
        {ok  && <div style={S.ok}>✓ {ok}</div>}
        <form onSubmit={handle}>
          <label style={S.label}>EMAIL</label>
          <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required />
          <label style={S.label}>CONTRASEÑA</label>
          <input style={S.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required minLength={6} />
          <button type="submit" disabled={load}
            style={{...S.btn, background: load ? '#334155' : 'linear-gradient(135deg,#FCD34D,#F59E0B)', color: load ? '#64748B' : '#000', opacity: load ? .7 : 1}}>
            {load ? '...' : mode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}
          </button>
        </form>
        <div style={S.toggle}>
          {mode === 'login' ? <>¿No tienes cuenta? <span onClick={()=>setMode('signup')} style={{color:'#FCD34D',cursor:'pointer',fontWeight:700}}>Regístrate</span></> : <>¿Ya tienes cuenta? <span onClick={()=>setMode('login')} style={{color:'#FCD34D',cursor:'pointer',fontWeight:700}}>Inicia sesión</span></>}
        </div>
      </div>
    </div>
  )
}
