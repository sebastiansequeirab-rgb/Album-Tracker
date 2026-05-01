# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto, valida el backend, y pasa a refinar el UI.
> Última actualización: 2026-05-01 (sesión de UI redesign + marketplace).

---

## Qué es esto

App React + Vite + Supabase para hacer seguimiento personal del álbum Panini Adrenalyn XL FIFA World Cup 2026. Cada usuario tiene su colección privada (633 cartas) y la mantiene actualizada marcando cartas como missing → have → duplicate.

- **Producción**: https://album-tracker-three.vercel.app — ✅ funcional
- **Repo**: https://github.com/sebastiansequeirab-rgb/Album-Tracker (rama `main`, auto-deploy a Vercel en cada push)
- **Owner**: Sebastian Sequeira (`sebastiansequeirab@gmail.com`)

---

## Backend — NO TOCAR sin intención

### Supabase

- **Project ID**: `xawgomhknzdnhkxcegqi` (nombre "Skolar")
- **⚠️ Compartido con otra app**: este mismo proyecto Supabase hospeda Skolar (universidad). Aislamos por tabla. **NUNCA** tocar tablas que no sean `adrenalyn_collections`. NUNCA cambiar Site URL ni Auth providers (rompería Skolar).
- **API key activa**: publishable `sb_publishable_uiJKOVJ79-Yjs-ne_El6OQ_Qfx6Nmq7` (en Vercel env y `.env` local). Funciona perfectamente para REST + Auth.
- **Legacy JWT anon key**: deshabilitada en dashboard. No usar.

### Tablas de la app (todas prefijo `adrenalyn_`)

#### `public.adrenalyn_collections` — colecciones por usuario
```
id          uuid PK (gen_random_uuid)
user_id     uuid UNIQUE FK auth.users(id)
data        jsonb default '{}'
created_at  timestamptz default now()
updated_at  timestamptz default now()
```
- 1 fila por usuario (UNIQUE en `user_id`)
- `data` = `{ "<card_id>": "missing"|"have"|"duplicate", ... }`

#### `public.adrenalyn_profiles` — identidad pública del marketplace
```
user_id              uuid PK FK auth.users(id)
display_name         text (1..40 chars)
avatar_emoji         text (default ⚽)
contact              jsonb { instagram?, whatsapp?, email? }
marketplace_visible  boolean default false
created_at, updated_at timestamptz
```
- 1 fila por usuario, creada por `ensureMyProfile()` en el boot.
- Usuario opta in al marketplace activando `marketplace_visible`.

#### `public.adrenalyn_friendships` — solicitudes y amigos
```
id            uuid PK
requester_id  uuid FK auth.users(id)
receiver_id   uuid FK auth.users(id)
status        text check ('pending'|'accepted'|'blocked')
created_at, updated_at timestamptz
unique (requester_id, receiver_id)
check (requester_id <> receiver_id)
```

### RLS — confirmar siempre antes de cambios

Todas las tablas tienen RLS habilitada. Resumen:

- **`adrenalyn_collections`**:
  - `adrenalyn_select`: `auth.uid() = user_id` **OR** `EXISTS (perfil del owner con marketplace_visible=true)`. Esto permite que el marketplace lea otras colecciones para calcular matches.
  - `adrenalyn_insert/update/delete`: solo el dueño.
- **`adrenalyn_profiles`**:
  - SELECT: dueño siempre, otros si `marketplace_visible=true AND auth.uid() IS NOT NULL`.
  - INSERT/UPDATE/DELETE: solo el dueño.
- **`adrenalyn_friendships`**:
  - SELECT/UPDATE/DELETE: si `auth.uid() IN (requester_id, receiver_id)`.
  - INSERT: solo si `auth.uid() = requester_id`.

Verificar con:
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'adrenalyn_%'
ORDER BY tablename, policyname;
```

### Auth

- Email + password. **Email confirmation desactivada** (intencionalmente, porque Site URL apunta a Skolar — sin desactivar, los emails llevarían al sitio equivocado).
- Sin OAuth (Google/GitHub/etc) — pospuesto por decisión del usuario.
- Si en el futuro se reactiva email confirmation o se agrega password reset, **pasar `options.emailRedirectTo: 'https://album-tracker-three.vercel.app'`** en `signUp` / `resetPasswordForEmail`. NO cambiar el Site URL global.

### Vercel

- Project: `album-tracker` (id `prj_MPiYqMpHPzapXwn3DicNJHDmdTOP`, team `team_jPRKnq7vvDLT8pfNiF4GkQ9F`)
- Env vars en production:
  - `VITE_SUPABASE_URL=https://xawgomhknzdnhkxcegqi.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=sb_publishable_uiJKOVJ79-Yjs-ne_El6OQ_Qfx6Nmq7`
- Preview env: solo tiene `VITE_SUPABASE_URL`. Falta agregar la anon key si se quiere usar branch deploys (no urgente).

---

## Patrones de código que NO se pueden tocar a la ligera

