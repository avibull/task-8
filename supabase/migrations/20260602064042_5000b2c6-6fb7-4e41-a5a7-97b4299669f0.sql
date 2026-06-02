
revoke execute on function public.current_username() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.on_profile_insert() from public, anon, authenticated;
revoke execute on function public.on_profile_delete() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.current_username() to authenticated;
grant execute on function public.is_admin() to authenticated;
