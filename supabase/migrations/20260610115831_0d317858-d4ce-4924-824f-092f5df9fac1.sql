
-- 1. Restrict profile SELECT to own row; expose safe directory view for lookups
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;

CREATE POLICY "users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
  SELECT id, name, username, is_active
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- The directory view needs to be readable across users; add a permissive policy
-- limited to non-sensitive columns by reading through the view only.
CREATE POLICY "directory lookup via view"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- The above re-broadens SELECT; instead drop and use a security definer function.
DROP POLICY IF EXISTS "directory lookup via view" ON public.profiles;

CREATE OR REPLACE FUNCTION public.list_active_profiles()
RETURNS TABLE (id uuid, name text, username text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, username, is_active
  FROM public.profiles
  WHERE is_active = true;
$$;

REVOKE ALL ON FUNCTION public.list_active_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated;

-- Replace the view-based directory by exposing it through the function as well
DROP VIEW IF EXISTS public.profiles_public;

-- 2. Prevent privilege escalation: block non-admins from updating privileged columns
CREATE OR REPLACE FUNCTION public.profiles_block_priv_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean := COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
BEGIN
  IF caller_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.is_admin       IS DISTINCT FROM OLD.is_admin
  OR NEW.can_edit_tags  IS DISTINCT FROM OLD.can_edit_tags
  OR NEW.is_active      IS DISTINCT FROM OLD.is_active
  OR NEW.employee_id    IS DISTINCT FROM OLD.employee_id
  OR NEW.username       IS DISTINCT FROM OLD.username
  OR NEW.id             IS DISTINCT FROM OLD.id
  OR NEW.failed_attempts IS DISTINCT FROM OLD.failed_attempts
  OR NEW.locked_until   IS DISTINCT FROM OLD.locked_until
  THEN
    RAISE EXCEPTION 'Cannot modify privileged columns';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_priv_escalation ON public.profiles;
CREATE TRIGGER profiles_block_priv_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_priv_escalation();

-- 3. Harden function security: set search_path on set_updated_at, revoke EXECUTE from anon/public
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_tags() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_username() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_tags() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_username() TO authenticated;

-- 4. Realtime: restrict realtime.messages so authenticated users cannot subscribe
-- to broadcast/presence channels by default. Postgres change subscriptions
-- continue to be governed by table RLS.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny realtime broadcast/presence by default" ON realtime.messages;
CREATE POLICY "deny realtime broadcast/presence by default"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "deny realtime broadcast/presence writes" ON realtime.messages;
CREATE POLICY "deny realtime broadcast/presence writes"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (false);
