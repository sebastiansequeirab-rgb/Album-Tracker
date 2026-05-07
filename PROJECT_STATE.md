# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto antes de tocar nada.
> Última actualización: 2026-05-08 (orden custom 48 equipos + FWC museum al frente + collapsibles Cartas + body safe-area fix).

---

## ✅ Cerrado en la última sesión (2026-05-07/08)

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

## 🔥 Próxima tarea (open issue para nueva sesión)

**Seedear data random a otra cuenta de testing**. Quiero darle a otro usuario (otro email) un set inicial de stickers similar al que tengo yo (~75% completado, con repetidas mixtas).

**Cómo lo hicimos para `sebastiansequeirab@gmail.com`** (ejemplo de referencia):
1. SQL en Supabase project `xawgomhknzdnhkxcegqi`, tabla `sticker_collections`.
2. Generar los 980 sticker IDs vía CTE: 9 intro (`INT-1..9`) + 11 museum (`MUS-1..11`) + 48 teams × 20 (`<T>-C/-P01..P18/-G`).
3. UPDATE con `random() < 0.75` por sticker → `have` o `missing`.
4. Para repetidas: SELECT 200 random de los `have`, mover a `duplicate` con extras random 0/1/2 (×2/×3/×4).
5. **Trampa importante**: poner `random()` DIRECTO dentro de `jsonb_object_agg(id, expr)` — si lo computás en un CTE materializado intermedio, el planner lo hoist y todas las filas reciben el mismo valor.

**Para la nueva sesión**: el user te va a dar un email destino. Buscás `user_id` en `auth.users WHERE email = '<x>'`, y corres el mismo SQL ajustando el `user_id`.

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

---

## Cuenta de testing
- **Diego**: `Diegobuenano0808@gmail.com` / `Diego04`
- **Sebastian (owner)**: `sebastiansequeirab@gmail.com` — actualmente en 74.29% completado con 200 repetidas random distribuidas (528 have / 200 dup / 252 miss / 70×2 + 67×3 + 63×4).

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

### Lecciones de la última sesión
- ⚠️ **Body safe-area padding es load-bearing en iOS PWA**. Sin `body { padding-top: env(...) }`, el env() retorna 0 para descendientes en standalone aunque la meta tag `viewport-fit=cover` esté en place.
- ⚠️ **Vercel free tier deploy cap es 100/día**. NO correr `vercel --prod --yes` manual salvo evidencia clara de webhook caído — duplica el conteo (webhook + CLI).
- ⚠️ **Postgres `random()` se hoist** cuando se usa en CTE intermedio + `jsonb_object_agg`. Ponerlo DIRECTO dentro del agregado: `jsonb_object_agg(id, floor(random() * 3)::int)`.

---

## Commits recientes (sesión 2026-05-08)
```
f133a8c fix(layout): aplicar safe-area padding al body (recetas iOS PWA)
1297607 fix(layout): remover mancha negra en standalone — vuelta a lo mínimo
ce5176a fix(layout): JS detection + barra opaca para standalone (definitivo)
7114775 fix(layout): variable --safe-top centralizada para browser + standalone
45140db fix(layout): unificar top padding entre browser y standalone
e97319a ux(mercado): tighten top region (-23px entre subnav y listings)
d1beade fix(mercado/chat): subnav sticky flush al notch (sin gap de 48px)
419e310 feat(ux): tabs flush con safe-area + cleanup top de Cartas/Mercado
6107ca8 feat(stickers): reorder teams 1-48 (custom album) + FWC museum al frente
66f3a31 feat(cards): collapsible team groups + fix standalone bookmark padding
```
