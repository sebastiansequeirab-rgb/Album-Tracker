# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto antes de tocar nada.
> Última actualización: 2026-05-07 (Marketplace v2 + perfil público + avatares + WA share + iOS polish).

---

## Qué es esto

App **React + Vite + Supabase** para seguimiento personal de dos álbumes:
1. **Adrenalyn XL FIFA World Cup 2026** (633 cartas)
2. **Álbum de Stickers Panini WC 2026** (980 stickers)

Cada usuario marca cartas como `missing → have → duplicate` y participa en un **marketplace social** con chat realtime, listings públicas, trade requests, favoritos, link público de perfil compartible, mensaje WhatsApp formateado, y avatares con foto real.

- **Producción**: https://album-tracker-three.vercel.app ✅
- **Repo**: https://github.com/sebastiansequeirab-rgb/Album-Tracker (`main`, auto-deploy Vercel ~30s)
- **Owner**: Sebastian Sequeira `sebastiansequeirab@gmail.com`
- **Working dir local**: `/Users/sebastiansequeira/Documents/adrenalyn-tracker 2/`

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + React Router v6 |
| Estilos | CSS Modules + CSS Variables (tokens.css) |
| Animaciones | Framer Motion v12 |
| Fonts | Bebas Neue (display) + DM Sans (body), Google Fonts |
| PDF | jsPDF (export Mis Repetidas / Faltantes) |
| Backend | Supabase (compartido con Skolar — ver abajo) |
| Storage | Supabase Storage bucket `avatars` (público) |
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
| `sticker_collections` | Equivalente Panini (sin prefijo, legacy). |
| `adrenalyn_profiles` | Identidad pública: `display_name`, `avatar_emoji`, **`avatar_url`** (Storage), `contact`, `meeting_points`, `marketplace_visible` (default **true**), `slug` (unique, backfilleado), `trades_completed`. |
| `adrenalyn_favorites` | Relación unilateral `(user_id, target_id)`. |
| `adrenalyn_messages` | Chat 1:1 con realtime (en publication `supabase_realtime`). |
| `adrenalyn_trade_requests` | Solicitudes de intercambio. Status: `pending`/`accepted`/`declined`/`cancelled`/`completed`. Trigger `adrenalyn_trade_status_complete` incrementa `trades_completed` en ambos perfiles cuando pasa a `completed`. |
| `adrenalyn_public_listings` | Ofertas públicas tipo classified. Status: `active`/`closed`/`completed`. `completed_at timestamptz`. |
| `adrenalyn_trade_history` | Historial de cambios concretados (privado). RLS: `auth.uid()=user_id`. |

### RLS crítica (NO simplificar)
- `adrenalyn_collections.SELECT` (auth): `auth.uid()=user_id OR (perfil del owner marketplace_visible=true)`.
- `adrenalyn_collections.SELECT` (anon): `marketplace_visible=true` del owner.
- `sticker_collections.SELECT` (anon): idem.
- `adrenalyn_profiles.SELECT` (anon): `marketplace_visible=true` (necesario para `/u/:slug`).
- `adrenalyn_messages.SELECT`: solo `sender_id` o `recipient_id`.
- `adrenalyn_trade_history.SELECT/INSERT`: solo own user_id.

### Storage
- Bucket `avatars` (público). RLS: usuarios suben/actualizan solo su carpeta `avatars/<userId>/...`.

### Auth
- Email + password. **Email confirmation desactivada** (intencional — Site URL apunta a Skolar).
- Si se reactiva: pasar `options.emailRedirectTo: 'https://album-tracker-three.vercel.app'` en signUp. NO cambiar Site URL global.

### Migraciones aplicadas
- `migrations/2026-05-06-public-profile-and-trade-history.sql` (slug, trades_completed, trade_history, completed_at, RLS anon, trigger).
- `2026-05-07` `avatar_url text` en profiles + UPDATE masivo `marketplace_visible=true` + ALTER DEFAULT true.

---

## Patrones de código load-bearing (no romper)

### `Tracker.jsx`
1. **`upsert` siempre con `{ onConflict: 'user_id' }`** — sin esto, 409 en cada save.
2. **`.maybeSingle()` en load** — distingue "no hay fila" de "error real".
3. **Save coalescing con `saveRef`** — last-write-wins sin races.
4. **`handleAuthError()`** → refreshSession → si falla → signOut.
5. **`useLocalStorageState('adrenalyn:lastTab', 'dashboard', validator)`** persiste el tab activo.
6. **`?openUser=<userId>`** en query string al abrir → tab Marketplace + drill-down auto + URL limpia.

