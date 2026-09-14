CREATE OR REPLACE FUNCTION public.set_lesson_session_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.owner_id := OLD.owner_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_sessions_set_updated_at
  BEFORE UPDATE ON lesson_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_lesson_session_updated_at();
