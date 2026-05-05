import { useState } from 'react'
import { ALBUM_ADRENALYN, ALBUM_STICKER } from '../data'
import { activateAlbum } from '../lib/album'
import { supabase } from '../supabaseClient'
import s from './AlbumOnboarding.module.css'

/* ── Inline SVG icons (no emoji in UI chrome) ─────────────────────────── */
const IconBolt = (p) => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" />
  </svg>
)
const IconBook = (p) => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M9 7h6" /><path d="M9 11h6" />
  </svg>
)
const IconArrow = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)
const IconAlert = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
)

export default function AlbumOnboarding({ session, onPicked }) {
  const [busy, setBusy] = useState(null)   // albumType en progreso
  const [err,  setErr]  = useState('')

  const pick = async (albumType) => {
    setBusy(albumType); setErr('')
    try {
      await activateAlbum(albumType, session.user.id)
      onPicked?.(albumType)
    } catch(e) {
      setErr(e.message || 'No se pudo activar el álbum')
      setBusy(null)
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.stage}>

        {/* ═══════════ Hero ═══════════ */}
        <div className={s.hero}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot} />
            <span className={s.eyebrowText}>Step 01 / Album select</span>
            <span className={s.eyebrowDot} />
          </div>

          <h1 className={s.title}>
            <span>ELEGÍ TU</span>
            <span className={s.titleAccent}>ÁLBUM</span>
          </h1>

          <div className={s.heroDivider}>
            <span className={s.dividerLine} />
            <span className={s.dividerDiamond} />
            <span className={`${s.dividerLine} ${s.dividerLineRight}`} />
          </div>

          <p className={s.subtitle}>
            Empezá con uno. Después podés activar el otro desde Perfil
            y alternar entre ambos cuando quieras.
          </p>
        </div>

        {err && (
          <div className={s.error}>
            <IconAlert />
            <span>{err}</span>
          </div>
        )}

        {/* ═══════════ Cards ═══════════ */}
        <div className={s.cards}>
          {/* Adrenalyn */}
          <button
            type="button"
            onClick={() => pick(ALBUM_ADRENALYN)}
            disabled={busy !== null}
            className={`${s.card} ${busy === ALBUM_ADRENALYN ? s.cardBusy : ''}`}>
            <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

            <div className={s.cardHead}>
              <span className={s.cardNum}>01</span>
              <span className={s.cardLabel}>Trading cards</span>
              <span className={s.cardRule} />
            </div>

            <div className={s.cardIconBox}>
              <IconBolt />
            </div>

            <div className={s.cardTitle}>ADRENALYN XL</div>
            <div className={s.cardCount}>633 cartas</div>
            <p className={s.cardDesc}>
              Cartas con stats, raras (Golden Baller, Eternos 22), Momentum y
              equipos contendientes. Ideal si juntás cartas competitivas.
            </p>

            <div className={s.cardCta}>
              {busy === ALBUM_ADRENALYN
                ? <><span className={s.spinner} /><span>ACTIVANDO…</span></>
                : <><span>EMPEZAR CON ADRENALYN</span><IconArrow /></>}
            </div>
          </button>

          {/* Sticker */}
          <button
            type="button"
            onClick={() => pick(ALBUM_STICKER)}
            disabled={busy !== null}
            className={`${s.card} ${busy === ALBUM_STICKER ? s.cardBusy : ''}`}>
            <span className={`${s.bracket} ${s.tl}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.tr}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.bl}`} aria-hidden="true" />
            <span className={`${s.bracket} ${s.br}`} aria-hidden="true" />

            <div className={s.cardHead}>
              <span className={s.cardNum}>02</span>
              <span className={s.cardLabel}>Álbum tradicional</span>
              <span className={s.cardRule} />
            </div>

            <div className={s.cardIconBox}>
              <IconBook />
            </div>

            <div className={s.cardTitle}>ÁLBUM DE STICKERS</div>
            <div className={s.cardCount}>980 stickers</div>
            <p className={s.cardDesc}>
              Stickers organizados por equipo (18 jugadores + plantel + escudo
              foil), intro y FIFA Museum. El álbum clásico para coleccionistas.
            </p>

            <div className={s.cardCta}>
              {busy === ALBUM_STICKER
                ? <><span className={s.spinner} /><span>ACTIVANDO…</span></>
                : <><span>EMPEZAR CON STICKERS</span><IconArrow /></>}
            </div>
          </button>
        </div>

        {/* ═══════════ Footer ═══════════ */}
        <div className={s.footer}>
          <span>¿Querés salir?</span>
          <button
            type="button"
            className={s.footerLink}
            onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
