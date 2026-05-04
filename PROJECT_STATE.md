# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto, valida el backend, y pasá a refinar el UI.
> Última actualización: 2026-05-04 (sesión de Marketplace v2 + chat realtime + login bg pulido).

---

## Qué es esto

App **React + Vite + Supabase** para hacer seguimiento personal de:
1. **Adrenalyn XL FIFA World Cup 2026** (633 cartas)
2. **Álbum de Stickers Panini** (980 stickers, placeholders rellenables — no se reproduce el checklist oficial Panini por copyright)

Cada usuario tiene su colección privada por álbum, marca cartas como `missing → have → duplicate`, y participa en un **marketplace social** con favoritos, chat realtime, listings públicas y trade requests con punto de encuentro.

- **Producción**: https://album-tracker-three.vercel.app — ✅ funcional
- **Repo**: https://github.com/sebastiansequeirab-rgb/Album-Tracker (rama `main`, auto-deploy a Vercel)
- **Owner**: Sebastian Sequeira (`sebastiansequeirab@gmail.com`)
- **Working dir real**: `/Users/sebastiansequeira/Library/Mobile Documents/com~apple~CloudDocs/adrenalyn-tracker/` (iCloud Drive — el `~/Downloads/adrenalyn-tracker/` está vacío)

---

## Backend — Supabase (NO TOCAR sin intención)

### Project compartido con Skolar
- **Project ID**: `xawgomhknzdnhkxcegqi` (nombre interno "Skolar")
- ⚠️ **Compartido con app universidad Skolar.** Aislamos por tabla con prefijo `adrenalyn_*`. **NUNCA** tocar tablas que no sean nuestras. NUNCA cambiar Site URL ni Auth providers (rompería Skolar).
- **API key activa**: publishable `sb_publishable_uiJKOVJ79-Yjs-ne_El6OQ_Qfx6Nmq7` (en Vercel env y `.env` local)
- Legacy JWT anon key: deshabilitada en dashboard, no usar.

### Tablas (todas prefijo `adrenalyn_`)

#### Datos del usuario
- **`adrenalyn_collections`** — colección Adrenalyn XL por usuario. `data jsonb { card_id: 'missing'|'have'|'duplicate' }`. UNIQUE en `user_id`.
- **`sticker_collections`** — equivalente para el álbum Panini.
- **`adrenalyn_profiles`** — identidad pública: `display_name, avatar_emoji, contact jsonb, marketplace_visible bool, meeting_points jsonb (array de {id,name,type,hint}), active_albums text[]`.

#### Marketplace v2 (shipped 2026-05-04)
- **`adrenalyn_favorites`** — relación unilateral (sin solicitudes mutuas). `(user_id, target_id)` UNIQUE.
- **`adrenalyn_messages`** — chat 1:1 con `sender_id, recipient_id, content, read_at`. Agregada a `publication supabase_realtime` para INSERT events.
- **`adrenalyn_trade_requests`** — solicitudes estructuradas con `offered_ids text[], wanted_ids text[], meeting_point text, meeting_time_exact timestamptz, meeting_time_label text, message text, status` (pending/accepted/declined/completed/cancelled).
- **`adrenalyn_public_listings`** — ofertas públicas tipo classified con `offered_ids, wanted_ids, note, meeting_point, meeting_time_label, status` (active/closed/expired).

#### Eliminada
- **~~`adrenalyn_friendships`~~** — DROPPED en migración `adrenalyn_marketplace_v2` (reemplazada por `adrenalyn_favorites` unilaterales). Diego no perdió nada.

### RLS — patrones load-bearing
Toda tabla tiene RLS habilitada. Resumen crítico:
- **`adrenalyn_collections.SELECT`** → `auth.uid() = user_id` **OR** `EXISTS (perfil del owner con marketplace_visible=true)`. ⚠️ El OR es load-bearing: permite que el matching del marketplace lea otras colecciones. Si lo simplifican, se rompe el matching.
- **`adrenalyn_profiles.SELECT`** → dueño siempre, otros si `marketplace_visible=true AND auth.uid() IS NOT NULL`.
- **`adrenalyn_messages.SELECT`** → `auth.uid() IN (sender_id, recipient_id)`.
- **`adrenalyn_messages.INSERT`** → `auth.uid() = sender_id`.
- **`adrenalyn_trade_requests`** → SELECT/UPDATE si in `(initiator_id, target_id)`, INSERT solo si `auth.uid() = initiator_id`.
- **`adrenalyn_public_listings.SELECT`** → dueño siempre, otros si `status='active' AND owner.marketplace_visible=true`.
- **`adrenalyn_favorites`** → todo restricto a `auth.uid() = user_id`.

