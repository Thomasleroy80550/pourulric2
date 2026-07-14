CREATE POLICY "Authenticated can view likes." ON public.announcement_likes
FOR SELECT TO authenticated USING (true);