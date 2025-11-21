CREATE POLICY "delegates_select_user_rooms" ON public.user_rooms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.delegated_invoice_viewers d
    WHERE d.owner_id = user_rooms.user_id
      AND d.viewer_id = auth.uid()
      AND d.status = 'accepted'
  )
);