Triggers `updated_at` via `public.adrenalyn_set_updated_at`.

### Realtime
`adrenalyn_messages` está en publication `supabase_realtime`. Subscripción cliente vía `supabase.channel('adrenalyn_inbox:{myId}').on('postgres_changes', { event: 'INSERT', filter: 'recipient_id=eq.{myId}' })`. RLS automáticamente filtra los eventos al recipient.

### Auth
- Email + password. **Email confirmation desactivada** (intencional, porque Site URL apunta a Skolar — sin desactivar, los emails llevarían al sitio equivocado).
- Sin OAuth.
- Si en el futuro se reactiva, **pasar `options.emailRedirectTo: 'https://album-tracker-three.vercel.app'`** en `signUp` / `resetPasswordForEmail`. NO cambiar Site URL global.

### Vercel
- Project: `album-tracker` (id `prj_MPiYqMpHPzapXwn3DicNJHDmdTOP`, team `team_jPRKnq7vvDLT8pfNiF4GkQ9F`)
- Env vars production: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable, no JWT)
- Auto-deploy en push a `main` (~30s a READY)

---

## Patrones de código que NO se pueden tocar

### `Tracker.jsx` — load/save load-bearing
1. **`upsert(...)` SIEMPRE con `{ onConflict: 'user_id' }`**. Sin esto, Supabase trata cada upsert como INSERT y devuelve 409.
2. **`load()` usa `.maybeSingle()` NO `.single()`**. Distingue "no hay fila" de "error real".
3. **Save coalescing con `saveRef` (useRef)** — si llega nuevo save mientras hay uno en vuelo, el nuevo queda pending. Garantiza last-write-wins sin races.
4. **Retry con backoff exponencial** en errores de save (1s → 2s → 4s → 8s).
5. **`handleAuthError()`** detecta 401 / JWT expirado / "Legacy API keys disabled" → `refreshSession()`, si falla → `signOut()`. Evita loops infinitos.
6. **Unread badge subscription** — useEffect independiente del album type que escucha `subscribeToInbox` para refrescar count global del navBtn de Marketplace.

### `App.jsx`
- En boot, después de `getSession()` valida con `getUser()` contra el server. Si falla → `signOut()` automático. Purga sesiones corruptas.

### `data/`
- `buildInitialState()` devuelve TODAS las cartas como `'missing'`. Cuentas nuevas arrancan vacías.
- `ALBUM_CONFIG[albumType]` exporta `{ table, buildInitial, buildItems, teams, mainCount, extraCount, label, ... }` — todo el Tracker es album-agnostic vía esta config.

### `lib/marketplace.js`
- `loadCollectionsByUserIds(ids)` lee colecciones de **otros** usuarios. Funciona porque del OR en SELECT policy. Si alguien quita su `marketplace_visible`, automáticamente desaparece (no caché stale).
- `ensureMyProfile(userId, fallbackEmail)` se llama desde `Tracker.jsx` en el load. Idempotente.
- `subscribeToInbox(myId, callback)` retorna unsub function. **Siempre wrap el callback en try/catch** — un throw rompe el render del componente que lo monta.
- `loadThreadMessages(myId, otherId)` usa `.in('sender_id', [myId, otherId]).in('recipient_id', [myId, otherId])` — más simple que `.or(and(...))` y RLS sigue filtrando.

### Modales globales (z-index)
- `TradeRequestModal` y `CreatePublicListingModal` viven en el **render principal de `Marketplace.jsx`**, NO dentro del drill-down branch. Si se montan dentro del drill-down y el flow termina con `setSelUserId(null)`, el modal se desmonta a la mitad de su `onSend` y rompe el flow ("no pasa nada" symptom).
- Z-index modales: `1100` (header sticky es `100`, bottom nav mobile es `100`, fab es `90`).
- ChatPanel `.threadView` y `.listView`: `position: relative; z-index: 10` para garantizar visibilidad.

### `ChatPanel.jsx` — defensive
- Realtime callback envuelto en try/catch. Validar `if (!newMsg?.sender_id) return`.
- List view header **siempre visible** (incluso loading/error/empty) → garantiza que nunca quede pantalla negra.
- `listError` state + UI con botón "Reintentar" si `loadMyThreads` falla.
- `useLayoutEffect` con `rootRef` hace `scrollIntoView({ block:'start', behavior:'auto' })` cuando cambia `activeCpId` — sin esto, después de `openChatWith` el viewport mobile queda donde estaba el drill-down.