### `Marketplace.jsx`
- **Sub-tabs simplificados**: `Ofertas` / `Buscar` / `Favoritos`. Mensajes y Trades viven en el tab Chat top-level.
- Prop `forceSub='messages'` → activa modo chat (toggle Mensajes/Trades).
- Prop `initialOpenUserId` → dispara `onSelectUser` cuando termina el load.
- Prop `onGoToChat` → callback al Tracker para redirigir al tab Chat tras enviar/aceptar trade.
- `TradeRequestModal` y `CreatePublicListingModal` se montan en el render principal, no dentro del drill-down.
- Z-index modales: `1100`.

### `ChatPanel.jsx`
- Realtime callback envuelto en try/catch con validación `if (!newMsg?.sender_id) return`.
- Lista de hilos siempre visible.
- `useLayoutEffect` + `rootRef.scrollIntoView` para centering al cambiar hilo.
- Botón **WhatsApp** en threadHead si `partnerProfile.contact.whatsapp` existe.

### `lib/marketplace.js`
- `subscribeToInbox` retorna unsub function. **Siempre wrap callback en try/catch**.
- `loadVisibleProfiles` / `loadProfile` defensivos: `select` con `avatar_url`/`slug`/`trades_completed` y fallback al schema viejo si la columna no existe.
- `uploadAvatar(userId, file)` → sube a `avatars/<userId>/<ts>.<ext>`, devuelve URL pública.
- `recordTradeHistory({...})` insert en `adrenalyn_trade_history`.

### `lib/shareMessage.js`
- `buildShareMessage({profile, items, col, ...})` genera mensaje WhatsApp con caja ASCII gold, barra de progreso ▰▰▱▱, top 6 países por sección con tope de 14 stickers c/u, link al perfil, invitación final.
- `copyShareMessage(text)` y `whatsappHref(text)` helpers.

### `components/ui/Avatar.jsx`
- Renderiza `<img>` si `profile.avatar_url`, sino emoji. Acepta `size` y `className`. Fallback `'👤'`.
- Usado en: Marketplace drill-down, search/favoritos cards, ListingBanner, TradeRow, ChatPanel header + lista, PublicProfile (variante propia).

### **`React imports**` (lección aprendida)
- ⚠️ Cuando agregás un componente helper en un archivo existente, **chequear que TODOS los hooks que usa estén en el `import { ... } from 'react'`**. Bug `ReferenceError: useMemo is not defined` rompió Profile en prod por olvidar `useMemo` en el import.

---

## Diseño — "Broadcast × Vault"

### Design system
- **Paleta**: dark `#06080F`, cards translúcidas con backdrop-blur, accent gold `#F5C842` / `#FCD34D`.
- **Fuentes**: Bebas Neue (números, títulos, etiquetas uppercase) + DM Sans (body, labels).
- **Elementos clave**:
  - Chamfered corners TR+BL via `clip-path: polygon(0 0, calc(100%-Npx) 0, 100% Npx, 100% 100%, Npx 100%, 0 calc(100%-Npx))`.
  - Gold left bar: `border-left: 2px solid <color>` en inputs/cards/panels.
  - CTAs: `linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)`.
  - 4 corner brackets con shimmer stagger animation en modales/auth.
  - WhatsApp btn: `linear-gradient(180deg, #25D366 0%, #128C7E 100%)`.
  - `color-mix(in srgb, ...)` para colores derivados.

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
- **Mac ≥1100px**: layouts amplios, slidebar lateral desktop en CardsPage, banner Ofertas en 2 cols.
- **iOS / Mobile ≤540px**: pasada de polish dedicada — paneles 24→14 padding, tipografía reducida, bottom nav de 5 tabs cabe sin scroll, FAB compacto sin label, cards de sticker más bajas (`min-height: 86px`), Profile con scroll dramáticamente reducido.
- `@media (hover: none)` deshabilita hover states en touch.
- `@media (prefers-reduced-motion)` deshabilita animaciones.
- Filtros NO sticky en mobile (fix iOS pegados).

---

## Estructura de archivos

