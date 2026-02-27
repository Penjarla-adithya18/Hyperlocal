-- ============================================================
-- RLS policies for skill_assessments table
-- + Storage bucket 'uploads' for assessment videos
-- Run AFTER 20260227_skill_assessments.sql
-- ============================================================

-- ── skill_assessments RLS policies ────────────────────────────

-- Drop existing policies if any
drop policy if exists "sa_insert_any"       on skill_assessments;
drop policy if exists "sa_select_own"       on skill_assessments;
drop policy if exists "sa_select_admin"     on skill_assessments;
drop policy if exists "sa_update_admin"     on skill_assessments;
drop policy if exists "sa_update_any"       on skill_assessments;
drop policy if exists "sa_delete_any"       on skill_assessments;
drop policy if exists "sa_insert_anon"      on skill_assessments;

-- Allow any authenticated user (or anon via API route) to INSERT assessments
-- The API route runs server-side with the anon key, so we allow anon inserts
create policy "sa_insert_any" on skill_assessments
  for insert with check (true);

-- Workers can view their own assessments
create policy "sa_select_own" on skill_assessments
  for select using (worker_id = auth.uid());

-- Admin can view all assessments
create policy "sa_select_admin" on skill_assessments
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Allow update from API routes (for analysis pipeline + admin review)
create policy "sa_update_any" on skill_assessments
  for update using (true) with check (true);

-- Allow delete (for cleanup after analysis)
create policy "sa_delete_any" on skill_assessments
  for delete using (true);

-- ── Storage: 'uploads' bucket for assessment videos ───────────

-- Create the uploads bucket (public readable for video playback)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- Anyone can upload to the uploads bucket (API route uses anon key)
drop policy if exists "uploads_insert_any" on storage.objects;
create policy "uploads_insert_any" on storage.objects
  for insert with check (bucket_id = 'uploads');

-- Public read access for assessment videos
drop policy if exists "uploads_select_public" on storage.objects;
create policy "uploads_select_public" on storage.objects
  for select using (bucket_id = 'uploads');

-- Allow delete for cleanup after analysis
drop policy if exists "uploads_delete_any" on storage.objects;
create policy "uploads_delete_any" on storage.objects
  for delete using (bucket_id = 'uploads');
