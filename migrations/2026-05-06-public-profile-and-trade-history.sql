-- ============================================================================
-- Adrenalyn Tracker — migración aditiva 2026-05-06
-- Aplicar en Supabase dashboard → SQL editor.
-- TODAS las modificaciones son aditivas (no DROP). Compatibles con la tabla
-- compartida con Skolar (NO TOCAR otras tablas).
-- ============================================================================

-- 1. profiles: agregar slug público y contador de trades concretados.
ALTER TABLE adrenalyn_profiles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS trades_completed integer NOT NULL DEFAULT 0;

-- Slug único e indexable.
CREATE UNIQUE INDEX IF NOT EXISTS adrenalyn_profiles_slug_unique
  ON adrenalyn_profiles (slug)
  WHERE slug IS NOT NULL;

-- Backfill slug desde display_name + sufijo corto del user_id.
-- Slugify: lowercase, sin tildes, espacios → '-', strip non-alphanumerics.
UPDATE adrenalyn_profiles
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      TRANSLATE(
        COALESCE(display_name, 'coleccionista'),
        'ÁÉÍÓÚÜÑáéíóúüñ',
        'AEIOUUNaeiouun'
      ),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    ),
    '^-|-$',
    '',
    'g'
  )
) || '-' || SUBSTR(user_id::text, 1, 6)
WHERE slug IS NULL;

-- 2. public_listings: agregar completed_at para distinguir "concretada" de "cerrada".
ALTER TABLE adrenalyn_public_listings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3. trade_history: registro de intercambios concretados.
CREATE TABLE IF NOT EXISTS adrenalyn_trade_history (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  album_type  text NOT NULL,
  received_ids text[] NOT NULL DEFAULT '{}',
  given_ids    text[] NOT NULL DEFAULT '{}',
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS adrenalyn_trade_history_user_idx
  ON adrenalyn_trade_history (user_id, created_at DESC);

ALTER TABLE adrenalyn_trade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_history select own" ON adrenalyn_trade_history;
CREATE POLICY "trade_history select own"
  ON adrenalyn_trade_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trade_history insert own" ON adrenalyn_trade_history;
CREATE POLICY "trade_history insert own"
  ON adrenalyn_trade_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Anon read access for public profile (RLS).
-- Solo perfiles con marketplace_visible=true son leíbles por usuarios anónimos.
DROP POLICY IF EXISTS "profiles anon read public" ON adrenalyn_profiles;
CREATE POLICY "profiles anon read public"
  ON adrenalyn_profiles FOR SELECT
  TO anon
  USING (marketplace_visible = true);

-- Lo mismo para colecciones de Adrenalyn (la lectura ya existe para auth con
-- match marketplace; agregamos versión anon).
DROP POLICY IF EXISTS "collections anon read public" ON adrenalyn_collections;
CREATE POLICY "collections anon read public"
  ON adrenalyn_collections FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM adrenalyn_profiles p
      WHERE p.user_id = adrenalyn_collections.user_id
        AND p.marketplace_visible = true
    )
  );

-- Idem para sticker_collections (legacy sin prefijo).
DROP POLICY IF EXISTS "sticker_collections anon read public" ON sticker_collections;
CREATE POLICY "sticker_collections anon read public"
  ON sticker_collections FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM adrenalyn_profiles p
      WHERE p.user_id = sticker_collections.user_id
        AND p.marketplace_visible = true
    )
  );

-- 5. Trigger opcional: cuando un trade pasa a 'completed', incrementar contadores
-- en ambos perfiles.
CREATE OR REPLACE FUNCTION adrenalyn_increment_trades_on_complete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    UPDATE adrenalyn_profiles
      SET trades_completed = COALESCE(trades_completed, 0) + 1
      WHERE user_id IN (NEW.initiator_id, NEW.target_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS adrenalyn_trade_status_complete ON adrenalyn_trade_requests;
CREATE TRIGGER adrenalyn_trade_status_complete
  AFTER UPDATE OF status ON adrenalyn_trade_requests
  FOR EACH ROW
  EXECUTE FUNCTION adrenalyn_increment_trades_on_complete();

-- ============================================================================
-- Verificación post-aplicación:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='adrenalyn_profiles' AND column_name IN ('slug','trades_completed');
--   SELECT count(*) FROM adrenalyn_trade_history;
--   SELECT polname FROM pg_policy WHERE polrelid = 'adrenalyn_profiles'::regclass;
-- ============================================================================
