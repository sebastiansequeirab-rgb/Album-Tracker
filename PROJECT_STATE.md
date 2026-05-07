# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto antes de tocar nada.
> Última actualización: 2026-05-07 (cierre pre-Mundial: 980 nombres reales + multi-dups + Profile 2 secs + Mapa Colección).

---

## Qué es esto

App **React + Vite + Supabase** para seguimiento personal de dos álbumes:
1. **Adrenalyn XL FIFA World Cup 2026** (633 cartas).
2. **Álbum de Stickers Panini WC 2026** (980 stickers — con **nombres reales** del checklist oficial).

Cada usuario marca cartas como `missing → have → duplicate (×2/×3/×4)` y participa en un **marketplace social** con chat realtime, listings públicas, trade requests, favoritos, link público de perfil compartible, mensaje WhatsApp formateado con lista completa, avatar real, mapa interactivo de progreso por país, y reset password.

- **Producción**: https://wc2026albumtracker.vercel.app ✅
- **Repo**: https://github.com/sebastiansequeirab-rgb/Album-Tracker (`main`, auto-deploy Vercel ~30s)
- **Owner**: Sebastian Sequeira `sebastiansequeirab@gmail.com`
- **Working dir local**: `/Users/sebastiansequeira/Documents/adrenalyn-tracker 2/`

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 6 + React Router v7 |
| Estilos | CSS Modules + CSS Variables (tokens.css) |
| Animaciones | Framer Motion v12 |
| Fonts | Bebas Neue (display) + DM Sans (body), Google Fonts |
| PDF | jsPDF (lazy via dynamic import en `lib/exportPdf.js`) |
| Backend | Supabase (compartido con Skolar — ver abajo) |
| Storage | Supabase Storage bucket `avatars` (público) |
| Deploy | Vercel (auto en push a `main`) |
| Bundle | Code-split (manualChunks): react-vendor, supabase, motion separados. Init ~247 KB / 74 KB gzip. |

---

## Backend — Supabase (⚠️ NO TOCAR sin intención)

### Supabase compartido con Skolar
- **Project ID**: `xawgomhknzdnhkxcegqi`
- ⚠️ **Compartido con app universitaria Skolar (Pro tier).** Todas las tablas de Adrenalyn tienen prefijo `adrenalyn_` (excepto `sticker_collections` legacy). NUNCA tocar tablas sin ese prefijo. NUNCA cambiar Site URL ni Auth providers globales.
- **API key**: `VITE_SUPABASE_ANON_KEY` en `.env` (gitignored) y Vercel env vars.

### Tablas (`adrenalyn_*`)

| Tabla | Descripción |
|---|---|
| `adrenalyn_collections` | Adrenalyn XL. `data jsonb` (status missing/have/duplicate por card_id) + `extras jsonb` (counter de dups extra cuando status='duplicate'). |
| `sticker_collections` | Equivalente Panini (legacy sin prefijo). Mismo shape: data + extras. |
| `adrenalyn_profiles` | Identidad pública: `display_name`, `avatar_url`, `contact` (IG + WA), `meeting_points`, `marketplace_visible` (default true, **forzado a true** — toggle eliminado), `slug` (unique), `trades_completed`, `active_albums`. |
| `adrenalyn_favorites` | Relación `(user_id, target_id)`. |
| `adrenalyn_messages` | Chat 1:1 con realtime (en publication `supabase_realtime`). |
| `adrenalyn_trade_requests` | Solicitudes de intercambio. Status: `pending`/`accepted`/`declined`/`cancelled`/`completed`. Trigger `adrenalyn_increment_trades_on_complete` incrementa `trades_completed` cuando pasa a `completed`. |
| `adrenalyn_public_listings` | Ofertas públicas. Status: `active`/`closed`/`completed`. `completed_at timestamptz`. |
| `adrenalyn_trade_history` | Historial de cambios concretados (privado). |

