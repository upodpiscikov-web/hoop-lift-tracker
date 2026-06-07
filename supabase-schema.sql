create table if not exists public.training_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_date date not null,
  basketball boolean not null default false,
  lifting boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, training_date)
);

create table if not exists public.shooting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  shot_type text not null,
  spot text not null,
  made integer not null check (made >= 0),
  taken integer not null check (taken > 0),
  created_at timestamptz not null default now(),
  check (made <= taken)
);

create table if not exists public.lifting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  exercise text not null,
  weight numeric not null check (weight >= 0),
  reps integer not null check (reps > 0),
  created_at timestamptz not null default now()
);

alter table public.training_days enable row level security;
alter table public.shooting_sessions enable row level security;
alter table public.lifting_sessions enable row level security;

drop policy if exists "Users can view own training days" on public.training_days;
drop policy if exists "Users can insert own training days" on public.training_days;
drop policy if exists "Users can update own training days" on public.training_days;
drop policy if exists "Users can delete own training days" on public.training_days;

create policy "Users can view own training days"
on public.training_days for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own training days"
on public.training_days for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own training days"
on public.training_days for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own training days"
on public.training_days for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own shooting sessions" on public.shooting_sessions;
drop policy if exists "Users can insert own shooting sessions" on public.shooting_sessions;
drop policy if exists "Users can delete own shooting sessions" on public.shooting_sessions;

create policy "Users can view own shooting sessions"
on public.shooting_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own shooting sessions"
on public.shooting_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete own shooting sessions"
on public.shooting_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own lifting sessions" on public.lifting_sessions;
drop policy if exists "Users can insert own lifting sessions" on public.lifting_sessions;
drop policy if exists "Users can delete own lifting sessions" on public.lifting_sessions;

create policy "Users can view own lifting sessions"
on public.lifting_sessions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own lifting sessions"
on public.lifting_sessions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete own lifting sessions"
on public.lifting_sessions for delete
to authenticated
using ((select auth.uid()) = user_id);
