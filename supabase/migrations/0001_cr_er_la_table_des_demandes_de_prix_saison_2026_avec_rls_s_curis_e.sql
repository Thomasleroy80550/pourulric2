-- Table pour les demandes de prix sur la saison
CREATE TABLE IF NOT EXISTS public.season_price_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  room_id TEXT,
  room_name TEXT,
  items JSONB NOT NULL, -- liste des périodes avec prix/restrictions
  status TEXT DEFAULT 'pending', -- pending | processing | done | cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.season_price_requests ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (utilisateur authentifié = accès à ses propres demandes)
CREATE POLICY "season_2026_select_own" ON public.season_price_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "season_2026_insert_own" ON public.season_price_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "season_2026_update_own" ON public.season_price_requests
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "season_2026_delete_own" ON public.season_price_requests
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Politiques admin (via fonction is_admin déjà présente)
CREATE POLICY "season_2026_admin_manage_all" ON public.season_price_requests
FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));