# ⚽ Adrenalyn XL — FIFA World Cup 2026 Tracker

Tu colección personal de Panini Adrenalyn XL con autenticación, persistencia en la nube y deploy en Vercel.

---

## 🚀 Deploy en 5 pasos

### 1. Subir a GitHub

```bash
cd adrenalyn-tracker
git init
git add .
git commit -m "feat: adrenalyn tracker inicial"
```

Crea un repo en GitHub (github.com → New repository → `adrenalyn-tracker`) y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/adrenalyn-tracker.git
git branch -M main
git push -u origin main
```

### 2. Conectar a Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. **Add New → Project**
3. Importa tu repo `adrenalyn-tracker`
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = `https://xawgomhknzdnhkxcegqi.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_uiJKOVJ79-Yjs-ne_El6OQ_Qfx6Nmq7`
5. Click **Deploy** ✅

### 3. Agregar tu dominio de Vercel a Supabase Auth

Una vez desplegado, Vercel te da una URL como `adrenalyn-tracker.vercel.app`.

Ve a tu [Supabase Dashboard](https://supabase.com/dashboard/project/xawgomhknzdnhkxcegqi/auth/url-configuration) y agrega esa URL en:
- **Site URL**: `https://adrenalyn-tracker.vercel.app`
- **Redirect URLs**: `https://adrenalyn-tracker.vercel.app/**`

### 4. Opcional — Confirmar email al registrarse

Por defecto Supabase requiere confirmar email. Si quieres que entre directo sin confirmación:
- Dashboard → Authentication → Providers → Email → desactiva "Confirm email"

---

## 🛠 Desarrollo local

```bash
npm install
cp .env.example .env   # ya tiene las keys correctas
npm run dev
```

Abre http://localhost:5173

---

## 🗃 Base de datos

- Proyecto Supabase: **Skolar** (xawgomhknzdnhkxcegqi)
- Tabla: `public.adrenalyn_collections` (aislada del resto de Skolar)
- RLS activado: cada usuario solo ve su propia colección
- Auth compartido con Skolar (mismos usuarios, mismas cuentas)

---

## ✨ Features

- 🔐 Auth con email/password
- 💾 Colección guardada en Supabase por usuario
- 📊 Dashboard con estadísticas en tiempo real
- 🌍 Vista por equipo con progreso
- 🃏 Browser de cartas con filtros
- ✏️ Actualización rápida en bulk (pegar lista de números)
- 🔄 Lista de repetidas para intercambio
- 💎 Tracker de cartas Momentum
- 📋 Copiar lista de intercambio al clipboard