### RLS crítica (NO simplificar)
- Todas las policies usan `(select auth.uid())` (mejora 10-100× a escala).
- `adrenalyn_*.SELECT (anon)`: cuando `marketplace_visible=true` (necesario para `/u/:slug` público).
- `sticker_collections.SELECT (anon)`: idem.
- `adrenalyn_messages.SELECT`: solo `sender_id` o `recipient_id`.
- `adrenalyn_trade_history.SELECT/INSERT`: solo own user_id.

### Storage
- Bucket `avatars` (público). RLS: usuarios suben/actualizan solo su carpeta `avatars/<userId>/...`.
- Helper `saveAvatarUrl(userId, url)` persiste avatar al toque (no esperar al click "Guardar" del form).

### Auth
- Email + password.
- **Email confirmation desactivada** (intencional — Site URL apunta a Skolar).
- **Reset password** en `/reset-password`. Maneja BOTH flows (implicit hash + PKCE code).
- **Pendiente manual**:
  - Habilitar Leaked Password Protection (HaveIBeenPwned check) en Auth → Providers.
  - Agregar `https://wc2026albumtracker.vercel.app/reset-password` en Auth → URL Configuration → Redirect URLs.

### Migraciones aplicadas (orden)
1. `migrations/2026-05-06-public-profile-and-trade-history.sql` (slug, trades_completed, trade_history, completed_at, RLS anon, trigger).
2. `2026-05-07` `avatar_url` text en profiles + UPDATE marketplace_visible=true + ALTER DEFAULT true.
3. `adrenalyn_rls_optim_and_fk_indexes_2026_05_07` — RLS reescritas con `(select auth.uid())` + 5 índices FK + search_path fijado.
4. `adrenalyn_collections_extras_2026_05_07` — columna `extras jsonb default '{}'` para multi-duplicates.

---

## Patrones de código load-bearing (no romper)

### `Tracker.jsx`
1. **`upsert` siempre con `{ onConflict: 'user_id' }`** — sin esto, 409 en cada save.
2. **`.maybeSingle()` en load** — distingue "no hay fila" de "error real".
3. **Save coalescing con `saveRef`** — last-write-wins sin races. Save acepta `(newCol, newExtras)`.
4. **`handleAuthError()`** → refreshSession → si falla → signOut.
5. **`useLocalStorageState('adrenalyn:lastTab', 'dashboard', validator)`** persiste el tab activo.
6. **`?openUser=<userId>`** en query string al abrir → tab Marketplace + drill-down auto + URL limpia.
7. **Tab change effect** dispara 3× `window.scrollTo(0, 0)` (sync + RAF + 120ms) para overrides de mounts posteriores.
8. **`MAX_EXTRAS = 2`** — cap de duplicadas extra (cycle ×2/×3/×4 → missing).
9. **`fTeam` es array** (`string[]`), no string. Filter logic usa `includes`.

### `Marketplace.jsx`
- Sub-tabs: `Ofertas` / `Buscar` / `Favoritos` / `Trades`. Chat tab usa `forceSub='messages'` con sub-tabs `Mensajes` / `Buscar`.
- `ListingBanner` colapsado por default. Click anywhere → expand. Avatar/name → onViewProfile (stopPropagation). favStar → toggle (stopPropagation).
- `bannerAuthor` con `flex: 0 1 auto` y `max-width: 70%` — solo content-width.
- TradeRequestModal y CreatePublicListingModal se montan en el render principal.
- Z-index modales: `1100`.

### `ChatPanel.jsx`
- Auto-scroll al fondo SOLO cuando hay `activeCpId` (sin guard, scrolleaba el window al fondo en lista de hilos).
- `useLayoutEffect` usa `window.scrollTo(0, 0)` (NO `scrollIntoView`).
- Lista de hilos siempre visible.
- Botón **WhatsApp** en threadHead si `partnerProfile.contact.whatsapp` existe.

