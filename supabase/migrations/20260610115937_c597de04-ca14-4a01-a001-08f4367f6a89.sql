
CREATE OR REPLACE FUNCTION public.get_user_phone(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE username = _username AND is_active = true LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_phone(text) TO authenticated;
