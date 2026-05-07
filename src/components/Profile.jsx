import { useState, useEffect } from 'react'
import {
  loadMyProfile, saveMyProfile, deriveDisplayName,
  MEETING_POINT_TYPES, newMeetingPoint, uploadAvatar, saveAvatarUrl,
} from '../lib/marketplace'
import { ALBUM_STICKER, ALBUM_ADRENALYN } from '../data'
import { activateAlbum, deactivateAlbum } from '../lib/album'
import s from './Profile.module.css'

/* ── Inline SVG icons (no emoji in UI chrome) ───────────────────────────── */
const IconUser = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconInstagram = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)
const IconWhatsapp = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)
const IconPin = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconBook = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
const IconBolt = (p) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" />
  </svg>
)
const IconPlus = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IconClose = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconCheck = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconAlert = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
)
const IconChevron = (p) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

/* Section header — broadcast pattern: NN / TITLE / rule */
const SectionHead = ({ num, title, sub }) => (
  <>
    <div className={s.sectionHead}>
      <span className={s.sectionNum}>{num}</span>
      <h2 className={s.sectionTitle}>{title}</h2>
      <span className={s.sectionRule} />
    </div>
    {sub && <p className={s.sectionSub}>{sub}</p>}
  </>
)

/* Numbered field label */
const FieldLabel = ({ num, children }) => (
  <label className={s.fieldLabel}>
    <span className={s.fieldLabelNum}>{num}</span>
    <span className={s.fieldLabelText}>{children}</span>
  </label>
)