### `Profile.jsx`
- Solo 2 secciones: **PERFIL** (display name + avatar uploader + IG + WA + Puntos de Encuentro como sub-bloque) + **ÁLBUMES ACTIVOS**.
- 0 numeración (`SectionHead` sin num, `FieldLabel` sin num, mpIndex eliminado).
- Sub-bloque para Puntos uses helper `SubHead` (gold-2 más chico, dashed border).
- Avatar upload persiste al toque via `saveAvatarUrl`.

### `lib/marketplace.js`
- `subscribeToInbox` retorna unsub function. **Siempre wrap callback en try/catch**.
- `loadVisibleProfiles` / `loadProfile` defensivos: fallback al schema viejo si la columna no existe.
- `uploadAvatar(userId, file)` → sube a `avatars/<userId>/<ts>.<ext>`, devuelve URL pública.
- `saveAvatarUrl(userId, url)` → patch directo solo `avatar_url` (sin tocar otros fields).
- `saveMyProfile`: hard-codes `marketplace_visible: true` y strip `email` de contact (toggle visibility eliminado).
- `recordTradeHistory({...})` insert en `adrenalyn_trade_history`.

### `lib/shareMessage.js`
- `buildShareMessage({profile, items, col, extras, ...})` — cabecera plana "⚽ ÁLBUM PANINI WC 2026", barra ▰▱, sección "ME FALTAN" con TODOS los países y TODOS los #stickers separados por coma. Usa `extras` para sumar dups correctamente.
- `copyShareMessage(text)` y `whatsappHref(text)` helpers.

### `data/stickers.js` + `data/teams.js` + `data/panini-checklist.json`
- 48 equipos REALES en `STICKER_TEAMS` (post abril 2026 classifications).
- Nombres oficiales viven en `panini-checklist.json` (parseado del blog cartophilic-info-exch). 980/980 stickers complete.
- `buildStickers()` lee del JSON con fallback a "Jugador N" si falta slot.
- IDs estables: `INT-1..9`, `<team>-C/-P01..P18/-G`, `MUS-1..MUS-11`. NUNCA renombrar.

### `components/ui/StickerCard.jsx`
- Cycle: `missing → have → duplicate (extras=0) → ext=1 → ext=2 → missing`.
- Labels: `Falta`, `Tengo`, `Repetida`, `Repetida ×2`, `Repetida ×3`.
- Sin editor numérico (eliminado).

### `components/ui/CountryProgressMap.jsx` (NUEVO)
- Grid 48 banderas con anillos SVG circulares.
- Mobile-first: 5-6 cols en iPhone, 8 desktop.
- Anillo gris (0%), gold gradient (1-99%), verde glow (100%).
- Animation stroke-dashoffset stagger 35ms × index.
- Tap → `setFTeam([country])` + `setTab('cards')`.
- Solo se monta cuando `albumType === 'sticker'`.

### `components/ResetPassword.jsx` (NUEVO)
- Ruta `/reset-password` en App.jsx.
- Maneja PKCE (`?code=...`) con `exchangeCodeForSession` + implicit (`#access_token=...`) via PASSWORD_RECOVERY event.
- Timeout fallback 5s.

### **`React imports**`
- ⚠️ Cuando agregás un componente helper en un archivo existente, **chequear que TODOS los hooks que usa estén en el `import { ... } from 'react'`**.

---

## Diseño — "Broadcast × Vault"

### Design system
- **Paleta**: dark `#06080F`, cards translúcidas con backdrop-blur, accent gold `#F5C842` / `#FCD34D`.
- **Fuentes**: Bebas Neue (números, títulos, etiquetas uppercase) + DM Sans (body, labels).
- **Status chip premium**: glow color-mixed según status (have verde, dup ámbar), borders + shadow elevados.
- **Top banner** del Tracker: sticky, colapsable en scroll. **TU LINK row solo en Home (Dashboard)** — en otras tabs el espacio se libera. Tamaño TU LINK reducido ~50% para no estorbar.
- **Mercado banner**: tap-anywhere expande. Avatar/nombre → perfil. ⭐ → favorito.
- **CTAs**: `linear-gradient(180deg, #FFE9A8 0%, #F5C842 30%, #E6A817 70%, #C88A00 100%)`.
- **WhatsApp btn**: `linear-gradient(180deg, #25D366 0%, #128C7E 100%)`.
- **QuickUpdateModal mobile**: bottom sheet (border-radius solo arriba, slide-up, max-height 92dvh, padding-bottom safe-area).