---

## Frontend — Estructura

```
src/
├── App.jsx                        auth gate (Auth o Tracker según session)
├── main.jsx                       entry
├── supabaseClient.js
├── data/                          ALBUM_CONFIG, builders, TEAMS_LIST por álbum
├── styles/
│   ├── tokens.css                 CSS variables (paleta dark, accent yellow)
│   └── global.css                 reset, scrollbar, fuentes (Bebas Neue + DM Sans)
├── lib/
│   ├── album.js                   loadAlbum, loadAlbumByUserIds, activate/deactivate
│   └── marketplace.js             profiles, favoritos, messages, trades, listings, matching
└── components/
    ├── Auth.jsx + Auth.module.css
    ├── AlbumOnboarding.jsx + .module.css
    ├── AlbumSwitcher.jsx + .module.css
    ├── Flag.jsx                   SVG real desde flagcdn.com (libre uso CC0)
    ├── Tracker.jsx + .module.css  app principal, 5 tabs, ~700+ líneas
    ├── Marketplace.jsx + .module.css   sub-tabs, drill-down, banners de listings
    ├── Profile.jsx + .module.css       identidad + contactos + meeting points
    ├── TradeRequestModal.jsx + .module.css       editor con picker 2 tabs
    ├── CreatePublicListingModal.jsx + .module.css
    └── ChatPanel.jsx + .module.css     lista hilos + vista hilo + realtime
```

### Stack visual actual (será reemplazado por Visual Rebuild Spec v2)
- **CSS variables (`tokens.css`) + CSS Modules por componente**. Cero deps.
- **Fuentes**: Bebas Neue (display) + DM Sans (body), importadas en `global.css`.
- **Tema**: dark; fondo `#06080F`, cards `#0F172A`, accent amarillo `#FCD34D`/`#F59E0B`.
- **Mobile responsive**: media queries (768px, 480px, 360px). Bottom nav fija, modales bottom-sheet, FAB circular.

### Tabs implementados (5)
1. **Dashboard** — stats globales, Momentum tracker, progreso por tipo, equipos faltantes.
2. **Equipos** — grid de selecciones con barras de progreso; drill-down por jugador.
3. **Cartas** — catálogo navegable con filtros (status / tipo / equipo / búsqueda).
4. **Marketplace** — 5 sub-tabs:
   - **Todos**: feed de **ofertas activas como banners desglosados** (no cards click-to-expand). Cada banner full-info: avatar autor, OFRECE (lista completa), BUSCA (lista completa), 📍 punto, ⏰ hora, 💬 nota, 3 botones (💬 Iniciar chat / 🤝 Contra oferta / ✅ Aceptar oferta).
   - **Favoritos**: cards de coleccionistas marcados con ⭐.
   - **Mensajes**: ChatPanel realtime con lista de hilos y vista de hilo activo.
   - **Bandeja**: trade requests Recibidas/Enviadas/Historial.
   - **Mi lista**: mis duplicados agrupados por categoría/equipo, botón Copiar lista.
5. **Perfil** — display_name, avatar emoji selector, contactos (Instagram/WhatsApp/email), toggle "Visible en Marketplace", **puntos de encuentro habituales**, mis álbumes activos.

### Login (Auth.jsx)
- BG image custom: `public/login-bg.jpg` (281 KB JPG optimizado del asset del usuario "DFF4AB03"). Tiene packs WC2026 + Adrenalyn baked-in en los lados, features bar baked-in abajo. NO se renderiza features bar en HTML (se duplicaba antes).
- Card central con: hero "WORLD CUP 2026" + divider + "Collection Tracker" + "Bienvenido, **coleccionista**" (última en accent).
- Recordarme + ¿Olvidaste? misma fila (space-between).
- Vignette radial al área central. Mobile padding clamp() para no chocar con la features bar baked-in.

---

## Marketplace v2 — flows clave

### Crear oferta
1. Tab Todos → "+ Nueva oferta" (CreatePublicListingModal)
2. Tabs OFREZCO (mis dups) / BUSCO (mis missing) con checkboxes
3. Punto de encuentro (dropdown con mis meeting_points + "Otro" libre)
4. Hora (texto libre)
5. Nota opcional
6. Publicar → `createPublicListing()` → flash + cierre modal

