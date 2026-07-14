CREATE POLICY "Users can delete their own like." ON public.announcement_likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);