-- Migration 07: Student Groups and Group-Based Attendance Tracking
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- 1. Create the student_groups table
create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#0b5d5b',
  lead_teacher_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive unique group name for active groups
create unique index if not exists student_groups_name_unique_idx
  on public.student_groups (lower(trim(name)))
  where active = true;

create index if not exists student_groups_lead_teacher_idx
  on public.student_groups (lead_teacher_id);

-- 2. Add group_id to students table (represents student's current active group)
alter table public.students
  add column if not exists group_id uuid references public.student_groups(id) on delete set null;

create index if not exists students_group_id_idx
  on public.students (group_id);

-- 3. Add group_id to attendance table (preserves historical group at the time of check-in)
alter table public.attendance
  add column if not exists group_id uuid references public.student_groups(id) on delete set null;

create index if not exists attendance_group_id_idx
  on public.attendance (group_id);

-- 4. Automatic historical snapshot trigger on attendance
-- When attendance is inserted (e.g. from kiosk), automatically record the student's current group
create or replace function public.snapshot_attendance_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.group_id is null and new.student_id is not null then
    select group_id into new.group_id
    from public.students
    where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_attendance_group on public.attendance;
create trigger trg_snapshot_attendance_group
  before insert on public.attendance
  for each row execute function public.snapshot_attendance_group();

-- 5. Row Level Security on student_groups
alter table public.student_groups enable row level security;

drop policy if exists "Approved users can read student groups" on public.student_groups;
drop policy if exists "Principals can insert student groups" on public.student_groups;
drop policy if exists "Principals can update student groups" on public.student_groups;
drop policy if exists "Principals can delete student groups" on public.student_groups;

-- All approved teachers and principals can read student groups
create policy "Approved users can read student groups"
  on public.student_groups for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

-- Only principals can insert new groups
create policy "Principals can insert student groups"
  on public.student_groups for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- Only principals can update student groups
create policy "Principals can update student groups"
  on public.student_groups for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- Only principals can delete or soft-delete student groups
create policy "Principals can delete student groups"
  on public.student_groups for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'principal' and approved = true
    )
  );

-- 6. Grant appropriate permissions
revoke all on public.student_groups from anon;
grant select, insert, update, delete on public.student_groups to authenticated;