```
src/
├── App.jsx                      Routes: /u/:slug → PublicProfile · /* → MainApp
├── main.jsx                     BrowserRouter wrapper
├── supabaseClient.js
├── data/                        ALBUM_CONFIG, builders. ALBUM_STICKER usa numeración LOCAL 1-20 por equipo.
├── styles/tokens.css + global.css
├── lib/
│   ├── album.js                 loadAlbum, activate/deactivate
│   ├── marketplace.js           profiles, favoritos, messages, trades, listings, trade_history, uploadAvatar
│   ├── shareMessage.js          buildShareMessage / copyShareMessage / whatsappHref
│   ├── exportPdf.js             jsPDF — exportListPdf (Mis Repetidas/Faltantes)
│   └── useLocalStorageState.js  hook genérico
└── components/
    ├── Auth.jsx
    ├── AlbumOnboarding.jsx
    ├── AlbumSwitcher.jsx
    ├── Tracker.jsx              shell: header con link público full-width, bottom nav 5 tabs, FAB Registrar
    ├── PublicProfile.jsx        ruta /u/:slug — CTA "HACER TRADE" arriba, hero compacto, disclosures
    ├── Marketplace.jsx          sub-tabs: Ofertas/Buscar/Favoritos. Drill-down con TypeDonut.
    ├── Profile.jsx              IDENTIDAD / CONTACTOS / VISIBILIDAD + AvatarUploader + PublicLinkBlock + MyListsSection + TradeHistorySection
    ├── ChatPanel.jsx            chat 1:1 con realtime + botón WhatsApp en header
    ├── TradeRequestModal.jsx    permite ofrecer cualquier carta own (have/duplicate)
    ├── CreatePublicListingModal.jsx
    ├── QuickUpdateModal.jsx     "Registrar Movimiento" — search por nombre/equipo/num + paginación
    ├── pages/
    │   ├── DashboardPage.jsx + .module.css     Home: TypeDonut + CTA "Registrar Movimiento" + Próximos + Equipos faltantes
    │   ├── CardsPage.jsx + .module.css         catálogo agrupado por equipo + slidebar desktop + flag chips collapsible
    │   └── TeamsPage.jsx                       LEGACY — ya no se monta. Tab Equipos eliminado.
    └── ui/
        ├── Avatar.jsx                 imagen real o emoji
        ├── StatCard.jsx
        ├── TeamCard.jsx
        ├── TeamDrawer.jsx
        ├── StickerCard.jsx + .module.css       compacta (min-height 92px desktop, 86 mobile)
        ├── SegmentedProgress.jsx
        ├── ProgressBar.jsx
        ├── BulkUpdateModal.jsx                 LEGACY — ya no se monta.
        ├── ConfBadge.jsx
        ├── Flag.jsx
        └── TypeDonut.jsx + .module.css         donut SVG segmentado por tipo
```

---

## Tabs (5)

1. **Home** — TypeDonut con leyenda + barras gold con glow + animación al cargar; CTA "Registrar Movimiento"; "Próximos a Completar" + "Equipos con más Faltantes" (links scrollean a Cartas con filtro de país).
2. **Cartas** — search bar + selección múltiple. Status pills (Tengo/Repetidas/Faltan) clickeables = filtro. Banner desplegable "Filtrar por país" con chips de banderas (toggle on/off). Cards agrupadas por país con header Vault. Slidebar lateral en desktop ≥1100px.
3. **Mercado** — sub-tabs Ofertas/Buscar/Favoritos. Drill-down con TypeDonut + libertad para ofrecer haves. Filtros Ofertas: search + dropdown equipo + #1-20.
4. **Chat** — monta Marketplace con `forceSub='messages'` → toggle Mensajes/Trades en sub-nav. ChatPanel realtime + botón WhatsApp.
5. **Perfil** — IDENTIDAD (display_name, AvatarUploader con foto real + emoji alternativo). CONTACTOS (IG/WA/email). VISIBILIDAD (toggle marketplace_visible default true; PublicLinkBlock con copy mensaje WA + botón verde WhatsApp directo). PUNTOS DE ENCUENTRO. **MIS LISTAS** (toggle Repetidas/Faltantes + exportar PDF). **MIS TRADES** (historial de `trade_history`). MIS ÁLBUMES (toggle activate/deactivate).

---

## Numeración del sticker album (Panini WC 2026)

⚠️ **NO es global.** Cada sección tiene su propia numeración:
- **Intro**: #00-08 (9 stickers).
- **Equipos**: 48 × 20 stickers, num **LOCAL 1-20** por bloque.
  - #1 → Escudo (foil) `XXX-C`
  - #2-12 → 11 jugadores `XXX-P01..P11`
  - #13 → Foto plantel `XXX-G`
  - #14-20 → 7 jugadores `XXX-P12..P18`
- **FIFA Museum**: #1-11 (al final del álbum).

