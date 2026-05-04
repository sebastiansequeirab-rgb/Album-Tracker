import { useState } from 'react'
import { ALBUM_ADRENALYN, ALBUM_STICKER } from '../data'
import { activateAlbum } from '../lib/album'
import { supabase } from '../supabaseClient'
import s from './AlbumOnboarding.module.css'

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
      <div className={s.hero}>
        <div className={s.title}>¿CON QUÉ ÁLBUM EMPEZÁS?</div>
        <div className={s.subtitle}>
          Elegí uno para comenzar. Después podés activar el otro desde Perfil
          y alternar entre ambos cuando quieras.
        </div>
      </div>

      {err && <div className={s.error}>⚠️ {err}</div>}

      <div className={s.cards}>
        <button
          onClick={() => pick(ALBUM_ADRENALYN)}
          disabled={busy !== null}
          className={`${s.card} ${s.cardAdrenalyn}`}>
          <div className={s.cardIcon}>⚽</div>
          <div className={s.cardTitle}>ADRENALYN XL</div>
          <div className={`${s.cardCount} ${s.cardCountAdrenalyn}`}>633 cartas · trading cards</div>
          <div className={s.cardDesc}>
            Cartas con stats, raras (Golden Baller, Eternos 22), Momentum y
            equipos contendientes. Ideal si juntás cartas competitivas.
          </div>
          <div className={`${s.cardCta} ${s.cardCtaAdrenalyn}`}>
            {busy === ALBUM_ADRENALYN
              ? <><span className={s.spinner} />Activando…</>
              : 'EMPEZAR CON ADRENALYN →'}
          </div>
        </button>

        <button
          onClick={() => pick(ALBUM_STICKER)}
          disabled={busy !== null}
          className={`${s.card} ${s.cardSticker}`}>
          <div className={s.cardIcon}>📖</div>
          <div className={s.cardTitle}>ÁLBUM DE STICKERS</div>
          <div className={`${s.cardCount} ${s.cardCountSticker}`}>980 stickers · álbum tradicional</div>
          <div className={s.cardDesc}>
            Stickers organizados por equipo (18 jugadores + plantel + escudo
            foil), intro y FIFA Museum. El álbum clásico para coleccionistas.
          </div>
          <div className={`${s.cardCta} ${s.cardCtaSticker}`}>
            {busy === ALBUM_STICKER
              ? <><span className={s.spinner} />Activando…</>
              : 'EMPEZAR CON STICKERS →'}
          </div>
        </button>
      </div>

      <div className={s.footer}>
        ¿Querés salir? <span className={s.footerLink} onClick={() => supabase.auth.signOut()}>Cerrar sesión</span>
      </div>
    </div>
  )
}
