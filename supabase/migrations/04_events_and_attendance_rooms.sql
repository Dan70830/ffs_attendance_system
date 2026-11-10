-- Migration: Events and Attendance Rooms
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- 1. Create the events table
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

-- 2. Add event_id column to attendance table if missing
alter table public.attendance 
  add column if not exists event_id uuid references public.events(id) on delete cascade;

-- 3. Migrate existing attendance rows without an event:
-- Creates one closed event per distinct date and links those rows to it
do $$
declare
  r record;
  v_event_id uuid;
  v_creator_id uuid;
begin
  -- Select an approved teacher/principal as creator
  select id into v_creator_id from public.profiles where approved = true limit 1;

  for r in 
    select distinct attendance_date 
    from public.attendance 
    where event_id is null and attendance_date is not null
  loop
    insert into public.events (title, event_date, status, created_by, opened_at, closed_at)
    values (
      'Class Attendance (' || to_char(r.attendance_date, 'YYYY-MM-DD') || ')',
      r.attendance_date,
      'closed',
      v_creator_id,
      r.attendance_date::timestamptz,
      r.attendance_date::timestamptz
    )
    returning id into v_event_id;

    update public.attendance
    set event_id = v_event_id
    where event_id is null and attendance_date = r.attendance_date;
  end loop;
end $$;

-- 4. Unique constraint: a student can be marked only once per event
create unique index if not exists attendance_event_student_unique_idx
  on public.attendance (event_id, student_id)
  where event_id is not null;

-- 5. Database constraint: Only one attendance room may be open at a time
create unique index if not exists only_one_open_room_idx
  on public.events ((status))
  where status = 'open';

-- 6. Trigger: A check-in can only be inserted if its event's status is 'open'
create or replace function public.check_event_is_open()
returns trigger
language plpgsql
security definer
as $$
declare
  v_status text;
begin
  select status into v_status from public.events where id = new.event_id;
  if v_status is null then
    raise exception 'Event not found.';
  end if;
  if v_status != 'open' then
    raise exception 'Cannot mark attendance. The attendance room is not open.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_event_is_open on public.attendance;
create trigger trg_check_event_is_open
  before insert on public.attendance
  for each row execute function public.check_event_is_open();

-- 7. Row Level Security on events
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

-- 8. Row Level Security on attendance
alter table public.attendance enable row level security;

drop policy if exists "Approved users can read attendance" on public.attendance;
drop policy if exists "Approved users can insert attendance" on public.attendance;
drop policy if exists "Approved users can delete attendance" on public.attendance;

create policy "Approved users can read attendance"
  on public.attendance for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and approved = true));

create policy "Approved users can insert attendance"
  on public.attendance for insert to authenticated
  with check (
    marked_by = auth.uid()
    and exists (
      select 1 from public.events 
      where id = event_id and status = 'open'
    )
    and exists (
      select 1 from public.profiles 
      where id = auth.uid() and approved = true
    )
  );

create policy "Approved users can delete attendance"
  on public.attendance for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and approved = true));

