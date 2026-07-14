CREATE POLICY "Users can delete their own reads." ON public.announcement_reads
FOR DELETE TO authenticated USING (auth.uid() = user_id);