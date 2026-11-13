-- Migration 06: Allow retrieving principal contact emails for teacher registration approval
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

create or replace function public.get_principal_emails()
returns table (full_name text, email text)
language sql
security definer set search_path = public
as $$
  select full_name, email
  from public.profiles
  where role = 'principal' 
    and approved = true 
    and email is not null 
    and email != '';
$$;

-- Grant execution to both anon (signup screen) and authenticated users (waiting screen)
grant execute on function public.get_principal_emails() to anon, authenticated;