IDs estables — los nombres de jugadores son placeholders genéricos ("Jugador 1", etc.). El usuario reemplaza con la lista real cuando reciba el álbum oficial.

Para Adrenalyn XL la numeración global tradicional 1-633 sigue intacta.

---

## Mensaje WhatsApp (`shareMessage.js`)

Formato:
```
╔═══════════════════════════╗
  ⚽  ÁLBUM PANINI WC 2026
╚═══════════════════════════╝

👤  *Sebastian*
▰▰▱▱▱▱▱▱▱▱▱▱▱▱  6%
✅ 58/980 stickers   🔄 8 repetidas   ❌ 914 faltantes

🔗 *Mi perfil con la lista completa:*
https://album-tracker-three.vercel.app/u/sebastian-xxxxxx

━━━ ❌ ME FALTAN  (914) ━━━
🇩🇪  *Alemania*  (20)
     #1 · #2 · #3 · #4 · …+6
🇪🇸 🇮🇹 🇫🇷 🇧🇷 🇦🇷  +832 en 42 países más → mira mi perfil

━━━━━━━━━━━━━━━━━━━━━━━
¿Cambiamos? 🤝
Sumate al tracker y armamos el álbum:
https://album-tracker-three.vercel.app
```

Botón **Copiar** en banner del header Y en Perfil ahora copia este mensaje (no solo URL). Botón verde **WhatsApp** abre `wa.me/?text=` con el mensaje precargado.

---

## Cuenta de testing
- **Diego**: `Diegobuenano0808@gmail.com` / `Diego04`
- Útil para testear marketplace con 2 sesiones (Sebastian + Diego).

---

## Cómo correr en local

```bash
cd "/Users/sebastiansequeira/Documents/adrenalyn-tracker 2"
npm run dev       # localhost:5173 (puede saltar a 5174/5175 si está ocupado)
npm run build     # 0 errores antes de cualquier commit
git push          # auto-deploy Vercel ~30s
```

`.env` gitignored, ya poblado en local. No commitear nunca.

---

## Smoke test backend

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'adrenalyn_%';
SELECT count(*) FILTER (WHERE marketplace_visible) AS visible, count(*) AS total FROM adrenalyn_profiles;
SELECT count(*) FROM adrenalyn_trade_history;
SELECT id, name, public FROM storage.buckets WHERE id='avatars';
```

---

## Pendientes / ideas registradas

### Housekeeping
- Rotar `service_role` secret (estuvo brevemente en Vercel el 2026-05-01).
- `adrenalyn.set_updated_at` con search_path mutable (warning advisor menor, no bloqueante).
- Bundle JS >1.1MB — considerar code-split de jspdf y framer-motion en chunks separados (`build.rollupOptions.output.manualChunks`).

### UX próximas iteraciones
- Profile Picture: agregar crop tool al subir avatar (hoy se sube tal cual).
- Mensaje WhatsApp: opción de elegir "solo faltantes" / "solo repetidas" / "ambas" al copiar.
- Search del Marketplace: agregar filtro "online ahora" o "activo en últimos 7 días".
- Contar "stickers que TÚ podés dar" en cada user card del search/favoritos (ya existe en `iHaveTheyWant`, falta surface en search view).
- Notificaciones push del navegador para nuevos mensajes / trades.
- Trade history en perfil ajeno (no solo contador `trades_completed`).

### Bugs conocidos / lecciones
- ⚠️ **SIEMPRE chequear imports de hooks de React** al agregar componentes nuevos en archivos existentes. El bug "useMemo is not defined" en `19c8726` rompió Profile en prod.
- Vercel deploy a veces sirve bundle JS nuevo con HTML viejo cacheado durante 30-60s post-push. Hard refresh (Cmd+Shift+R) lo arregla.

---

## Commits recientes
```
19c8726 fix(profile): import useMemo + dedupe ALBUM imports + guards defensivos
b075f91 feat(ios-polish): mercado simplificado + perfil compacto + WA top
3fbd878 feat: visible default + tab Chat + open user + WA share + iOS polish
f2f5d0d feat: 4 tabs + flag filter collapsible + perfil público minimal + avatar real
217a2aa feat(cards/banner): banderas como filtros + headers Vault + link full-width
3751908 feat(cards/marketplace/profile): mejoras visuales + UX correcciones
f44881f feat(quick-update): rename to Registrar Movimiento + buscador por nombre
b39c119 fix(stickers): numeración local por equipo (no global)
317122b fix(stickers): numeración oficial Panini WC 2026
1f43f99 feat: marketplace v2 — trades, perfil público, PDF, Quick Update
```
