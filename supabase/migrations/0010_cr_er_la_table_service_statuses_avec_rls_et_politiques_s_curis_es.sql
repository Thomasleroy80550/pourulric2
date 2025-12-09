-- Table des statuts des services
CREATE TABLE public.service_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational','degraded','outage','maintenance')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.service_statuses ENABLE ROW LEVEL SECURITY;

-- Politique de lecture publique (page de statut accessible à tous)
CREATE POLICY "service_statuses_public_read" ON public.service_statuses
FOR SELECT USING (true);

-- Politiques Admin: gestion complète
CREATE POLICY "service_statuses_admin_insert" ON public.service_statuses
FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "service_statuses_admin_update" ON public.service_statuses
FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "service_statuses_admin_delete" ON public.service_statuses
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS set_service_statuses_timestamp ON public.service_statuses;
CREATE TRIGGER set_service_statuses_timestamp
  BEFORE UPDATE ON public.service_statuses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();