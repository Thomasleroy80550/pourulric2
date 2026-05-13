CREATE TABLE IF NOT EXISTS public.domain_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_site_id UUID NOT NULL REFERENCES public.mini_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_domain TEXT NOT NULL,
  alternative_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'reserved', 'configured', 'rejected')),
  final_domain TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);