-- Migration 09: Only Principals can close an open room or reopen a closed room.
-- Both Principals and approved Teachers can open a 'scheduled' room.
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

create or replace function public.enforce_event_status_permissions()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_approved boolean;
begin
  -- Only enforce for authenticated client requests
  if auth.uid() is not null and new.status is distinct from old.status then
    select role, approved into v_role, v_approved
    from public.profiles
    where id = auth.uid();

    if coalesce(v_approved, false) = false then
      raise exception 'Permission denied: Your account is not approved.';
    end if;

    -- Closing an open room is Principal-only
    if old.status = 'open' and new.status = 'closed' and v_role <> 'principal' then
      raise exception 'Permission denied: Only the Principal can close an attendance room.';
    end if;

    -- Reopening a closed room is Principal-only
    if old.status = 'closed' and new.status = 'open' and v_role <> 'principal' then
      raise exception 'Permission denied: Only the Principal can reopen a closed attendance room.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_event_status_permissions on public.events;
create trigger trg_enforce_event_status_permissions
  before update on public.events
  for each row execute function public.enforce_event_status_permissions();
