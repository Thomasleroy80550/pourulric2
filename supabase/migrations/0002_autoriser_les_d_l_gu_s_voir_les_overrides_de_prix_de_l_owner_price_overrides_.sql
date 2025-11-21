CREATE POLICY "delegates_select_price_overrides" ON public.price_overrides
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delegated_invoice_viewers d
    WHERE d.owner_id = price_overrides.user_id
      AND d.viewer_id = auth.uid()
      AND d.status = 'accepted'
  )
);