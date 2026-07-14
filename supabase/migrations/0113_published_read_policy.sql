CREATE POLICY "Published announcements are viewable by authenticated users." ON public.announcements
FOR SELECT TO authenticated USING (is_published = true);