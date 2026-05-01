import { useState, useEffect } from 'react'
import { EMOJI_AVATARS, loadMyProfile, saveMyProfile, deriveDisplayName } from '../lib/marketplace'
import s from './Profile.module.css'

export default function Profile({ session, onSaved }) {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [err, setErr]         = useState('')

  useEffect(() => {
    let cancelled = false
    loadMyProfile(session.user.id).then(p => {
      if (cancelled) return
      setProfile(p || {
        display_name: deriveDisplayName(session.user.email),
        avatar_emoji: '⚽',
        contact: { instagram: '', whatsapp: '', email: '' },
        marketplace_visible: false,
      })
    }).catch(e => { if (!cancelled) setErr(e.message || 'Error cargando perfil') })
    return () => { cancelled = true }
  }, [session.user.id, session.user.email])

  if (!profile) return <div className={s.wrap} style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando perfil…</div>

  const upd = (k, v) => setProfile(p => ({ ...p, [k]: v }))
  const updContact = (k, v) => setProfile(p => ({ ...p, contact: { ...(p.contact || {}), [k]: v } }))

  const onSave = async () => {
    setSaving(true); setErr('')
    try {
      const saved = await saveMyProfile(session.user.id, profile)
      setProfile(saved)
      setSavedAt(Date.now())
      onSaved?.(saved)
    } catch(e) {
      setErr(e.message || 'Error guardando perfil')
    }
    setSaving(false)
  }

  const visible = !!profile.marketplace_visible

  return (
    <div className={s.wrap}>

      <div className={s.section}>
        <div className={s.sectionTitle}>👤 IDENTIDAD</div>
        <div className={s.sectionSub}>Cómo te ven los otros coleccionistas en el Marketplace.</div>

        <div className={s.field}>
          <label className={s.label}>NOMBRE PARA MOSTRAR</label>
          <input className={s.input} type="text" maxLength={40}
            value={profile.display_name}
            onChange={e => upd('display_name', e.target.value)}
            placeholder="Ej: Juan, Coleccionista_22, etc." />
        </div>

        <div className={s.field}>
          <label className={s.label}>AVATAR</label>
          <div className={s.avatarRow}>
            {EMOJI_AVATARS.map(em => (
              <button key={em} type="button"
                onClick={() => upd('avatar_emoji', em)}
                className={`${s.avatarBtn} ${profile.avatar_emoji === em ? s.avatarBtnActive : ''}`}>
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>📱 CONTACTOS</div>
        <div className={s.sectionSub}>Cuando alguien quiera proponer un trade, verá los datos que dejes acá. Llena al menos uno.</div>

        <div className={s.field}>
          <label className={s.label}>INSTAGRAM</label>
          <div className={s.inputPrefix}>
            <span className={s.prefix}>@</span>
            <input className={s.input} type="text"
              value={(profile.contact?.instagram || '').replace(/^@/, '')}
              onChange={e => updContact('instagram', e.target.value.replace(/^@/, ''))}
              placeholder="tu_usuario" />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>WHATSAPP</label>
          <input className={s.input} type="tel"
            value={profile.contact?.whatsapp || ''}
            onChange={e => updContact('whatsapp', e.target.value)}
            placeholder="+58 412 1234567" />
        </div>

        <div className={s.field}>
          <label className={s.label}>EMAIL DE CONTACTO</label>
          <input className={s.input} type="email"
            value={profile.contact?.email || ''}
            onChange={e => updContact('email', e.target.value)}
            placeholder={session.user.email} />
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>🌐 VISIBILIDAD</div>
        <div className={s.sectionSub}>Tú decides cuándo apareces en el Marketplace.</div>

        <div className={`${s.toggleRow} ${visible ? s.toggleRowOn : ''}`}
          onClick={() => upd('marketplace_visible', !visible)}
          style={{ cursor: 'pointer' }}>
          <div className={s.toggleBody}>
            <div className={s.toggleTitle}>Visible en Marketplace</div>
            <div className={s.toggleHint}>
              {visible
                ? 'Otros usuarios autenticados ven tu nombre, avatar, contactos y matches contigo.'
                : 'Estás oculto. Activa esto para que otros vean tu listing y propongan trades.'}
            </div>
          </div>
          <div className={`${s.switch} ${visible ? s.switchOn : ''}`}>
            <div className={s.switchKnob} />
          </div>
        </div>
      </div>

      <div className={s.actions}>
        <button onClick={onSave} disabled={saving} className={s.saveBtn}>
          {saving ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>

      {savedAt > 0 && Date.now() - savedAt < 4000 && <div className={s.savedHint}>✓ Guardado</div>}
      {err && <div className={s.errorHint}>⚠️ {err}</div>}

    </div>
  )
}
