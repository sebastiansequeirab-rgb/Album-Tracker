# Email Templates — WC Album Tracker

Plantillas HTML branded para los emails transaccionales de Supabase Auth.

## Archivos

- **`recover-password.html`** — email enviado cuando el usuario solicita reset password (vía "¿Olvidaste tu contraseña?" en login).
- **`confirm-signup.html`** — email enviado cuando un usuario nuevo se registra (si email confirmation está habilitada).

## Cómo aplicar

1. Andá al [Supabase Dashboard del proyecto](https://supabase.com/dashboard/project/xawgomhknzdnhkxcegqi).
2. **Auth** → **Email Templates**.
3. Por cada template:
   - Click en el template (Reset Password / Confirm signup).
   - Click en **Source** (vista HTML).
   - Borrá el contenido actual.
   - Pegá el HTML del archivo correspondiente.
   - Click **Save**.

## Pre-requisitos

### Reset Password
- En **Auth → URL Configuration → Redirect URLs**, agregá:
  ```
  https://wc2026albumtracker.vercel.app/reset-password
  ```
  Si no está, el link del email lleva a una página de error.

### Confirm Signup
- Email confirmation está **DESACTIVADO** por default en este proyecto (el Site URL apunta a Skolar y compartimos auth provider — confirmar emails ahí redirigiría al dominio de Skolar).
- Si querés activarlo:
  1. **Auth → Providers → Email** → activar "Confirm email".
  2. En el código de la app (`src/components/Auth.jsx`), cuando llamás a `supabase.auth.signUp({ email, password })`, agregar:
     ```js
     options: {
       emailRedirectTo: 'https://wc2026albumtracker.vercel.app',
     }
     ```
     Esto fuerza que el confirm-signup link vuelva a nuestro dominio (no al Site URL global de Skolar).

## Variables Supabase usadas

| Variable | Descripción |
|---|---|
| `{{ .ConfirmationURL }}` | URL con token de confirmación. Apunta automáticamente a tu Redirect URL configurada. |
| `{{ .Email }}` | Email del usuario. |
| `{{ .Token }}` | Token raw (no usado en estas plantillas — el ConfirmationURL ya lo incluye). |
| `{{ .SiteURL }}` | Site URL global del proyecto (NO usado — apunta a Skolar). |

## Diseño

- Fondo dark navy (`#06080F`).
- Card de contenido `#0d111c` con borde gold sutil.
- Header con logo `⚽ WC ALBUM TRACKER` + sub `FIFA WC 2026`.
- CTA gold gradient (mismo que la app).
- Footer link a `wc2026albumtracker.vercel.app`.
- Tipografía: Bebas Neue para titulos (con fallback Impact), system-ui para body.

## Test local

Podés previsualizar abriendo cualquier `.html` en el navegador. Las variables `{{ .X }}` no se reemplazan en local — eso lo hace Supabase al enviar el email real.

Si querés probar el flow real:
1. En Supabase **Auth → Users**, encontrá un user de prueba.
2. **Send password reset email** desde la UI.
3. Revisá la inbox del user.
