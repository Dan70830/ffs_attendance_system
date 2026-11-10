-- Migration: Teacher sign-up, approval, and roles
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- 1. Add approved column to profiles
alter table public.profiles 
  add column if not exists approved boolean not null default false;

-- 2. Ensure role has a default of 'teacher'
alter table public.profiles 
  alter column role set default 'teacher';

-- 3. Automatic profile creation trigger on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, approved, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Teacher'),
    'teacher',
    false,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security on profiles
alter table public.profiles enable row level security;

-- Drop existing policies if any to avoid duplicates
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own name only" on public.profiles;
drop policy if exists "Principals can update other teachers" on public.profiles;

-- Authenticated users can view all profiles (needed to display teacher names)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can insert their own profile with role='teacher' and approved=false
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'teacher'
    and approved = false
  );

-- Users can update their own full_name, but NEVER their own role or approved status
create policy "Users can update their own name only"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and approved = (select p.approved from public.profiles p where p.id = auth.uid())
  );

-- Principals can manage other teachers' access (approval), but CANNOT change roles
create policy "Principals can update other teachers"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() != id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  )
  with check (
    auth.uid() != id
    and role = 'teacher'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- 5. Row Level Security on students (only approved users can read or write)
alter table public.students enable row level security;

drop policy if exists "Approved users can read students" on public.students;
drop policy if exists "Approved users can insert students" on public.students;
drop policy if exists "Approved users can update students" on public.students;

create policy "Approved users can read students"
  on public.students for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

create policy "Approved users can insert students"
  on public.students for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

create policy "Approved users can update students"
  on public.students for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

-- 6. Helper: Set up the 2 designated principals directly in the database:
-- Replace with the 2 principals' account emails:
-- update public.profiles
-- set role = 'principal', approved = true
-- where id in (
--   select id from auth.users 
--   where email in ('first_principal@example.com', 'second_principal@example.com')
-- );
