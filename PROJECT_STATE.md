# Adrenalyn Tracker — Estado actual del proyecto

> Brief para una sesión nueva. Lee esto, valida el backend, y pasa a refinar el UI.
> Última actualización: 2026-05-01.

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

### Tabla única de la app: `public.adrenalyn_collections`

```
id          uuid PK (gen_random_uuid)
user_id     uuid UNIQUE FK auth.users(id)
data        jsonb default '{}'
created_at  timestamptz default now()
updated_at  timestamptz default now()
```

- 1 fila por usuario (constraint UNIQUE en `user_id`)
- `data` guarda el estado completo de la colección como blob JSON: `{ "<card_id>": "missing"|"have"|"duplicate", ... }`

### RLS — confirmar siempre antes de cambios

- RLS habilitada ✓
- 4 policies, todas filtran por `auth.uid() = user_id`:
  - `adrenalyn_select` (SELECT)
  - `adrenalyn_insert` (INSERT, with_check)
  - `adrenalyn_update` (UPDATE)
  - `adrenalyn_delete` (DELETE)

Verificar con:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'adrenalyn_collections';
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

---

## Frontend — aquí es donde toca trabajar

### Estructura

```
src/
├── App.jsx                    auth gate (Auth o Tracker según session)
├── main.jsx                   entry
├── supabaseClient.js          createClient con env vars
├── data.js                    633 cartas hardcoded, TEAMS_LIST, TM/CC/ST maps, helpers
└── components/
    ├── Auth.jsx               login/signup (~70 líneas, inline styles)
    └── Tracker.jsx            app principal (~700 líneas, 4 tabs, inline styles)
```

### Stack visual actual

- **Inline `style={{}}` por todos lados**. No hay CSS modules, no Tailwind, no styled-components. Si vamos a hacer rediseño grande, considerar migrar a algo más mantenible — pero confirmar con el usuario antes (puede preferir mantener simple).
- **Fuentes**: Bebas Neue (display) + DM Sans (body) vía Google Fonts inline.
- **Tema**: dark, fondo `#06080F`, accent amarillo `#FCD34D`/`#F59E0B`, cartas en `#0F172A`/`#162030`.
- **Status colors**: have `#4ADE80` (verde), duplicate `#F59E0B` (naranja), missing `#475569` (gris), Momentum `#E879F9` (morado).

### Tabs implementados

1. **Dashboard** — estadísticas globales, progreso por equipo (preview), Momentum tracker (3/3), tipos de carta.
2. **Equipos** — grid de 32 selecciones con barra de progreso; click → drill-down por jugador y tipo.
3. **Cartas** — catálogo navegable con filtros (status / tipo / equipo / búsqueda por nombre/número).
4. **Intercambio** — lista de duplicados agrupados por equipo, botón copy-to-clipboard.

### UX flows

- Tap pill de carta → cicla missing → have → duplicate → missing. Toast del cambio.
- Botón ✏️ "Actualización rápida" → modal con textarea para pegar números (`1,3,4-7,10,15-20`) + selector have/duplicate/missing → aplicar bulk.
- Botón ⟲ → reset modal de confirmación → pone toda la colección en `missing`.
- Botón "Salir" → signOut.

---

## Tareas para la próxima sesión

### Fase 1 — Validación de backend (haz esto antes de tocar UI)

Run en orden:

1. `mcp__claude_ai_Supabase__list_tables` con `schemas=["public"]` → confirmar que `adrenalyn_collections` existe con la estructura descrita arriba.
2. `mcp__claude_ai_Supabase__execute_sql` con la query de RLS (arriba) → 4 policies, todas con `auth.uid() = user_id`.
3. `mcp__claude_ai_Supabase__get_advisors` `type=security` → revisar warnings. Conocidos: `function_search_path_mutable` en `set_updated_at` (no bloqueante), `auth_leaked_password_protection` desactivada (opcional).
4. Verificar Vercel env: `vercel env ls` desde el proyecto local → debe mostrar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` ambas en Production. La key debe ser `sb_publishable_*`, NO una JWT (`eyJ...`) que sería el secret expuesto del incidente anterior.
5. Sanity check de auth: `curl -X POST 'https://xawgomhknzdnhkxcegqi.supabase.co/auth/v1/token?grant_type=password' -H 'apikey: <key>' -H 'Content-Type: application/json' -d '{"email":"x@x.x","password":"wrong"}'` → debe responder 400 `invalid_credentials` (NO 401 ni "Legacy API keys are disabled").

### Fase 2 — Mejoras de UI/UX (el grueso del trabajo)

Sin lista cerrada — el usuario va a guiar. Algunas observaciones desde ya:

- Inline styles está OK para esta escala pero limita iteración rápida. Considerar (con consenso del usuario): extraer un objeto `theme` central, o migrar a CSS variables, o introducir Tailwind solo si el usuario lo aprueba.
- El Dashboard mezcla muchos elementos visuales — puede beneficiarse de jerarquía más clara.
- El cycling missing→have→duplicate al tocar es elegante pero no obvio. Considerar tooltip o leyenda.
- Falta confirmación visual fuerte cuando el "✓ Guardado" aparece (es muy sutil ahora mismo).
- Mobile: revisar responsive — la grid del Dashboard puede romperse en pantallas chicas.

**Reglas para la fase de UI:**
- NO cambiar el data model ni la lógica de save/load.
- NO romper el contrato de `buildCards()` / `data.js` (los IDs de carta son load-bearing porque están guardados en el `data` jsonb de cada usuario).
- Mantener los 4 tabs, el botón Reset, el botón Salir, la funcionalidad de Quick Update y Trading.

---

## Pendientes de housekeeping (no urgentes)

- Rotar el `service_role` secret en Supabase. Estuvo brevemente en Vercel env (~5 min) durante el debugging del 2026-05-01. Como las legacy keys están deshabilitadas, no se puede explotar — pero higiénicamente conviene rotar cuando se acuerden.
- Agregar `VITE_SUPABASE_ANON_KEY` a Vercel **Preview** env si en algún momento se quiere usar branch deploys (CLI da error con la confirmación "all branches" — usar dashboard de Vercel para esto).
- 2 funciones en Supabase con `search_path` mutable (`adrenalyn.set_updated_at`, `public.adrenalyn_set_updated_at`). Warning menor de advisors. Fix: micro-migración con `SET search_path = ''` en cada función.

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
