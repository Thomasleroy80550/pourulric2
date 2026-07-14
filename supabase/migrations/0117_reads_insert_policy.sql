CREATE POLICY "Users can insert their own reads." ON public.announcement_reads
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);