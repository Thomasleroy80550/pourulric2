CREATE POLICY "Users can view their own reads." ON public.announcement_reads
FOR SELECT TO authenticated USING (auth.uid() = user_id);