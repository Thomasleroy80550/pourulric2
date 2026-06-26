CREATE OR REPLACE FUNCTION public.set_profile_transfer_verification(p_user_id uuid, p_in_progress boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.transfer_verification_statuses (user_id, in_progress, updated_by, updated_at)
  VALUES (p_user_id, p_in_progress, auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET in_progress = EXCLUDED.in_progress,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;
END;
$$