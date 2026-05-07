import { ALBUM_ADRENALYN, ALBUM_STICKER, ALBUM_LABELS } from '../data'
import s from './AlbumSwitcher.module.css'

const IconAlbum = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)
const IconBolt = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

// Siempre rendea AMBOS álbumes. Si el usuario clickea un álbum no activado,
// el callback onChange se encarga de activarlo (App.setCurrentAlbum maneja eso).
export default function AlbumSwitcher({ albumType, onChange, activeAlbums = [ALBUM_ADRENALYN, ALBUM_STICKER] }) {
  const items = [
    { id: ALBUM_ADRENALYN, Icon: IconBolt,  label: ALBUM_LABELS[ALBUM_ADRENALYN], activeCls: s.btnActiveAdrenalyn },
    { id: ALBUM_STICKER,   Icon: IconAlbum, label: ALBUM_LABELS[ALBUM_STICKER],   activeCls: s.btnActiveSticker   },
  ]

  return (
    <div className={s.wrap} role="group" aria-label="Cambiar álbum">
      {items.map(item => {
        const Icon = item.Icon
        const isCurrent = albumType === item.id
        const isActivated = activeAlbums.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => !isCurrent && onChange?.(item.id)}
            className={`${s.btn} ${isCurrent ? item.activeCls : ''} ${!isActivated ? s.btnInactive : ''}`}
            aria-pressed={isCurrent}
            title={isActivated ? `Cambiar a ${item.label}` : `Activar ${item.label}`}>
            <span className={s.icon} aria-hidden="true"><Icon /></span>
            <span className={s.label}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
