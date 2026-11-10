-- Migration: Add email to profiles and enable disapproval/rejection
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- 1. Add email column to profiles
alter table public.profiles 
  add column if not exists email text;

-- 2. Populate email for all existing profiles from auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 3. Update automatic profile creation trigger to include email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, approved, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Teacher'),
    new.email,
    'teacher',
    false,
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case 
        when public.profiles.full_name is null or public.profiles.full_name = '' 
        then excluded.full_name 
        else public.profiles.full_name 
      end;
  return new;
end;
$$;

-- 4. Allow principals to delete/reject unapproved profile requests
drop policy if exists "Principals can delete unapproved profiles" on public.profiles;

create policy "Principals can delete unapproved profiles"
  on public.profiles for delete
  to authenticated
  using (
    auth.uid() != id
    and approved = false
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

