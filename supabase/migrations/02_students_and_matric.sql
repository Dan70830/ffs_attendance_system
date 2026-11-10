-- Migration: Matric numbers uniqueness and student attendance history
-- Run this in your Supabase SQL Editor

-- 1. Ensure students table has active and detail defaults
alter table public.students 
  alter column active set default true;

-- 2. Case-insensitive unique index for matric numbers (ignores null and empty strings)
create unique index if not exists students_matric_no_unique_idx
  on public.students (lower(trim(matric_no)))
  where matric_no is not null and trim(matric_no) != '';

-- 3. Ensure events table exists for attendance history linkage
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'open', 'closed')),
  created_by uuid references auth.users(id),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Ensure attendance references events
alter table public.attendance 
  add column if not exists event_id uuid references public.events(id);

create unique index if not exists attendance_event_student_unique_idx
  on public.attendance (event_id, student_id)
  where event_id is not null;

-- 5. RLS policies for events
alter table public.events enable row level security;

drop policy if exists "Approved users can read events" on public.events;
drop policy if exists "Approved users can insert events" on public.events;
drop policy if exists "Approved users can update events" on public.events;

create policy "Approved users can read events"
  on public.events for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and approved = true));

create policy "Approved users can insert events"
  on public.events for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and approved = true));

create policy "Approved users can update events"
  on public.events for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and approved = true));

