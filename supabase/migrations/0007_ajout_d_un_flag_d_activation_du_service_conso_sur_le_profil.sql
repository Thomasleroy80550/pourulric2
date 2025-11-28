ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS conso_service_enabled BOOLEAN DEFAULT false;