Estos arreglos costaron debugging real. Si se "limpian" sin entender el por qué, se rompe la app.

### En [src/components/Tracker.jsx](src/components/Tracker.jsx)

1. **`upsert(...)` SIEMPRE con `{ onConflict: 'user_id' }`**.
   Sin esto, Supabase trata cada upsert como INSERT nuevo (porque el conflict resolution default es por PK `id`, y no pasamos `id`). Como `user_id` tiene UNIQUE, se devuelve 409 Conflict y NO se guarda nada. Bug del save.

2. **`load()` usa `.maybeSingle()` NO `.single()`**.
   `.single()` devuelve error cuando no hay fila — y el código viejo trataba ese error como "primer login" y sobreescribía datos en errores de red. `.maybeSingle()` distingue "no hay fila" de "error real".

3. **Save coalescing con `saveRef` (useRef)**.
   Si se dispara un nuevo `save()` mientras hay uno en vuelo, el nuevo se guarda como `pending` y se ejecuta cuando termina el actual. Garantiza que el último estado siempre gana, sin races. NO simplificar a un upsert directo por cada tap.

4. **Retry con backoff exponencial en errores de save**.
   1s → 2s → 4s → 8s. La UI muestra "⚠️ Error" hasta que se concrete el guardado.

5. **`handleAuthError()`** detecta 401 / JWT expirado / "Legacy API keys are disabled" → intenta `refreshSession()`, y si falla → `signOut()`. Esto evita el loop infinito de retries cuando el token caduca.

### En [src/App.jsx](src/App.jsx)

- En el `useEffect` de boot, después de `getSession()` validamos con `getUser()` contra el server. Si falla → `signOut()` automático. Esto purga sesiones corruptas al cargar la página, sin que el usuario tenga que limpiar manualmente.

### En [src/data.js](src/data.js)

- `buildInitialState()` devuelve TODAS las cartas como `'missing'`. Cuentas nuevas arrancan vacías. La constante `INITIAL_MISSING` ya no se usa en runtime (era el preset personal del owner; quedó como referencia muerta — se puede borrar si limpian).

### En [src/lib/marketplace.js](src/lib/marketplace.js)

- `sendFriendRequest(currentUserId, receiverId)` debe pasar `requester_id` explícito (no se autocompleta). La RLS valida `auth.uid() = requester_id` en el `with_check`.
- `loadCollectionsByUserIds(ids)` lee colecciones de **otros** usuarios. Funciona porque la SELECT policy de `adrenalyn_collections` tiene OR con `EXISTS (perfil con marketplace_visible=true)`. Si alguien quita su `marketplace_visible`, automáticamente desaparece de los cálculos de match (no hay caché stale).
- `ensureMyProfile(userId, fallbackEmail)` se llama desde Tracker.jsx en el load (no en App.jsx) — Tracker solo monta cuando hay sesión, así que es equivalente y mantiene el boot de App liviano.

---

## Frontend

### Estructura

```
src/
├── App.jsx                    auth gate (Auth o Tracker según session)
├── main.jsx                   entry — importa tokens.css + global.css
├── supabaseClient.js          createClient con env vars
├── data.js                    633 cartas hardcoded, TEAMS_LIST, TM/CC/ST maps, helpers
├── styles/
│   ├── tokens.css             CSS variables (colores, spacing, radii, fuentes, etc.)
│   └── global.css             reset, scrollbar, @keyframes globales
├── lib/
│   └── marketplace.js         helpers de Supabase para profiles/friendships/matching
└── components/
    ├── Auth.jsx + Auth.module.css
    ├── Tracker.jsx + Tracker.module.css   (~700 líneas, app principal, 5 tabs)
    ├── Marketplace.jsx + Marketplace.module.css  (sub-tabs Todos/Amigos/Mi lista/Solicitudes)
    └── Profile.jsx + Profile.module.css   (display_name, avatar emoji, contactos, toggle visible)
```

### Stack visual

- **CSS variables (`tokens.css`) + CSS Modules por componente**. Cero deps, scoped automático, nativo en Vite.
- Para cambiar la paleta global → editar `src/styles/tokens.css`.
- Inline `style={{}}` solo se usa para valores genuinamente dinámicos (color sacado de un map, % en barras de progreso, etc.). Estructura/spacing/typography van por className.
- **Fuentes**: Bebas Neue (display) + DM Sans (body), importadas en `global.css`.
- **Tema**: dark; fondo `#06080F`, cards `#0F172A`/`#162030`, accent amarillo `#FCD34D`/`#F59E0B`.
- **Mobile responsive**: media queries en cada `.module.css` (768px, 480px). Stats grid colapsa, sub-tabs hacen scroll horizontal, modales con padding reducido.

### Tabs implementados (5)

