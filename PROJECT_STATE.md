# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto antes de tocar nada.
> Última actualización: 2026-05-08 PM (share popovers, trade auto-propose desde link público, contacto + WhatsApp dual-channel, seed colección Manu).

---

## ✅ Cerrado en la última sesión (2026-05-08 PM)

### Share split-buttons (Copiar / WhatsApp)
- Cada botón en la fila TU LINK ahora abre un mini-popover con 2 opciones: **🔗 Solo el link** / **📝 Mensaje completo**.
- Click fuera + Escape cierran. Solo un popover abierto a la vez.
- **Trampa que costó un fix**: `.brandShareRow` tiene `clip-path: polygon(...)` que clipea descendientes invisibles. Solución: popover renderizado vía `createPortal(node, document.body)` con `position: fixed` y coordenadas computadas del `getBoundingClientRect()` del botón ancla. Refs separadas en cada botón + popover; click-fuera chequea las 3 antes de cerrar; `setTimeout(0)` antes de adjuntar el listener de mousedown para no capturar el mismo click que abrió.

### Trade auto-propose desde link público
- `PublicProfile.jsx`: `tradeHref` cambió a `/?openUser=<id>&propose=1`.
- `Tracker.jsx` lee `propose` del query string y lo pasa al `Marketplace` como `initialProposeTrade`.
- `Marketplace.jsx` calcula matches mutuos (sus dups que me faltan + mis dups que les faltan), pre-llena `pickedTheirs`/`pickedMine`, arma `tradeCtx` y abre el `TradeRequestModal` automático.
- Si NO hay matches mutuos → drill-down vacío con flash "seleccioná manualmente".
- Limpieza del query string (`openUser` y `propose`) después del primer read para que un refresh no re-dispare.

### ContactRow component (nuevo `src/components/ui/ContactRow.{jsx,module.css}`)
- Pills WhatsApp / Instagram / Email — render condicional, solo aparecen los campos que existan.
- WhatsApp pre-llena el chat con `tradeDraft` (resumen del trade en draft) o saludo genérico si no hay nada seleccionado.
- Instagram: strip de `@`, link a `instagram.com/<user>`.
- Inyectado en:
  - **PublicProfile**: debajo del hero, sin tradeDraft (saludo genérico).
  - **Marketplace drill-down**: dentro del `detailHead`, con `tradeDraft` armado de `pickedTheirs`/`pickedMine` actuales.

### Dual-channel send (chat interno + WhatsApp simultáneo)
- `TradeRequestModal.jsx`: toggle verde **"También avisar por WhatsApp"** en el footer.
- Default ON cuando `targetProfile.contact.whatsapp` existe; oculto si no.
- En `onSend()`: SIEMPRE crea la trade request (chat interno via `createTradeRequest`). Si el toggle está prendido + hay número, ADEMÁS abre `wa.me/<num>?text=<resumen>` en pestaña nueva con el mensaje pre-cargado (lista compacta de pides/ofreces + meeting point/hora).
- Mensaje WhatsApp armado con `buildTradeWhatsappText({ myName, targetName, theyGiveMe, iGiveThem, meetingPoint, meetingTime })`.

### Helpers nuevos en `src/lib/shareMessage.js`
- `buildShareLinkOnly({ profile, albumLabel })` — mini-mensaje 1-línea con solo el link.
- `buildTradeWhatsappText({...})` — resumen 1:1 agrupado por país.
- `whatsappHrefForNumber(num, text)` — `wa.me/<digits>?text=<encoded>`.
- `cleanPhoneNumber(raw)` — strip a solo dígitos (tolerante con `+`, espacios, paréntesis, guiones).

### Seed colección Manu (manu1704mr@gmail.com)
- 980 stickers en `sticker_collections`: **493 have / 210 duplicate / 277 missing** (50.3% completo).
- FWC interpretado por código numérico: `FWC-N` → `INT-(N+1)` para N=1..8 y `MUS-(N-8)` para N=9..19.
- Spot-check pasó en 11 stickers verificados (escudos, jugadores, plantel, museum).
- Repetidas asumidas con extras=0 (1 dup → 2 copias totales). Si alguna tiene 2+ extras, se ajusta el `extras` jsonb manualmente.

---

## 🔥 Próxima tarea (open issue para nueva sesión)

**Continuar con bugs / mejoras pendientes**. La rama `main` está limpia y deployada en prod. Cualquier reporte nuevo de bug o feature request entra acá.

Ideas en backlog (no bloqueantes):
- Avatar crop tool al subir.
- Notificaciones push del navegador.
- OG image dinámica por usuario en `/u/:slug`.
- Onboarding tour de 3 pasos primera vez.
- Vercel Analytics (gratis).
- Trade history en perfil ajeno (no solo contador).
- Seed random a otra cuenta de testing (patrón documentado abajo).

