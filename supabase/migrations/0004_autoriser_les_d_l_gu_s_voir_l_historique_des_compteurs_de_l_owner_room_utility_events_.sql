CREATE POLICY "delegates_select_room_utility_events" ON public.room_utility_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_rooms ur
    JOIN public.delegated_invoice_viewers d ON d.owner_id = ur.user_id
    WHERE ur.id = room_utility_events.user_room_id
      AND d.viewer_id = auth.uid()
      AND d.status = 'accepted'
  )
);