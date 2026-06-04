
-- 1. Role enum and column
create type public.user_role as enum ('regular', 'manager', 'admin');

alter table public.profiles add column role public.user_role not null default 'regular';

update public.profiles set role = 'admin' where is_admin = true;

alter table public.profiles drop column is_admin;

-- 2. Helper functions
create or replace function public.has_role(_role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = _role)
$$;

create or replace function public.current_role_value()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_manager_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('manager','admin') from public.profiles where id = auth.uid()), false)
$$;

-- 3. Tag RLS — replace default-lock with role-based gating
drop policy if exists "authenticated can add custom tags" on public.tags;
drop policy if exists "authenticated can delete custom tags" on public.tags;

create policy "managers can add tags" on public.tags
  for insert to authenticated
  with check (is_user_tag = false and public.is_manager_or_admin());

create policy "managers can delete tags" on public.tags
  for delete to authenticated
  using (is_user_tag = false and public.is_manager_or_admin());

-- 4. Profile role-change protection — only admins can change roles; users may update own row otherwise
create or replace function public.guard_profile_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.role is distinct from OLD.role and not public.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_profile_role_change on public.profiles;
create trigger trg_guard_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();
