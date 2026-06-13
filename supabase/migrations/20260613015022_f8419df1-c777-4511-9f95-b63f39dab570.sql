UPDATE public.profiles SET can_edit_tags = true WHERE is_admin = true AND can_edit_tags = false;

DROP POLICY IF EXISTS "tag editors can delete tags" ON public.tags;
DROP POLICY IF EXISTS "tag editors can remove tags" ON public.tags;

CREATE POLICY "tag editors can delete tags" ON public.tags
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR can_edit_tags = true)
    )
  );

CREATE OR REPLACE FUNCTION public.can_edit_tags()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_admin OR can_edit_tags FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.remove_tag_from_tasks(_tag_name text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.tasks
    SET tags = array_remove(tags, _tag_name),
        updated_at = now()
    WHERE _tag_name = ANY(tags);
$$;

REVOKE ALL ON FUNCTION public.remove_tag_from_tasks(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_tag_from_tasks(text) TO authenticated;