CREATE OR REPLACE FUNCTION public.notify_housekeeping_note_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner RECORD;
  room_label TEXT;
  cleaning_label TEXT;
BEGIN
  room_label := COALESCE(NEW.room_name, NEW.room_id);
  cleaning_label := COALESCE(TO_CHAR(NEW.cleaning_date, 'DD Mon YYYY'), 'aujourd''hui');

  FOR owner IN
    SELECT ur.user_id
    FROM public.user_rooms ur
    WHERE ur.room_id = NEW.room_id
  LOOP
    INSERT INTO public.notifications (user_id, message, link)
    VALUES (
      owner.user_id,
      'Nouvelle tâche de ménage: ' || room_label || ' (date: ' || cleaning_label || ')',
      '/housekeeping-reports'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_housekeeping_note_created ON public.housekeeping_notes;
CREATE TRIGGER on_housekeeping_note_created
AFTER INSERT ON public.housekeeping_notes
FOR EACH ROW EXECUTE FUNCTION public.notify_housekeeping_note_creation();