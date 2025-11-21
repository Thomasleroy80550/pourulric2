CREATE POLICY "delegates_select_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delegated_invoice_viewers d
    WHERE d.owner_id = profiles.id
      AND d.viewer_id = auth.uid()
      AND d.status = 'accepted'
  )
);