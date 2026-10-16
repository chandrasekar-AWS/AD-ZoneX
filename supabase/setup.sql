-- AD ZONEX — run this ONCE in Supabase → SQL Editor → New query → Run.

-- 1) Table for enquiries, gallery, reviews, service edits, backups, login lock-outs.
create table if not exists public.kv_store (
  key         text primary key,
  value       jsonb       not null,
  updated_at  timestamptz not null default now()
);

-- Lock it down: with RLS on and NO policies, the public/anon key can read and
-- write NOTHING. Only the website's server (service role key) can access it.
alter table public.kv_store enable row level security;
revoke all on public.kv_store from anon, authenticated;

-- 2) Private bucket for uploaded photos (served through /api/media/<id>).
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- 3) Extra lock-down (safe to run again). Nothing in the browser should ever talk to the database directly:
--    the website's server uses the service_role key, which bypasses these rules on purpose.
alter table public.kv_store force row level security;
revoke all on public.kv_store from public;
drop policy if exists "no public access" on public.kv_store;

-- Photos: the bucket must stay PRIVATE (photos are served through /api/media/<id>).
update storage.buckets set public = false where id = 'media';
-- No policies on storage.objects for anon/authenticated = no direct access to the files.
-- Check: Supabase → Storage → media should show a "Private" badge, and
-- Authentication → Policies should list NO policy for kv_store or the media bucket.
