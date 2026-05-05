# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto antes de tocar nada.
> Última actualización: 2026-05-05 (iOS polish post visual rebuild completo).

---

## Qué es esto

App **React + Vite + Supabase** para seguimiento personal de dos álbumes:
1. **Adrenalyn XL FIFA World Cup 2026** (633 cartas)
2. **Álbum de Stickers Panini** (980 stickers)

Cada usuario marca cartas como `missing → have → duplicate` y participa en un **marketplace social** con chat realtime, listings públicas, trade requests y favoritos.

- **Producción**: https://album-tracker-three.vercel.app ✅
- **Repo**: https://github.com/sebastiansequeirab-rgb/Album-Tracker (`main`, auto-deploy Vercel ~30s)
- **Owner**: Sebastian Sequeira `sebastiansequeirab@gmail.com`
- **Working dir local**: `/Users/sebastiansequeira/Documents/adrenalyn-tracker 2/`

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Estilos | CSS Modules + CSS Variables (tokens.css) |
| Animaciones | Framer Motion v12 |
| Fonts | Bebas Neue (display) + DM Sans (body), Google Fonts |
| Backend | Supabase (compartido con Skolar — ver abajo) |
| Deploy | Vercel (auto en push a `main`) |

---

## Backend — Supabase (⚠️ NO TOCAR sin intención)

### Supabase compartido con Skolar
- **Project ID**: `xawgomhknzdnhkxcegqi`
- ⚠️ **Compartido con app universitaria Skolar.** Todas las tablas de Adrenalyn tienen prefijo `adrenalyn_`. NUNCA tocar tablas sin ese prefijo. NUNCA cambiar Site URL ni Auth providers globales.
- **API key**: `VITE_SUPABASE_ANON_KEY` en `.env` (gitignored) y Vercel env vars.

### Tablas (`adrenalyn_*`)

| Tabla | Descripción |
|---|---|
| `adrenalyn_collections` | Colección Adrenalyn XL. `data jsonb { card_id: 'missing'|'have'|'duplicate' }` |
| `sticker_collections` | Equivalente Panini (sin prefijo, legacy) |
| `adrenalyn_profiles` | Identidad pública: nombre, avatar_emoji, contactos, meeting_points, marketplace_visible |
| `adrenalyn_favorites` | Relación unilateral `(user_id, target_id)` |
| `adrenalyn_messages` | Chat 1:1 con realtime (en publication `supabase_realtime`) |
| `adrenalyn_trade_requests` | Solicitudes de intercambio estructuradas |
| `adrenalyn_public_listings` | Ofertas públicas tipo classified |

### RLS crítica (NO simplificar)
- `adrenalyn_collections.SELECT`: `auth.uid() = user_id OR (perfil del owner marketplace_visible=true)` — el OR permite matching del marketplace.
- `adrenalyn_messages.SELECT`: solo `sender_id` o `recipient_id`.
- Policies completas en Supabase dashboard.

### Auth
- Email + password. **Email confirmation desactivada** (intencional — Site URL apunta a Skolar).
- Si se reactiva: pasar `options.emailRedirectTo: 'https://album-tracker-three.vercel.app'` en signUp. NO cambiar Site URL global.

---

## Patrones de código load-bearing (no romper)

### `Tracker.jsx`
1. **`upsert` siempre con `{ onConflict: 'user_id' }`** — sin esto, 409 en cada save.
2. **`.maybeSingle()` en load** — distingue "no hay fila" de "error real".
3. **Save coalescing con `saveRef`** — garantiza last-write-wins sin races.
4. **`handleAuthError()`** → refreshSession → si falla → signOut. Evita loops.

### `Marketplace.jsx`
- `TradeRequestModal` y `CreatePublicListingModal` se **montan en el render principal**, no dentro del drill-down. Si se mueven adentro, se desmontarían antes de completar `onSend`.
- Z-index modales: `1100` (header=100, bottom nav mobile=100, FAB=90).

### `ChatPanel.jsx`
- Realtime callback envuelto en try/catch con validación `if (!newMsg?.sender_id) return`.
- Lista de hilos siempre visible (nunca pantalla negra).
- `useLayoutEffect` + `rootRef.scrollIntoView` para centering al cambiar hilo.

### `lib/marketplace.js`
- `subscribeToInbox` retorna unsub function. **Siempre wrap callback en try/catch**.

---

## Diseño — "Broadcast × Vault"

Visual rebuild completo completado (commits 15-23 + iOS polish commit).

### Design system
- **Paleta**: dark `#06080F`, cards translúcidas con backdrop-blur, accent gold `#F5C842` / `#FCD34D`
- **Fuentes**: Bebas Neue (números, títulos, etiquetas uppercase) + DM Sans (body, labels)
- **Elementos clave**:
  - Chamfered corners TR+BL via `clip-path: polygon(0 0, calc(100%-Npx) 0, 100% Npx, 100% 100%, Npx 100%, 0 calc(100%-Npx))`
  - Gold left bar: `border-left: 2px solid <color>` en inputs/cards/panels
  - Section headers: `<span num>NN</span> <h3>TITLE</h3> <span rule />`
  - CTAs: `linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)`
  - 4 corner brackets con shimmer stagger animation en modales/auth
  - `color-mix(in srgb, ...)` para colores derivados

