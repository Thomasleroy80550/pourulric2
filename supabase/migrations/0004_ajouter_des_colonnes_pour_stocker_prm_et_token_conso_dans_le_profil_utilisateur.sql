ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS conso_prm TEXT,
ADD COLUMN IF NOT EXISTS conso_token TEXT;

-- RLS est déjà activé sur profiles et les politiques existantes
-- limitent l'accès à l'utilisateur lui-même pour SELECT/UPDATE/INSERT.