
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_user_created ON public.activity_log(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own activity"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cap_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_log
   WHERE user_id = NEW.user_id
     AND id IN (
       SELECT id FROM public.activity_log
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 200
     );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_cap_activity_log
AFTER INSERT ON public.activity_log
FOR EACH ROW EXECUTE FUNCTION public.cap_activity_log();
