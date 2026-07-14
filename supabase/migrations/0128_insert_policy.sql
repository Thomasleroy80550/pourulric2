CREATE POLICY "Users can insert their own like." ON public.announcement_likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);