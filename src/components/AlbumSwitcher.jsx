import { ALBUM_ADRENALYN, ALBUM_STICKER, ALBUM_LABELS } from '../data'
import s from './AlbumSwitcher.module.css'

export default function AlbumSwitcher({ albumType, onChange, activeAlbums = [ALBUM_ADRENALYN, ALBUM_STICKER] }) {
  if (activeAlbums.length < 2) return null

  const items = [
    { id: ALBUM_ADRENALYN, icon: '⚽', label: ALBUM_LABELS[ALBUM_ADRENALYN], activeCls: s.btnActiveAdrenalyn },
    { id: ALBUM_STICKER,   icon: '📖', label: ALBUM_LABELS[ALBUM_STICKER],   activeCls: s.btnActiveSticker   },
  ].filter(x => activeAlbums.includes(x.id))

  return (
    <div className={s.wrap} role="group" aria-label="Cambiar álbum">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => albumType !== item.id && onChange?.(item.id)}
          className={`${s.btn} ${albumType === item.id ? item.activeCls : ''}`}
          aria-pressed={albumType === item.id}>
          <span className={s.icon}>{item.icon}</span>
          <span className={s.label}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
