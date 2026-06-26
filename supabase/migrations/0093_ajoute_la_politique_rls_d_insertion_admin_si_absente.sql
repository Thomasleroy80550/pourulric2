DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transfer_verification_statuses'
      AND policyname = 'transfer_verification_admin_insert'
  ) THEN
    CREATE POLICY transfer_verification_admin_insert ON public.transfer_verification_statuses
    FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
  END IF;
END;
$$