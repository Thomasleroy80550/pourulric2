-- Create error_logs table to store client-side error reports

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT NULL,
  component TEXT NULL,
  message TEXT NOT NULL,
  stack TEXT NULL,
  user_email TEXT NULL,
  user_description TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_route_idx ON public.error_logs (route);
CREATE INDEX IF NOT EXISTS error_logs_component_idx ON public.error_logs (component);

-- Enable RLS (REQUIRED)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
CREATE POLICY "error_logs_select_admin_only" ON public.error_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);
