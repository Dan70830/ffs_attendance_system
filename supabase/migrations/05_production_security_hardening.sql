-- Migration 05: Production Security Hardening
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- This migration hardens database-level security and enforces strict integrity constraints.

-- 1. Strictly prevent any user from changing their own role or approved status,
-- and prevent any client from creating or promoting principals.
-- (Only the administrator directly in the Supabase backend/SQL Editor can designate principals).
create or replace function public.enforce_profile_security()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only enforce restrictions for requests coming from client applications (where auth.uid() is present).
  -- Direct backend administrative updates (via SQL Editor, Table Editor, or dashboard) are fully allowed.
  if auth.uid() is not null then
    -- Prevent user from modifying their own role or approved flag
    if auth.uid() = old.id then
      if new.role is distinct from old.role then
        raise exception 'Security violation: You cannot change your own role.';
      end if;
      if new.approved is distinct from old.approved then
        raise exception 'Security violation: You cannot modify your own approval status.';
      end if;
    end if;

    -- Prevent promoting anyone to 'principal' through client updates
    -- Role promotion to principal must be executed directly in the database by an administrator
    if new.role = 'principal' and old.role != 'principal' then
      raise exception 'Security violation: Principals cannot be created from the application.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_security on public.profiles;
create trigger trg_enforce_profile_security
  before update on public.profiles
  for each row execute function public.enforce_profile_security();

-- 2. Enforce: Only principals can delete students (from PROJECT_CONTEXT.md Section 5)
drop policy if exists "Principals can delete students" on public.students;
create policy "Principals can delete students"
  on public.students for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- 3. Enforce: Only principals can delete events
drop policy if exists "Principals can delete events" on public.events;
create policy "Principals can delete events"
  on public.events for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- 4. Attendance data integrity:
-- Ensure attendance records must reference an event and a student
alter table public.attendance 
  alter column event_id set not null;

alter table public.attendance 
  alter column student_id set not null;

-- Ensure a student can only be marked once per event
create unique index if not exists attendance_event_student_unique_idx
  on public.attendance (event_id, student_id);

-- 5. Revoke direct public/anon access from operational tables
revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;

revoke all on public.students from anon;
grant all on public.students to authenticated;

revoke all on public.events from anon;
grant all on public.events to authenticated;

revoke all on public.attendance from anon;
grant all on public.attendance to authenticated;