const MEETING_TYPE_COLORS = {
  university: 'var(--type-jugador)',
  shopping:   'var(--type-intro)',
  home:       'var(--type-plantel)',
  other:      'var(--gold-3)',
}

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

  if (!profile) return <div className={s.wrap} style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando…</div>

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

      {/* ═══════════════════ 01 — PERFIL (Identidad + Contactos) ═══════════════════ */}
      <section className={s.panel}>
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <SectionHead
          num="01"
          title="PERFIL"
          sub="Cómo te ven los otros coleccionistas en el Marketplace. Deja al menos un contacto."
        />

        <div className={s.field}>
          <FieldLabel num="01">Nombre para mostrar</FieldLabel>
          <div className={s.inputBox}>
            <span className={s.inputIcon}><IconUser /></span>
            <input className={s.input} type="text" maxLength={40}
              value={profile.display_name}
              onChange={e => upd('display_name', e.target.value)}
              placeholder="Ej: Juan, Coleccionista_22, etc." />
          </div>
        </div>

        <div className={s.field}>
          <FieldLabel num="02">Foto de perfil</FieldLabel>
          <AvatarUploader
            session={session}
            profile={profile}
            onChange={(url) => upd('avatar_url', url)}
          />
        </div>

        <div className={s.fieldGrid}>
          <div className={s.field}>
            <FieldLabel num="03">Instagram</FieldLabel>
            <div className={s.inputBox}>
              <span className={s.inputIcon}><IconInstagram /></span>
              <span className={s.inputAt}>@</span>
              <input className={s.input} type="text"
                value={(profile.contact?.instagram || '').replace(/^@/, '')}
                onChange={e => updContact('instagram', e.target.value.replace(/^@/, ''))}
                placeholder="tu_usuario" />
            </div>
          </div>

          <div className={s.field}>
            <FieldLabel num="04">WhatsApp</FieldLabel>
            <div className={s.inputBox}>
              <span className={s.inputIcon}><IconWhatsapp /></span>
              <input className={s.input} type="tel"
                value={profile.contact?.whatsapp || ''}
                onChange={e => updContact('whatsapp', e.target.value)}
                placeholder="+58 412 1234567" />
            </div>
          </div>
        </div>

      </section>

      {/* ═══════════════════ 02 — PUNTOS DE ENCUENTRO ═══════════════════ */}
      <section className={s.panel}>
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <SectionHead
          num="02"
          title="PUNTOS DE ENCUENTRO"
          sub="Lugares donde solés intercambiar cartas. Aparecen como sugerencias cuando alguien te propone un trade."
        />

        {meetingPoints.length === 0 && (
          <div className={s.mpEmpty}>
            <IconPin />
            <span>Todavía no agregaste ningún punto. Tap “Agregar punto” para empezar.</span>
          </div>
        )}

        {meetingPoints.map((mp, idx) => (
          <div key={mp.id}
            className={s.mpCard}
            style={{ '--mp-accent': MEETING_TYPE_COLORS[mp.type] || 'var(--gold-3)' }}>
            <div className={s.mpHead}>
              <span className={s.mpIndex}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={s.mpHeadIcon}><IconPin /></span>
              <button type="button" className={s.mpRemove} onClick={() => removeMeetingPoint(mp.id)} aria-label="Eliminar punto">
                <IconClose />
              </button>
            </div>
            <div className={s.mpRow}>
              <div className={s.inputBox} style={{ flex: 2 }}>
                <input
                  className={s.input}
                  type="text"
                  maxLength={80}
                  value={mp.name}
                  onChange={e => updateMeetingPoint(mp.id, { name: e.target.value })}
                  placeholder="Ej: UCAB campus principal"
                />
              </div>
            </div>
            <div className={s.mpRow}>
              <div className={s.inputBox} style={{ flex: 1 }}>
                <select
                  className={`${s.input} ${s.select}`}
                  value={mp.type || 'other'}
                  onChange={e => updateMeetingPoint(mp.id, { type: e.target.value })}>
                  {MEETING_POINT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <span className={s.selectChev}><IconChevron /></span>
              </div>
              <div className={s.inputBox} style={{ flex: 2 }}>
                <input
                  className={s.input}
                  type="text"
                  maxLength={120}
                  value={mp.hint || ''}
                  onChange={e => updateMeetingPoint(mp.id, { hint: e.target.value })}
                  placeholder="Hint (puerta, hora habitual…)"
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className={s.mpAdd} onClick={addMeetingPoint}>
          <IconPlus />
          <span>Agregar punto</span>
        </button>
      </section>

      {/* ═══════════════════ 03 — MIS ÁLBUMES ═══════════════════ */}
      <section className={s.panel}>
        <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
        <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

        <SectionHead
          num="03"
          title="MIS ÁLBUMES ACTIVOS"
          sub="Activá los álbumes que coleccionás. Tu progreso se guarda por separado en cada uno y podés alternarlos desde el header."
        />

        <div className={s.albumGrid}>
          {[
            { id: ALBUM_ADRENALYN, Icon: IconBolt, title: 'Adrenalyn XL',      sub: '633 cartas · trading cards' },
            { id: ALBUM_STICKER,   Icon: IconBook, title: 'Álbum de Stickers', sub: '980 stickers · álbum tradicional' },
          ].map(album => {
            const isActive = activeAlbums.includes(album.id)
            const isBusy   = albumBusy === album.id
            const Icon = album.Icon
            return (
              <button key={album.id}
                type="button"
                className={`${s.albumCard} ${isActive ? s.albumCardOn : ''}`}
                onClick={() => toggleAlbum(album.id)}
                disabled={isBusy}
                aria-pressed={isActive}>
                <span className={s.albumIcon}><Icon /></span>
                <div className={s.albumBody}>
                  <div className={s.albumTitle}>{album.title}</div>
                  <div className={s.albumSub}>
                    {isBusy
                      ? 'Procesando…'
                      : (isActive ? 'Activo · ' : 'No activo · ') + album.sub}
                  </div>
                </div>
                <span className={`${s.albumStatus} ${isActive ? s.albumStatusOn : ''}`}>
                  {isActive ? <IconCheck /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════ Save CTA ═══════════════════ */}
      <div className={s.actions}>
        <button onClick={onSave} disabled={saving} className={s.saveBtn}>
          <span className={s.saveBtnLabel}>
            {saving ? 'GUARDANDO…' : 'GUARDAR'}
          </span>
        </button>
      </div>

      {savedAt > 0 && Date.now() - savedAt < 4000 && (
        <div className={s.savedHint}>
          <IconCheck />
          <span>Guardado</span>
        </div>
      )}
      {err && (
        <div className={s.errorHint}>
          <IconAlert />
          <span>{err}</span>
        </div>
      )}

    </div>
  )
}


function AvatarUploader({ session, profile, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (!file) return
    if (!/^image\//.test(file.type)) {
      setErr('Tiene que ser una imagen.'); return
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr('Máximo 4 MB.'); return
    }
    setErr(null); setBusy(true)
    try {
      const url = await uploadAvatar(session.user.id, file)
      // Persistir al toque al DB para que el cambio sobreviva navegación
      // sin esperar al click de "Guardar" del form completo.
      await saveAvatarUrl(session.user.id, url)
      onChange(url)
    } catch (e2) {
      setErr(e2?.message || 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setErr(null); setBusy(true)
    try {
      await saveAvatarUrl(session.user.id, null)
      onChange(null)
    } catch (e2) {
      setErr(e2?.message || 'No se pudo quitar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.avatarUploader}>
      <div className={s.avatarPreview}>
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt="" className={s.avatarPreviewImg} />
          : <span className={s.avatarPreviewEmoji}>{profile.avatar_emoji || '⚽'}</span>}
      </div>
      <div className={s.avatarUploaderBody}>
        <label className={s.avatarUploadBtn}>
          <input type="file" accept="image/*" onChange={onFile} hidden disabled={busy} />
          {busy ? 'Subiendo…' : (profile.avatar_url ? 'Cambiar foto' : 'Subir foto')}
        </label>
        {profile.avatar_url && (
          <button
            type="button"
            className={s.avatarRemoveBtn}
            onClick={onRemove}
            disabled={busy}
          >
            Quitar
          </button>
        )}
        {err && <div className={s.avatarErr}>{err}</div>}
        {!err && (
          <div className={s.avatarHint}>
            Imagen real (jpg/png/webp), máximo 4 MB. Se ve en tu perfil público y en marketplace.
          </div>
        )}
      </div>
    </div>
  )
}