### Responsive
- **Mac ≥1100px**: layouts amplios, slidebar lateral desktop en CardsPage.
- **iOS / Mobile ≤540px**: pasada de polish dedicada — paneles más chicos, tipografía reducida, bottom nav de 5 tabs cabe sin scroll, FAB eliminado.
- `@media (hover: none)` deshabilita hover states en touch.
- `@media (prefers-reduced-motion)` deshabilita animaciones.

---

## Estructura de archivos

```
src/
├── App.jsx                      Routes: /u/:slug → PublicProfile · /reset-password → ResetPassword · /* → MainApp
├── main.jsx                     BrowserRouter wrapper
├── supabaseClient.js
├── data/
│   ├── teams.js                 STICKER_TEAMS = 48 equipos REALES
│   ├── stickers.js              buildStickers() lee panini-checklist.json
│   ├── panini-checklist.json    980 nombres oficiales (intro + museum + 48 teams)
│   ├── adrenalyn.js             ALBUM_ADRENALYN
│   └── index.js
├── styles/tokens.css + global.css
├── lib/
│   ├── album.js                 activate/deactivate albums
│   ├── marketplace.js           profiles, favoritos, messages, trades, listings, uploadAvatar, saveAvatarUrl
│   ├── shareMessage.js          buildShareMessage con extras + lista completa
│   ├── exportPdf.js             jsPDF lazy via dynamic import
│   └── useLocalStorageState.js
└── components/
    ├── Auth.jsx                 emailRedirectTo /reset-password
    ├── ResetPassword.jsx        recovery flow (PKCE + implicit)
    ├── AlbumOnboarding.jsx
    ├── AlbumSwitcher.jsx        solo render si activeAlbums.length >= 2
    ├── Tracker.jsx              shell. tab change scroll fix. Header dinámico colapsable. TU LINK solo Home.
    ├── PublicProfile.jsx        ruta /u/:slug — brand strip + CTA top + hero compacto + disclosures
    ├── Marketplace.jsx          ListingBanner click-anywhere expande
    ├── Profile.jsx              2 secciones sin numeración
    ├── ChatPanel.jsx            auto-scroll guard activeCpId
    ├── TradeRequestModal.jsx
    ├── CreatePublicListingModal.jsx
    ├── QuickUpdateModal.jsx     bottom sheet mobile
    ├── pages/
    │   ├── DashboardPage.jsx    Donut + CTA + CountryProgressMap
    │   ├── CardsPage.jsx        fTeam multi-select + pills individuales por país
    │   └── TeamsPage.jsx        LEGACY — ya no se monta
    └── ui/
        ├── Avatar.jsx
        ├── StatCard.jsx
        ├── TeamCard.jsx
        ├── TeamDrawer.jsx
        ├── StickerCard.jsx      cycle ×2/×3/×4 + label "Repetida ×N"
        ├── CountryProgressMap.jsx  NUEVO — grid banderas con anillos
        ├── SegmentedProgress.jsx
        ├── ProgressBar.jsx
        ├── BulkUpdateModal.jsx  LEGACY
        ├── ConfBadge.jsx
        ├── Flag.jsx
        └── TypeDonut.jsx        leyenda 2-col
```

---

## Tabs (5)

1. **Home** — TypeDonut con leyenda 2-col + CTA "Registrar Movimiento" + CountryProgressMap (solo Stickers).
2. **Cartas** — search bar + status pills + flag chips collapsible **multi-select**. Cada país filtrado = pill individual con ✕.
3. **Mercado** — sub-tabs Ofertas / Buscar / Favoritos / Trades. ListingBanner click-anywhere expande.
4. **Chat** — Marketplace con `forceSub='messages'` → toggle Mensajes/Buscar. Search abre conversación nueva.
5. **Perfil** — PERFIL (info + contactos + Puntos como sub-bloque) + ÁLBUMES ACTIVOS. 0 numeración.