1. **Dashboard** — stats globales, Momentum tracker, progreso por tipo y confederación, equipos con más faltantes.
2. **Equipos** — grid de 32 selecciones con barra de progreso; drill-down por jugador y tipo.
3. **Cartas** — catálogo navegable con filtros (status / tipo / equipo / búsqueda).
4. **Marketplace** — sub-tabs:
   - **Todos**: lista de coleccionistas visibles ordenados por matches contigo. Cada card muestra "Te puede dar X / Le das Y". Tap → drill-down con matches y CTA "Solicitar trade" → modal con contactos copyables y mensaje template.
   - **Amigos**: filtra a friendships con `status='accepted'`.
   - **Mi lista**: la antigua pantalla Intercambio (mis duplicados agrupados por categoría/equipo, botón Copiar lista).
   - **Solicitudes**: friend requests entrantes (aceptar/rechazar) y enviadas (cancelar).
5. **Perfil** — form: display_name, avatar emoji selector, contactos (Instagram/WhatsApp/email), toggle "Visible en Marketplace".

### UX flows

- Tap pill de carta → cicla missing → have → duplicate → missing. Toast del cambio.
- "✓ Guardado" pop top-right (animación savedPop, 1.6s).
- Botón ✏️ "Actualización rápida" (FAB) → modal con textarea para rangos `1,3,4-7,10,15-20` + selector estado → aplicar bulk.
- Botón ⟲ → reset modal de confirmación.
- Marketplace requiere `marketplace_visible=true` en el perfil para ver coleccionistas (empty state te lleva al perfil).
- Trade modal: revela contactos del otro usuario y un mensaje sugerido editable, listo para copiar y pegar en WhatsApp/Instagram/email. **No hay mensajería in-app — el contacto se hace por fuera, deliberadamente.**

---

## Validación de backend (Fase 1, hacer antes de cualquier cambio mayor)

Run en orden:

1. `mcp__claude_ai_Supabase__list_tables` con `schemas=["public"]` → confirmar que existen `adrenalyn_collections`, `adrenalyn_profiles`, `adrenalyn_friendships`, todas con RLS enabled.
2. `mcp__claude_ai_Supabase__execute_sql` con la query de RLS (arriba) → policies como se describen.
3. `mcp__claude_ai_Supabase__get_advisors` `type=security` → revisar. Conocidos:
   - `function_search_path_mutable` en `adrenalyn.set_updated_at` y `public.adrenalyn_set_updated_at` (no bloqueante).
   - `auth_leaked_password_protection` off (opcional).
   - El resto de warnings (`security_definer_view`, `anon_security_definer_*`) pertenece a Skolar — NO tocar.
4. Verificar Vercel env: `vercel env ls` → `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Production. La key debe ser `sb_publishable_*`, NO una JWT.
5. Sanity check de auth: `curl -X POST 'https://xawgomhknzdnhkxcegqi.supabase.co/auth/v1/token?grant_type=password' -H 'apikey: <key>' -H 'Content-Type: application/json' -d '{"email":"x@x.x","password":"wrong"}'` → debe responder `400 invalid_credentials`.

---

## Pendientes de housekeeping (no urgentes)

- Rotar el `service_role` secret en Supabase. Estuvo brevemente en Vercel env (~5 min) durante el debugging del 2026-05-01. Como las legacy keys están deshabilitadas, no se puede explotar — pero higiénicamente conviene rotar cuando se acuerden.
- Agregar `VITE_SUPABASE_ANON_KEY` a Vercel **Preview** env si en algún momento se quiere usar branch deploys (CLI da error con la confirmación "all branches" — usar dashboard de Vercel para esto).
- 2 funciones en Supabase con `search_path` mutable (`adrenalyn.set_updated_at`, `public.adrenalyn_set_updated_at`). Warning menor de advisors. Fix: micro-migración con `SET search_path = ''` en cada función.
- Marketplace v2 ideas (no implementadas, registradas):
  - Tracking de trades cerrados (cuando dos usuarios completan un intercambio fuera de la app).
  - Botón de reportar usuario (campo `reported_count` en profiles + RPC).
  - Notificaciones in-app cuando llega una friend request o trade match nuevo.
  - Mensajería in-app vía Supabase Realtime (decisión actual: contacto externo solamente).
  - "Friends-only" listings (campo `marketplace_audience: 'public' | 'friends'` en profiles).

---

## Cómo correr en local

```bash
cd /Users/sebastiansequeira/Downloads/adrenalyn-tracker
npm install              # primera vez
npm run dev              # dev server en http://localhost:5173
npm run build            # build de producción a dist/
```

`.env` ya está poblado y gitignored. No commitear.

---

## Cómo deployear

Auto-deploy: cualquier `git push` a `main` dispara build + deploy en Vercel. URL de producción es alias permanente `album-tracker-three.vercel.app`. Cada deploy también genera un URL único `album-tracker-<hash>...vercel.app` (estos NO son públicos por la protección de deployment de Vercel — usar siempre el alias).

Manual: `vercel deploy --prod --yes` desde la carpeta del proyecto (necesita `vercel link` previo).
