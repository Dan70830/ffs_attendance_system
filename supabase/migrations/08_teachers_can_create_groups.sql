-- Migration 08: Allow approved Teachers (in addition to Principals) to create and update student groups
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

drop policy if exists "Principals can insert student groups" on public.student_groups;
drop policy if exists "Approved users can insert student groups" on public.student_groups;

create policy "Approved users can insert student groups"
  on public.student_groups for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );

drop policy if exists "Principals can update student groups" on public.student_groups;
drop policy if exists "Approved users can update student groups" on public.student_groups;

create policy "Approved users can update student groups"
  on public.student_groups for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and approved = true
    )
  );