---

## ✅ Cerrado en sesión previa (2026-05-07/08)

### UX — top de tabs
- **Banner solo en Home** (`tab === 'dashboard'`). Otras tabs liberan todo el espacio.
- **Subnav Mercado**: 3 chips (`Ofertas / Trades / Favoritos` — removed `Buscar`, search dentro de Ofertas cubre).
- **Subnav Chat**: 2 chips (`Mensajes / Buscar`).
- **Cartas**: removed `SELECCIÓN MÚLTIPLE` button → search ocupa toda la fila ancha.
- **Subnav sticky offset**: `top: var(--safe-top)` (antes `48px+safe-area` huérfano del header viejo).
- **Top region Mercado compacta**: `-23px` ahorrados entre subnav y first listing (sectionHead/sectionSub/listingFilters tighter).

### Cartas — collapsibles por equipo
- Tap en el header de cualquier equipo (escudo / nombre / barra / count / chevron) → abre/cierra ese grupo.
- Chevron gold ▼ (abierto) / ▶ (colapsado), rota -90deg con transition 0.2s.
- Default: todos abiertos al arrancar. Estado per-session (no persiste).
- A11y: `role=button`, `tabIndex=0`, Enter/Space, `aria-expanded`.

### Stickers — orden custom 1-48 + FWC al frente
- `STICKER_TEAMS` reordenado en `data/teams.js` según el checklist físico Panini (México #1 → Panamá #48).
- **Museum FWC-9..FWC-19 movido al inicio** (antes era al final). Render order ahora: Intro (9) → Museum (11) → Teams (960). Total 980 ✓.
- IDs estables — la data jsonb existente en Supabase NO requiere migración.

### iOS PWA fix — body safe-area padding (CLAVE)
- **Problema**: en home-screen / standalone, content quedaba pegado al notch aunque `.mainNoHeader` tenía `padding-top: env(safe-area-inset-top)`.
- **Causa**: iOS Safari standalone NO computa `env()` para descendientes hasta que se aplica al body explícitamente.
- **Fix**: `body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }` en `global.css`.
- Combinado con el padding del `.mainNoHeader`, da ~100px de gap consistente en Safari + standalone.
- `viewport-fit=cover` en index.html viewport meta es prerequisito (sin eso `env()` retorna 0).

---

## Patrón: seedear data a otra cuenta (referencia para sesiones futuras)

**Random seed (~75% completo)** — para una cuenta de testing nueva:
1. SQL en Supabase project `xawgomhknzdnhkxcegqi`, tabla `sticker_collections`.
2. Generar los 980 sticker IDs vía CTE: 9 intro (`INT-1..9`) + 11 museum (`MUS-1..11`) + 48 teams × 20 (`<T>-C/-P01..P18/-G`).
3. UPDATE con `random() < 0.75` por sticker → `have` o `missing`.
4. Para repetidas: SELECT 200 random de los `have`, mover a `duplicate` con extras random 0/1/2 (×2/×3/×4).
5. **Trampa importante**: poner `random()` DIRECTO dentro de `jsonb_object_agg(id, expr)` — si lo computás en un CTE materializado intermedio, el planner lo hoist y todas las filas reciben el mismo valor.

**Seed por lista explícita (faltantes + repetidas)** — usado para Manu (2026-05-08):
- Recibir lista del usuario en formato `<TEAM> → <pos>, <pos>, ...` para faltantes y repetidas.
- Mapeo posición → ID:
  - Pos 1 → `<T>-C` (escudo)
  - Pos 2..12 → `<T>-P01..P11` (jugadores 1-11)
  - Pos 13 → `<T>-G` (plantel)
  - Pos 14..20 → `<T>-P12..P18` (jugadores 12-18)
- FWC stickers: `FWC-N` → `INT-(N+1)` para N=1..8; `FWC-N` → `MUS-(N-8)` para N=9..19. Sticker `00` → `INT-1`.
- SQL: dos arrays (missing_set, dup_set) + UNNEST + JOIN contra los 980 keys del jsonb existente. Default `have` para los no listados. Ver commit anterior con email `manu1704mr@gmail.com` para template.

---

## Qué es esto

App **React + Vite + Supabase** para seguimiento personal de dos álbumes:
1. **Adrenalyn XL FIFA World Cup 2026** (633 cartas).
2. **Álbum de Stickers Panini WC 2026** (980 stickers — con **nombres reales** del checklist oficial, **orden custom 1-48 + FWC al frente**).

Cada usuario marca cartas como `missing → have → duplicate (×2/×3/×4)` y participa en un **marketplace social** con chat realtime, listings públicas, trade requests, favoritos, link público de perfil compartible, mensaje WhatsApp formateado con lista completa, avatar real, mapa interactivo de progreso por país, reset password, y groups colapsables en Cartas.

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
| Bundle | Code-split (manualChunks): react-vendor, supabase, motion separados. Init ~248 KB / 74 KB gzip. |

---

## Backend — Supabase (⚠️ NO TOCAR sin intención)

### Supabase compartido con Skolar
- **Project ID**: `xawgomhknzdnhkxcegqi`
- ⚠️ **Compartido con app universitaria Skolar (Pro tier).** Todas las tablas de Adrenalyn tienen prefijo `adrenalyn_` (excepto `sticker_collections` legacy). NUNCA tocar tablas sin ese prefijo.
- **API key**: `VITE_SUPABASE_ANON_KEY` en `.env` (gitignored) y Vercel env vars.

### Tablas (`adrenalyn_*` + `sticker_collections`)

| Tabla | Descripción |
|---|---|
| `adrenalyn_collections` | Adrenalyn XL. `data jsonb` (status missing/have/duplicate por card_id) + `extras jsonb` (counter de dups extra cuando status='duplicate'). |
| `sticker_collections` | Equivalente Panini (legacy sin prefijo). Mismo shape: data + extras. |
| `adrenalyn_profiles` | Identidad pública: `display_name`, `avatar_url`, `contact`, `meeting_points`, `marketplace_visible`, `slug`, `trades_completed`, `active_albums`. |
| `adrenalyn_favorites` | Relación `(user_id, target_id)`. |
| `adrenalyn_messages` | Chat 1:1 con realtime. |
| `adrenalyn_trade_requests` | Solicitudes. Trigger incrementa `trades_completed` cuando completed. |
| `adrenalyn_public_listings` | Ofertas públicas con status active/closed/completed. |
| `adrenalyn_trade_history` | Historial concretados (privado). |

### Auth
- Email + password. Email confirmation desactivada. Reset password en `/reset-password`.
- **Pendiente manual**: agregar `https://wc2026albumtracker.vercel.app/reset-password` en Auth → URL Configuration → Redirect URLs.

---

## Patrones load-bearing (no romper)

### Tracker.jsx
1. **`upsert` siempre con `{ onConflict: 'user_id' }`**.
2. **`.maybeSingle()` en load**.
3. **Save coalescing con `saveRef`** — last-write-wins. Save acepta `(newCol, newExtras)`.
4. **`MAX_EXTRAS = 2`** — cycle ×2/×3/×4 → missing.
5. **`fTeam` es array** (`string[]`).

### `data/stickers.js` + `data/teams.js`
- 48 equipos REALES en `STICKER_TEAMS` con orden custom 1-48 (México, Sudáfrica, Corea del Sur, Chequia, Canadá, ...).
- Build order: Intro (9) → **Museum (11) ← MOVIDO AL FRENTE** → Teams (48 × 20 = 960). Total 980.
- IDs estables: `INT-1..9`, `MUS-1..11`, `<team>-C/-P01..P18/-G`. **NUNCA renombrar**.

### `components/pages/CardsPage.jsx`
- Cards agrupadas por equipo. Headers son **clickables** (state `collapsed: Set<teamId>`) — chevron rota -90 al colapsar.
- `.filterBar` solo tiene search (botón SELECCIÓN MÚLTIPLE removido).

### `components/Marketplace.jsx`
- Mercado: 3 sub-tabs `Ofertas / Trades / Favoritos`. `Buscar` removed (sub `'search'` sigue válido programáticamente para flujo "crear trade desde carta").
- Chat: forceSub='messages' → 2 sub-tabs `Mensajes / Buscar`.

### CSS — safe-area handling (CLAVE)
- `body` (en `global.css`) tiene `padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)`. **Sin esto, iOS standalone no computa env() en descendientes**.
- `--safe-top` en `tokens.css` = `env(safe-area-inset-top, 0px)`.
- `.mainNoHeader` (Tracker.module.css) usa `padding-top: var(--safe-top)`. Combinado con body padding da ~100px gap.
- `.subnav` (Marketplace.module.css) sticky `top: var(--safe-top)`.
- `viewport-fit=cover` en index.html viewport meta es prerequisito.

### Popovers/dropdowns — portal a body si el padre tiene clip-path (CLAVE)
- `.brandShareRow` tiene `clip-path: polygon(...)` para el corte diagonal. Cualquier descendiente que sale del bounding box (popover absoluto debajo del row, etc.) queda **clipeado e invisible**.
- Patrón: refs separadas en cada botón ancla + ref en el popover; popover renderizado vía `createPortal(node, document.body)` con `position: fixed; top/right` calculados del `getBoundingClientRect()` del botón.
- Click-fuera: chequea las 3 refs (botón1, botón2, popover) antes de cerrar.
- `setTimeout(0)` antes de `addEventListener('mousedown', ...)` para no capturar el mismo click que abrió el popover.
- Aplicado en `Tracker.jsx` (TU LINK row, share popovers Copiar/WhatsApp).

### Trade flow — auto-propose desde link público
- Query string `?openUser=<id>&propose=1` desde `PublicProfile.jsx` (botón "Hacer trade").
- `Tracker.jsx` parsea ambos y los pasa a `<Marketplace initialOpenUserId={...} initialProposeTrade={...}/>`.
- Marketplace dispara `onSelectUser(id)` → cuando carga `selCol`/`selProfile`, calcula matches mutuos (`selCol[id]==='duplicate' && myCol[id]||'missing'==='missing'` para wanted; espejo para offered) → arma `tradeCtx` y `setShowTrade(true)`.
- Si arrays vacíos → flash "seleccioná manualmente" y queda el drill-down disponible.

### Contact + dual-channel send
- `ContactRow` (`src/components/ui/ContactRow.jsx`) lee `profile.contact.{whatsapp,instagram,email}` y solo renderiza pills para los campos que existan. Acepta `tradeDraft` opcional para pre-llenar el chat de WhatsApp.
- `TradeRequestModal` toggle "También avisar por WhatsApp" — default ON cuando hay número. `onSend()` siempre crea trade request (chat); si toggle ON, además `window.open(wa.me/<num>?text=<resumen>)`. El chat NUNCA falla por no abrirse WhatsApp (popup blocker, etc.) — ya quedó en DB.

---

## Cuentas de testing
- **Diego**: `Diegobuenano0808@gmail.com` / `Diego04`.
- **Sebastian (owner)**: `sebastiansequeirab@gmail.com` — 74.29% (528 have / 200 dup / 252 miss).
- **Manu**: `manu1704mr@gmail.com` (user_id `9e83b82e-6df2-4a91-80d5-aaf008f4921d`) — 50.3% (493 have / 210 dup / 277 miss). Seedeado el 2026-05-08 desde lista explícita de faltantes + repetidas.

---

## Cómo correr en local

```bash
cd "/Users/sebastiansequeira/Documents/adrenalyn-tracker 2"
npm run dev       # localhost:5173
npm run build     # 0 errores antes de cualquier commit
git push          # auto-deploy Vercel ~30s
```

---

## Pendientes / ideas

### Manuales en Supabase Dashboard
- [ ] Habilitar Leaked Password Protection (HaveIBeenPwned).
- [ ] Agregar `https://wc2026albumtracker.vercel.app/reset-password` en Redirect URLs.

### UX próximas iteraciones (no bloqueantes)
- Avatar crop tool al subir.
- Notificaciones push del navegador.
- OG image dinámica por usuario en /u/:slug.
- Onboarding tour de 3 pasos primera vez.
- Vercel Analytics (gratis).
- Trade history en perfil ajeno (no solo contador).

### Lecciones acumuladas
- ⚠️ **Body safe-area padding es load-bearing en iOS PWA**. Sin `body { padding-top: env(...) }`, el env() retorna 0 para descendientes en standalone aunque la meta tag `viewport-fit=cover` esté en place.
- ⚠️ **Vercel free tier deploy cap es 100/día**. NO correr `vercel --prod --yes` manual salvo evidencia clara de webhook caído — duplica el conteo (webhook + CLI).
- ⚠️ **Postgres `random()` se hoist** cuando se usa en CTE intermedio + `jsonb_object_agg`. Ponerlo DIRECTO dentro del agregado: `jsonb_object_agg(id, floor(random() * 3)::int)`.
- ⚠️ **`clip-path` (o `overflow: hidden`) en padre clipea descendientes invisibles**. Si un popover/dropdown sale del bounding box, portalealo a `document.body` con `position: fixed` desde el inicio. Refactor después es feo.

---

## Commits recientes
```
35843c9 fix(share): portal share popover a body — clip-path del brandShareRow lo cortaba
45d16be feat(share+trade): popover link/full, auto-propose desde link público, contacto + WhatsApp dual-channel
9f04eea docs: PROJECT_STATE.md handoff sesión 2026-05-08 + gitignore mockups
f133a8c fix(layout): aplicar safe-area padding al body (recetas iOS PWA)
1297607 fix(layout): remover mancha negra en standalone — vuelta a lo mínimo
ce5176a fix(layout): JS detection + barra opaca para standalone (definitivo)
7114775 fix(layout): variable --safe-top centralizada para browser + standalone
45140db fix(layout): unificar top padding entre browser y standalone
e97319a ux(mercado): tighten top region (-23px entre subnav y listings)
d1beade fix(mercado/chat): subnav sticky flush al notch (sin gap de 48px)
```
