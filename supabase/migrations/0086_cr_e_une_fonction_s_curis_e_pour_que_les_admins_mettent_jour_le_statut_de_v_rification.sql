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

  UPDATE public.profiles
  SET transfer_verification_in_progress = p_in_progress
  WHERE id = p_user_id;
END;
$$