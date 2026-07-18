CREATE OR REPLACE FUNCTION public.find_technical_report_by_ref(p_ref text)
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  created_at timestamptz,
  property_name text,
  owner_response text,
  resolved_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, title, status, created_at, property_name, owner_response, resolved_at
  FROM public.technical_reports
  WHERE replace(lower(id::text), '-', '') LIKE lower(replace(coalesce(p_ref, ''), '-', '')) || '%'
    AND length(replace(coalesce(p_ref, ''), '-', '')) >= 6
  ORDER BY created_at DESC
  LIMIT 1;
$$;