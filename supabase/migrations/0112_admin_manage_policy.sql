CREATE POLICY "Admins can manage all announcements." ON public.announcements
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));