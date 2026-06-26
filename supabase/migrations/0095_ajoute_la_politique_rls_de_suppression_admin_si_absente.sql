DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transfer_verification_statuses'
      AND policyname = 'transfer_verification_admin_delete'
  ) THEN
    CREATE POLICY transfer_verification_admin_delete ON public.transfer_verification_statuses
    FOR DELETE TO authenticated USING (is_admin(auth.uid()));
  END IF;
END;
$$