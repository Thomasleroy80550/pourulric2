-- Table des demandes d'hivernage
CREATE TABLE public.hivernage_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_room_id UUID REFERENCES public.user_rooms(id) ON DELETE SET NULL,
  instructions JSONB NOT NULL,
  comments TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.hivernage_requests ENABLE ROW LEVEL SECURITY;

-- Politiques: utilisateurs gèrent leurs propres données
CREATE POLICY "hivernage_select_own" ON public.hivernage_requests 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "hivernage_insert_own" ON public.hivernage_requests 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hivernage_update_own" ON public.hivernage_requests 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admins peuvent tout gérer
CREATE POLICY "hivernage_admin_manage_all" ON public.hivernage_requests 
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.hivernage_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_hivernage_timestamp ON public.hivernage_requests;
CREATE TRIGGER set_hivernage_timestamp
BEFORE UPDATE ON public.hivernage_requests
FOR EACH ROW EXECUTE FUNCTION public.hivernage_set_timestamp();