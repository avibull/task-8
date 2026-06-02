
-- ENUMS
create type public.task_priority as enum ('P1','P2','P3','Daily','None');
create type public.alert_type as enum ('normal','urgent');
create type public.alert_trigger as enum ('now','scheduled');
create type public.alert_status as enum ('pending','acknowledged','scheduled');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,
  name text not null,
  username text unique not null,
  phone text not null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- security definer helpers
create or replace function public.current_username()
returns text language sql stable security definer set search_path = public as $$
  select username from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create policy "profiles readable by authenticated" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  priority public.task_priority not null default 'None',
  tags text[] not null default '{}',
  created_by text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_created_by_idx on public.tasks(created_by);
create index tasks_tags_idx on public.tasks using gin(tags);

grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

create policy "see tasks created by me or tagging me" on public.tasks
  for select to authenticated using (
    created_by = public.current_username()
    or ('@' || public.current_username()) = ANY(tags)
  );
create policy "insert own tasks" on public.tasks
  for insert to authenticated with check (created_by = public.current_username());
create policy "update tasks I created or am tagged in" on public.tasks
  for update to authenticated using (
    created_by = public.current_username()
    or ('@' || public.current_username()) = ANY(tags)
  );
create policy "delete tasks I created" on public.tasks
  for delete to authenticated using (created_by = public.current_username());

-- TAGS
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_default boolean not null default false,
  is_user_tag boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.tags to authenticated;
grant all on public.tags to service_role;
alter table public.tags enable row level security;

create policy "tags readable by authenticated" on public.tags
  for select to authenticated using (true);
create policy "authenticated can add custom tags" on public.tags
  for insert to authenticated with check (is_default = false and is_user_tag = false);
create policy "authenticated can delete custom tags" on public.tags
  for delete to authenticated using (is_default = false and is_user_tag = false);

-- ALERTS
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  type public.alert_type not null default 'normal',
  trigger public.alert_trigger not null default 'now',
  scheduled_at timestamptz,
  sender text not null,
  recipient text not null,
  status public.alert_status not null default 'pending',
  sent_at timestamptz default now(),
  ack_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_recipient_idx on public.alerts(recipient);
create index alerts_sender_idx on public.alerts(sender);

grant select, insert, update, delete on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;

create policy "see alerts I sent or received" on public.alerts
  for select to authenticated using (
    sender = public.current_username() or recipient = public.current_username()
  );
create policy "insert alerts I send" on public.alerts
  for insert to authenticated with check (sender = public.current_username());
create policy "ack alerts I received" on public.alerts
  for update to authenticated using (recipient = public.current_username())
  with check (recipient = public.current_username());

-- TRIGGERS: auto-manage @username tag
create or replace function public.on_profile_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tags(name, is_user_tag) values ('@' || NEW.username, true)
  on conflict (name) do nothing;
  return NEW;
end $$;
create trigger trg_profile_insert after insert on public.profiles
  for each row execute function public.on_profile_insert();

create or replace function public.on_profile_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  utag text := '@' || OLD.username;
begin
  update public.tasks set tags = array_remove(tags, utag) where utag = ANY(tags);
  delete from public.tags where name = utag;
  return OLD;
end $$;
create trigger trg_profile_delete after delete on public.profiles
  for each row execute function public.on_profile_delete();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin NEW.updated_at = now(); return NEW; end $$;
create trigger trg_tasks_upd before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger trg_profiles_upd before update on public.profiles
  for each row execute function public.set_updated_at();

-- SEED default tags
insert into public.tags(name, is_default) values
  ('today', true), ('tomorrow', true), ('work', true),
  ('personal', true), ('urgent', true)
on conflict (name) do nothing;

-- REALTIME for alerts
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.tasks;
