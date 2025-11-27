-- Create table
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "newsletter_campaigns_admin_manage_all" ON public.newsletter_campaigns
FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS set_newsletter_campaigns_timestamp ON public.newsletter_campaigns;
CREATE TRIGGER set_newsletter_campaigns_timestamp
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();