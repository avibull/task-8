-- 1. GIN index on assigned_to
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx 
  ON public.tasks USING GIN(assigned_to);

-- 2. Index on updated_at
CREATE INDEX IF NOT EXISTS tasks_updated_at_idx 
  ON public.tasks(updated_at DESC);

-- 3. Bulk tag removal
CREATE OR REPLACE FUNCTION public.remove_tag_from_tasks(_tag_name text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.tasks
    SET tags = array_remove(tags, _tag_name),
        updated_at = now()
    WHERE _tag_name = ANY(tags);
$$;
REVOKE ALL ON FUNCTION public.remove_tag_from_tasks(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_tag_from_tasks(text) TO authenticated;

-- 4. Bulk reorder
CREATE OR REPLACE FUNCTION public.bulk_reorder_tasks(_ids text[], _orders int[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  FOR i IN 1..array_length(_ids, 1) LOOP
    UPDATE public.tasks
      SET sort_order = _orders[i], updated_at = now()
      WHERE id = _ids[i]::uuid
        AND (
          created_by = public.current_username()
          OR public.current_username() = ANY(assigned_to)
        );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.bulk_reorder_tasks(text[], int[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_reorder_tasks(text[], int[]) TO authenticated;

-- 5. Drop stale @-tag visibility policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks'
      AND policyname = 'see tasks created by me or tagging me'
  ) THEN
    EXECUTE 'DROP POLICY "see tasks created by me or tagging me" ON public.tasks';
  END IF;
END $$;