### Tokens CSS (en `tokens.css` — NO tocar)
```css
--gold-1: #FFE9A8  --gold-2: #F5C842  --gold-3: #FCD34D
--gold-4: #E6A817  --gold-5: #C88A00
--conf-conmebol: #3B82F6   --conf-uefa: #6366F1
--conf-concacaf: #10B981   --conf-caf:  #F59E0B
--conf-afc:      #EF4444   --conf-ofc:  #8B5CF6
--status-have:   #22C55E   --status-missing: #EF4444
--type-intro:    #3B82F6   --type-museum: #F5C842
--type-jugador:  #10B981   --type-plantel: #F97316
--type-escudo:   #8B5CF6   --type-momentum: #EC4899
```

### Responsive
- **Mac ≥1440px**: grids 4-6 columnas, max-width 1400px centrado, drawers 420px+
- **iPhone 375-414px**: bottom nav fija, modales bottom-sheet (border-radius 16px top), FAB circular, `100dvh`, safe-area env vars, `font-size: 16px` en inputs (no iOS zoom)
- `@media (hover: none)` deshabilita hover states en touch
- `@media (prefers-reduced-motion)` deshabilita animaciones

---

## Estructura de archivos

```
src/
├── App.jsx                      auth gate
├── main.jsx
├── supabaseClient.js
├── data/                        ALBUM_CONFIG, builders (buildInitialState, buildItems)
├── styles/
│   ├── tokens.css               CSS vars (NO tocar)
│   └── global.css               reset, fonts
├── lib/
│   ├── album.js                 loadAlbum, activar/desactivar álbumes
│   └── marketplace.js           profiles, favoritos, messages, trades, listings
└── components/
    ├── Auth.jsx + .module.css                    login/registro con BG image
    ├── AlbumOnboarding.jsx + .module.css         primer uso: elegir álbum
    ├── AlbumSwitcher.jsx + .module.css           toggle Adrenalyn ↔ Stickers
    ├── Flag.jsx                                  SVG flags de flagcdn.com
    ├── Tracker.jsx + .module.css                 shell principal: header, nav, 5 tabs
    ├── Marketplace.jsx + .module.css             sub-tabs, drill-down, listings
    ├── Profile.jsx + .module.css                 identidad + meeting points
    ├── TradeRequestModal.jsx + .module.css
    ├── CreatePublicListingModal.jsx + .module.css
    ├── ChatPanel.jsx + .module.css               lista hilos + hilo activo + realtime
    ├── pages/
    │   ├── DashboardPage.jsx + .module.css       stats, por tipo, próximos, faltantes
    │   ├── TeamsPage.jsx + .module.css           grid selecciones, drawer por equipo
    │   └── CardsPage.jsx + .module.css           catálogo con filtros y bulk actions
    └── ui/
        ├── StatCard.jsx + .module.css            stat card grande Bebas
        ├── TeamCard.jsx + .module.css            card selección con bandera
        ├── TeamDrawer.jsx + .module.css          drawer lateral/bottom con cartas
        ├── StickerCard.jsx + .module.css         card individual de carta/sticker
        ├── SegmentedProgress.jsx + .module.css   barra progreso segmentada (topbar)
        ├── ProgressBar.jsx + .module.css         barra simple para cards/rows
        ├── BulkUpdateModal.jsx + .module.css     actualizar N cartas por número
        ├── ConfBadge.jsx                         badge confederación con color
        └── Flag.jsx                              (alias)
```

---

## Login (Auth.jsx)
- BG image: `public/login-bg.jpg` (foto del usuario con packs WC2026 + features bar baked-in)
- Card central chamfered con hero "WORLD CUP 2026" + subtitulo + form
- Recordarme + ¿Olvidaste? en la misma fila
- Mobile: `min-height: 100dvh`, `padding-bottom` calculado para no tapar la features bar del BG

---

## Tabs implementados

1. **Dashboard** — 4 StatCards Bebas (total/tengo/faltan/reps), CTA bulk update, "Por Tipo" con barras de progreso, "Próximos a Completar" (ranking con ratio have/total), "Equipos con más faltantes"
2. **Equipos** — grid por confederación con ProgressBar por equipo, drawer de cartas al hacer click
3. **Cartas** — catálogo filtrable por status/tipo/equipo/búsqueda, bulk actions (sticky bar), selección múltiple
4. **Marketplace** — sub-tabs: Todos / Favoritos / Mensajes / Bandeja / Mi lista
5. **Perfil** — display_name, avatar emoji (grid de 16), IG/WhatsApp/email, meeting points, mis álbumes

---

## Cuenta de testing

- **Diego**: `Diegobuenano0808@gmail.com` / `Diego04` — tiene 74 missing seedeados
- Útil para testear marketplace con 2 sesiones (Sebastian + Diego)

---

## Cómo correr en local

```bash
cd "/Users/sebastiansequeira/Documents/adrenalyn-tracker 2"
npm run dev       # localhost:5180
npm run build     # 0 errores antes de cualquier commit
git push          # auto-deploy Vercel ~30s
```

`.env` gitignored, ya poblado en local. No commitear nunca.

---

## Smoke test backend

```sql
-- Verificar tablas
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename LIKE 'adrenalyn_%';
-- Esperado: collections, profiles, favorites, messages, trade_requests, public_listings

-- Verificar realtime
SELECT tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='adrenalyn_messages';
```

---

## Pendientes / ideas registradas

### Housekeeping menor
- Rotar `service_role` secret (estuvo brevemente en Vercel el 2026-05-01)
- `adrenalyn.set_updated_at` con search_path mutable (warning advisor menor, no bloqueante)

### Marketplace v2.x (no implementado)
- Tracking de trades cerrados (confirmar intercambio completado)
- Botón "Reportar usuario"
- Friends-only listings (solo para favoritos)
- Notificaciones push del navegador