### Iniciar chat (desde banner)
- `openChatWith(authorId)` → setea `chatCpId`, `sub='messages'`, exit drill-down, `window.scrollTo(0,0)` + rAF
- ChatPanel mounted con `key={chat-${chatCpId}}` (force remount limpio)
- Tab Mensajes muestra ese hilo; system messages tienen border-style: dashed (estilo `bubbleSystem`)

### Contra oferta (desde banner)
1. `openTradeModalFromListing(listing)` async → carga `targetCol = await loadAlbum(...)` si no está cacheado
2. Setea `tradeCtx = { targetProfile, targetCol, offered, wanted, meetingPoint, meetingTime }`
3. TradeRequestModal hoisted abre con picker:
   - 2 tabs internos OFREZCO / PIDO
   - Listas filtrables por "Solo matches", sorted con matches arriba
   - PIDO muestra TODAS las dups del autor (no solo las del listing)
4. Llenar meeting/hora/mensaje → "Enviar solicitud"
5. `createTradeRequest()` → flash + sendMessage system msg → openChatWith target

### Aceptar oferta (auto)
- `acceptListing(listing)` directo, sin modal
- Crea trade con `offered_ids = listing.wanted_ids, wanted_ids = listing.offered_ids, meeting_point/time del listing`
- System msg "✅ Acepté tu oferta pública…"
- Abre chat con autor

### Bandeja
- Recibidas (target=me, pending) → Aceptar/Rechazar
- Enviadas (initiator=me, pending) → Cancelar
- Historial (status != pending) → readonly, últimas 12

---

## Validación de backend (smoke test)

```sql
-- Tablas existen con RLS
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'adrenalyn_%';
-- Esperar: collections, profiles, favorites, messages, trade_requests, public_listings + sticker_collections

-- Realtime
SELECT pubname, tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename LIKE 'adrenalyn_%';
-- Esperar: adrenalyn_messages

-- Policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'adrenalyn_%' ORDER BY tablename;

-- Advisors
mcp__claude_ai_Supabase__get_advisors type=security
-- Warnings conocidos (no bloqueantes): function_search_path_mutable en adrenalyn_set_updated_at + Skolar items.
```

---

## Pendientes

### Visual Rebuild (siguiente fase grande)
Ver `VISUAL_REBUILD_SPEC_v2.md` (en `~/Downloads/adrenalyn-tracker/`). Reconstrucción visual completa de las 8 páginas con design system nuevo (paleta luxury dark + gold), Bebas Neue + DM Sans, Framer Motion en todas las transiciones. Cambio principal del Dashboard: panel "Confederaciones" → "**Próximos a Completar**" (top N países por ratio tengo/total).

**Lo que NO cambia con el rebuild**: backend, RLS, datos, banderas emoji (preservadas), lógica de negocio, schema. Solo CSS/componentes/layouts/animaciones/tipografía.

### Housekeeping menor (no urgente)
- Rotar `service_role` secret (estuvo brevemente en Vercel ~5 min durante debugging del 2026-05-01)
- Agregar `VITE_SUPABASE_ANON_KEY` a Vercel **Preview** env si se quiere usar branch deploys
- Funciones `adrenalyn.set_updated_at` + `public.adrenalyn_set_updated_at` con search_path mutable (warning advisor menor)

### Marketplace v2.x ideas (registradas, no implementadas)
- Tracking de trades cerrados (cuando confirman intercambio)
- Botón "reportar usuario" + campo `reported_count`
- Friends-only listings (visibilidad restringida a favoritos)
- Notificaciones push del navegador

---

## Cómo correr en local

```bash
cd "/Users/sebastiansequeira/Library/Mobile Documents/com~apple~CloudDocs/adrenalyn-tracker"
npm install              # primera vez
npm run dev              # localhost:5180 (5173 lo usa zonau-dashboard)
npm run build            # 0 errores requerido antes de cualquier commit
git push origin main     # auto-deploy a Vercel (~30s)
```

`.env` ya está poblado y gitignored. No commitear.

---

## Cómo deployear

Auto-deploy en push a `main`. URL prod: alias permanente `album-tracker-three.vercel.app`. Cada deploy también genera URL único `album-tracker-<hash>...vercel.app` (NO público — usar siempre el alias).

Manual: `vercel deploy --prod --yes` desde la carpeta del proyecto (necesita `vercel link` previo).

---

## Diego (cuenta de testing)

- Email: `Diegobuenano0808@gmail.com`
- Pass: `Diego04`
- Adrenalyn: 74 missing seedeados
- Útil para testear marketplace con dos sesiones (Sebastian + Diego)
