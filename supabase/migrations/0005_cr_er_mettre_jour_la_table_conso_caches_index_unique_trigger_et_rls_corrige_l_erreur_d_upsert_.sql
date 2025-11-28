-- Table de cache Conso API
CREATE TABLE IF NOT EXISTS public.conso_caches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prm TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,   -- inclus
  end_date DATE NOT NULL,     -- exclus
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index d’unicité pour l’upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'conso_caches_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX conso_caches_unique_idx
      ON public.conso_caches (user_id, prm, type, start_date, end_date);
  END IF;
END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.conso_cache_set_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_conso_cache_timestamp ON public.conso_caches;
CREATE TRIGGER set_conso_cache_timestamp
BEFORE UPDATE ON public.conso_caches
FOR EACH ROW EXECUTE FUNCTION public.conso_cache_set_timestamp();

-- Activer RLS et policy de lecture (les insert/update par service role passent sans policy)
ALTER TABLE public.conso_caches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conso_caches_select_own ON public.conso_caches;
CREATE POLICY conso_caches_select_own
ON public.conso_caches
FOR SELECT TO authenticated
USING (auth.uid() = user_id);