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

export default function AlbumSwitcher({ albumType, onChange, activeAlbums = [ALBUM_ADRENALYN, ALBUM_STICKER] }) {
  if (activeAlbums.length < 2) return null

  const items = [
    { id: ALBUM_ADRENALYN, Icon: IconBolt,  label: ALBUM_LABELS[ALBUM_ADRENALYN], activeCls: s.btnActiveAdrenalyn },
    { id: ALBUM_STICKER,   Icon: IconAlbum, label: ALBUM_LABELS[ALBUM_STICKER],   activeCls: s.btnActiveSticker   },
  ].filter(x => activeAlbums.includes(x.id))

  return (
    <div className={s.wrap} role="group" aria-label="Cambiar álbum">
      {items.map(item => {
        const Icon = item.Icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => albumType !== item.id && onChange?.(item.id)}
            className={`${s.btn} ${albumType === item.id ? item.activeCls : ''}`}
            aria-pressed={albumType === item.id}>
            <span className={s.icon} aria-hidden="true"><Icon /></span>
            <span className={s.label}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
