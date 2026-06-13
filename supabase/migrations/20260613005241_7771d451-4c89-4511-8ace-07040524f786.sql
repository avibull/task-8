-- Ensure the correct tasks SELECT policy exists
-- Drop any broken versions first, then recreate cleanly

DROP POLICY IF EXISTS "see tasks I created or am assigned to" ON public.tasks;
DROP POLICY IF EXISTS "see tasks created by me or tagging me" ON public.tasks;

CREATE POLICY "see tasks I created or am assigned to" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    created_by = public.current_username()
    OR public.current_username() = ANY(assigned_to)
  );

-- Ensure UPDATE policy is also intact
DROP POLICY IF EXISTS "update tasks I created or am assigned to" ON public.tasks;

CREATE POLICY "update tasks I created or am assigned to" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    created_by = public.current_username()
    OR public.current_username() = ANY(assigned_to)
  );

-- Ensure INSERT policy is intact
DROP POLICY IF EXISTS "users insert own tasks" ON public.tasks;

CREATE POLICY "users insert own tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = public.current_username());

-- Ensure DELETE policy is intact
DROP POLICY IF EXISTS "users delete own tasks" ON public.tasks;

CREATE POLICY "users delete own tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (created_by = public.current_username());

-- Re-apply the GIN index safely
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx
  ON public.tasks USING GIN(assigned_to);

CREATE INDEX IF NOT EXISTS tasks_updated_at_idx
  ON public.tasks(updated_at DESC);