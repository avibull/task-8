
DROP POLICY IF EXISTS "admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "managers can add tags" ON public.tags;
DROP POLICY IF EXISTS "managers can delete tags" ON public.tags;
DROP POLICY IF EXISTS "see tasks created by me or tagging me" ON public.tasks;
DROP POLICY IF EXISTS "update tasks I created or am tagged in" ON public.tasks;

DROP TRIGGER IF EXISTS trg_guard_profile_role_change ON public.profiles;
DROP TRIGGER IF EXISTS guard_profile_role_change ON public.profiles;
DROP TRIGGER IF EXISTS trg_on_profile_insert ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_insert ON public.profiles;
DROP TRIGGER IF EXISTS trg_on_profile_delete ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_delete ON public.profiles;
DROP TRIGGER IF EXISTS profile_delete_cleanup ON public.profiles;

DROP FUNCTION IF EXISTS public.guard_profile_role_change() CASCADE;
DROP FUNCTION IF EXISTS public.on_profile_insert() CASCADE;
DROP FUNCTION IF EXISTS public.on_profile_delete() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(public.user_role) CASCADE;
DROP FUNCTION IF EXISTS public.current_role_value() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to text[] NOT NULL DEFAULT '{}';

UPDATE public.tasks SET
  assigned_to = COALESCE(ARRAY(SELECT substring(t from 2) FROM unnest(tags) t WHERE t LIKE '@%'), '{}'),
  tags        = COALESCE(ARRAY(SELECT t FROM unnest(tags) t WHERE t NOT LIKE '@%'), '{}');

DELETE FROM public.tags WHERE name LIKE '@%';
ALTER TABLE public.tags DROP COLUMN IF EXISTS is_user_tag;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_tags boolean NOT NULL DEFAULT false;

UPDATE public.profiles
  SET is_admin = (role::text = 'admin'),
      can_edit_tags = (role::text IN ('admin','manager'));

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS public.user_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false) $$;

CREATE OR REPLACE FUNCTION public.can_edit_tags()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_admin OR can_edit_tags FROM public.profiles WHERE id = auth.uid()), false) $$;

CREATE OR REPLACE FUNCTION public.on_profile_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks
    SET assigned_to = array_remove(assigned_to, OLD.username)
    WHERE OLD.username = ANY(assigned_to);
  RETURN OLD;
END $$;

CREATE TRIGGER profile_delete_cleanup
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_delete();

CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "tag editors can add tags" ON public.tags FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_tags());
CREATE POLICY "tag editors can delete tags" ON public.tags FOR DELETE TO authenticated
  USING (public.can_edit_tags());

CREATE POLICY "see tasks I created or am assigned to" ON public.tasks FOR SELECT TO authenticated
  USING (created_by = public.current_username() OR public.current_username() = ANY(assigned_to));
CREATE POLICY "update tasks I created or am assigned to" ON public.tasks FOR UPDATE TO authenticated
  USING (created_by = public.current_username() OR public.current_username() = ANY(assigned_to));
