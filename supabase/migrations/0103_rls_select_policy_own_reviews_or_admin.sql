CREATE POLICY "krossbooking_reviews_select_own_or_admin" ON public.krossbooking_reviews
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));