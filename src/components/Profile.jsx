import { useState, useEffect } from 'react'
import {
  EMOJI_AVATARS, loadMyProfile, saveMyProfile, deriveDisplayName,
  MEETING_POINT_TYPES, newMeetingPoint,
} from '../lib/marketplace'
import { activateAlbum, deactivateAlbum } from '../lib/album'
import { ALBUM_ADRENALYN, ALBUM_STICKER } from '../data'
import s from './Profile.module.css'

export default function Profile({ session, onSaved, onAlbumsChanged }) {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [err, setErr]         = useState('')
  const [albumBusy, setAlbumBusy] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadMyProfile(session.user.id).then(p => {
      if (cancelled) return
      setProfile(p || {
        display_name: deriveDisplayName(session.user.email),
        avatar_emoji: '⚽',
        contact: { instagram: '', whatsapp: '', email: '' },
        marketplace_visible: false,
        meeting_points: [],
      })
    }).catch(e => { if (!cancelled) setErr(e.message || 'Error cargando perfil') })
    return () => { cancelled = true }
  }, [session.user.id, session.user.email])

  if (!profile) return <div className={s.wrap} style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando perfil…</div>

  const upd = (k, v) => setProfile(p => ({ ...p, [k]: v }))
  const updContact = (k, v) => setProfile(p => ({ ...p, contact: { ...(p.contact || {}), [k]: v } }))

  const meetingPoints = Array.isArray(profile.meeting_points) ? profile.meeting_points : []
  const addMeetingPoint = () => {
    const next = [...meetingPoints, newMeetingPoint({ name: '', type: 'university' })]
    upd('meeting_points', next)
  }
  const updateMeetingPoint = (id, patch) => {
    upd('meeting_points', meetingPoints.map(mp => mp.id === id ? { ...mp, ...patch } : mp))
  }
  const removeMeetingPoint = (id) => {
    upd('meeting_points', meetingPoints.filter(mp => mp.id !== id))
  }

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
  const activeAlbums = profile.active_albums || []

  const toggleAlbum = async (albumType) => {
    if (albumBusy) return
    const isActive = activeAlbums.includes(albumType)
    // No permitir quedarse sin álbumes — debe haber al menos uno activo
    if (isActive && activeAlbums.length <= 1) {
      setErr('Necesitás tener al menos un álbum activo. Activá el otro antes de desactivar este.')
      return
    }
    setAlbumBusy(albumType); setErr('')
    try {
      const next = isActive
        ? await deactivateAlbum(albumType, session.user.id)
        : await activateAlbum(albumType, session.user.id)
      setProfile(p => ({ ...p, active_albums: next }))
      onAlbumsChanged?.(next)
    } catch(e) {
      setErr(e.message || 'No se pudo cambiar el álbum')
    }
    setAlbumBusy(null)
  }

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

      <div className={s.section}>
        <div className={s.sectionTitle}>📍 PUNTOS DE ENCUENTRO HABITUALES</div>
        <div className={s.sectionSub}>
          Lugares donde solés intercambiar cartas. Aparecen como sugerencias cuando alguien te
          propone un trade.
        </div>

        {meetingPoints.length === 0 && (
          <div className={s.mpEmpty}>Todavía no agregaste ningún punto. Tap "Agregar punto" para empezar.</div>
        )}

        {meetingPoints.map((mp) => (
          <div key={mp.id} className={s.mpCard}>
            <div className={s.mpRow}>
              <input
                className={s.input}
                type="text"
                maxLength={80}
                value={mp.name}
                onChange={e => updateMeetingPoint(mp.id, { name: e.target.value })}
                placeholder="Ej: UCAB campus principal"
              />
              <button type="button" className={s.mpRemove} onClick={() => removeMeetingPoint(mp.id)} aria-label="Eliminar punto">×</button>
            </div>
            <div className={s.mpRow}>
              <select
                className={s.input}
                value={mp.type || 'other'}
                onChange={e => updateMeetingPoint(mp.id, { type: e.target.value })}>
                {MEETING_POINT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <input
                className={s.input}
                type="text"
                maxLength={120}
                value={mp.hint || ''}
                onChange={e => updateMeetingPoint(mp.id, { hint: e.target.value })}
                placeholder="Hint opcional (puerta, hora habitual…)"
              />
            </div>
          </div>
        ))}

        <button type="button" className={s.mpAdd} onClick={addMeetingPoint}>
          + Agregar punto
        </button>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>📚 MIS ÁLBUMES</div>
        <div className={s.sectionSub}>
          Activá los álbumes que coleccionás. Tu progreso se guarda por separado
          en cada uno y podés alternarlos desde el header.
        </div>

        {[
          { id: ALBUM_ADRENALYN, icon: '⚽', title: 'Adrenalyn XL',       sub: '633 cartas · trading cards' },
          { id: ALBUM_STICKER,   icon: '📖', title: 'Álbum de Stickers',  sub: '980 stickers · álbum tradicional' },
        ].map(album => {
          const isActive = activeAlbums.includes(album.id)
          const isBusy   = albumBusy === album.id
          return (
            <div key={album.id}
              className={`${s.toggleRow} ${isActive ? s.toggleRowOn : ''}`}
              onClick={() => toggleAlbum(album.id)}
              style={{ cursor: isBusy ? 'wait' : 'pointer', marginBottom: 10, opacity: isBusy ? 0.7 : 1 }}>
              <div className={s.toggleBody}>
                <div className={s.toggleTitle}>{album.icon} {album.title}</div>
                <div className={s.toggleHint}>
                  {isBusy ? 'Procesando…' : (isActive ? 'Activo · ' : 'No activo · ') + album.sub}
                </div>
              </div>
              <div className={`${s.switch} ${isActive ? s.switchOn : ''}`}>
                <div className={s.switchKnob} />
              </div>
            </div>
          )
        })}
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