---

## Multi-duplicates

- Modelo: `data: { id: 'missing'|'have'|'duplicate' }` + `extras: { id: N }`.
- `MAX_EXTRAS = 2` → cap a 3 dups (×2/×3/×4).
- `setQty(id, qty)` helper para fix-mistake (no expuesto en UI actualmente).
- buildShareMessage suma extras → conteo correcto en mensaje WA.

---

## Mensaje WhatsApp (`shareMessage.js`)

Formato:
```
⚽  ÁLBUM PANINI WC 2026

👤  *display_name*
▰▱▱▱▱▱▱▱▱▱▱▱▱▱  6%
✅ 60/980 stickers   🔄 8 repetidas   ❌ 920 faltantes

🔗 *Mi perfil con la lista completa:*
https://wc2026albumtracker.vercel.app/u/<slug>

❌ ME FALTAN  (920)
🇩🇪 *Alemania* (15): 1, 2, 3, 4, 5, 7, 8, 11, 12, 14, 15, 16, 17, 18, 20
🇪🇸 *España* (...): ...
[TODOS los países, TODOS los #stickers, sin truncar]

¿Cambiamos? 🤝
https://wc2026albumtracker.vercel.app
```

---

## Cuenta de testing
- **Diego**: `Diegobuenano0808@gmail.com` / `Diego04`

---

## Cómo correr en local

```bash
cd "/Users/sebastiansequeira/Documents/adrenalyn-tracker 2"
npm run dev       # localhost:5173
npm run build     # 0 errores antes de cualquier commit
git push          # auto-deploy Vercel ~30s
```

---

## Pendientes / ideas registradas

### Manuales en Supabase Dashboard
- [ ] Habilitar Leaked Password Protection (HaveIBeenPwned).
- [ ] Agregar `https://wc2026albumtracker.vercel.app/reset-password` en Redirect URLs.

### UX próximas iteraciones (no bloqueantes)
- Avatar crop tool al subir (hoy se sube tal cual).
- Notificaciones push del navegador (~3 días de trabajo, post-Mundial).
- OG image dinámica por usuario en /u/:slug (Vercel Edge Function que genera PNG).
- Onboarding tour de 3 pasos primera vez.
- Vercel Analytics (gratis, sin cookies) para tracking de signup/marca/mensajes/trades.
- Trade history en perfil ajeno (no solo contador `trades_completed`).

### Bugs conocidos / lecciones
- ⚠️ **SIEMPRE chequear imports de hooks de React** al agregar componentes nuevos.
- Vercel deploy a veces sirve bundle JS nuevo con HTML viejo cacheado durante 30-60s post-push. Hard refresh (Cmd+Shift+R) lo arregla.
- ChatPanel auto-scroll-to-bottom en useEffect sobre `messages.length` debe tener guard `if (!activeCpId) return` o disparará scroll del window en la lista de hilos.

---

## Commits recientes
```
0502b83 fix(banner): TU URL row aún más compacto
c93b7cd fix(banner): TU URL row solo en Home + tamaño mitad
f2c8966 fix(ux): recovery + UX combo (modal mobile, banner, perfil, pills, label)
ac43f9f feat(ux): mapa países + StickerCard premium + Profile 3 secciones + más
bedf363 feat(ux): múltiples duplicadas + perfil simplificado + ajustes UX
8c9d909 feat(stickers): import lista oficial Panini WC 2026 (980 stickers)
8df03b7 chore: update URL → wc2026albumtracker.vercel.app
c24af5b feat: Mercado offers colapsadas + página reset password
99c1570 perf(scale): RLS optim + FK indexes + bundle code-split
d34a20f fix(ux): banner pegado al notch + bannerCard compacto + AlbumSwitcher siempre
```
