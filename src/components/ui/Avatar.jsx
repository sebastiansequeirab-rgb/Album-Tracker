/* Pequeño helper que renderiza la imagen del usuario si tiene avatar_url, sino
   cae al emoji. Acepta `size` (px) y `className` para integración con cada
   contexto (ChatPanel, Marketplace cards, etc.). */
export default function Avatar({ profile, size = 36, className = '', emojiFallback = '👤' }) {
  if (!profile) {
    return <span className={className} style={baseStyle(size)}>{emojiFallback}</span>
  }
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className={className}
        style={{
          ...baseStyle(size),
          objectFit: 'cover',
          background: '#0d111c',
          border: '1px solid rgba(245, 200, 70, 0.30)',
        }}
      />
    )
  }
  return (
    <span className={className} style={baseStyle(size)}>
      {profile.avatar_emoji || emojiFallback}
    </span>
  )
}

function baseStyle(size) {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'inline-grid',
    placeItems: 'center',
    fontSize: Math.round(size * 0.55),
    lineHeight: 1,
    flexShrink: 0,
    overflow: 'hidden',
  }
}
