-- =============================================================
-- HyperLocal — Row Level Security Policies
-- Run AFTER schema.sql in the Supabase SQL Editor
-- =============================================================
-- Strategy:
--   • Edge Functions use service-role key → bypass RLS (safe)
--   • Direct browser/anon access is locked down per role
--   • users: can read own row; admin reads all
--   • jobs: active jobs are public-readable; write = employer only
--   • applications: worker sees own; employer sees for their jobs
--   • chat: only participants can read/write
-- =============================================================

-- ── Helper function: get current user's role ──────────────────
create or replace function get_my_role()
returns text language sql stable
as $$
  select role from users where id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "users_select_own"     on users;
drop policy if exists "users_select_admin"   on users;
drop policy if exists "users_update_own"     on users;

-- Any authenticated user can read their own record
create policy "users_select_own" on users
  for select using (id = auth.uid());

-- Admin can read all users
create policy "users_select_admin" on users
  for select using (get_my_role() = 'admin');

-- User can update their own record
create policy "users_update_own" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- WORKER PROFILES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "wp_select_any"     on worker_profiles;
drop policy if exists "wp_insert_own"     on worker_profiles;
drop policy if exists "wp_update_own"     on worker_profiles;

-- Any authenticated user can view worker profiles (needed for job matching)
create policy "wp_select_any" on worker_profiles
  for select using (auth.uid() is not null);

-- Worker can create/update their own profile
create policy "wp_insert_own" on worker_profiles
  for insert with check (user_id = auth.uid());

create policy "wp_update_own" on worker_profiles
  for update using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- EMPLOYER PROFILES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "ep_select_any"   on employer_profiles;
drop policy if exists "ep_insert_own"   on employer_profiles;
drop policy if exists "ep_update_own"   on employer_profiles;

create policy "ep_select_any" on employer_profiles
  for select using (auth.uid() is not null);

create policy "ep_insert_own" on employer_profiles
  for insert with check (user_id = auth.uid());

create policy "ep_update_own" on employer_profiles
  for update using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- JOBS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "jobs_select_active"   on jobs;
drop policy if exists "jobs_select_own"      on jobs;
drop policy if exists "jobs_select_admin"    on jobs;
drop policy if exists "jobs_insert_employer" on jobs;
drop policy if exists "jobs_update_own"      on jobs;
drop policy if exists "jobs_delete_own"      on jobs;

-- Anyone can see active jobs
create policy "jobs_select_active" on jobs
  for select using (status = 'active');

-- Employer can see all their own jobs (any status)
create policy "jobs_select_own" on jobs
  for select using (employer_id = auth.uid());

-- Admin can see all jobs
create policy "jobs_select_admin" on jobs
  for select using (get_my_role() = 'admin');

-- Only employers can create jobs
create policy "jobs_insert_employer" on jobs
  for insert with check (
    employer_id = auth.uid()
    and get_my_role() in ('employer', 'admin')
  );

-- Employer can update their own jobs
create policy "jobs_update_own" on jobs
  for update using (employer_id = auth.uid());

-- Employer can delete their own draft/cancelled jobs
create policy "jobs_delete_own" on jobs
  for delete using (
    employer_id = auth.uid()
    and status in ('draft', 'cancelled')
  );

-- ─────────────────────────────────────────────────────────────
-- APPLICATIONS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "app_select_worker"   on applications;
drop policy if exists "app_select_employer" on applications;
drop policy if exists "app_select_admin"    on applications;
drop policy if exists "app_insert_worker"   on applications;
drop policy if exists "app_update_employer" on applications;

-- Worker sees their own applications
create policy "app_select_worker" on applications
  for select using (worker_id = auth.uid());

-- Employer sees applications for their jobs
create policy "app_select_employer" on applications
  for select using (
    exists (
      select 1 from jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

-- Admin sees all
create policy "app_select_admin" on applications
  for select using (get_my_role() = 'admin');

-- Worker can submit applications
create policy "app_insert_worker" on applications
  for insert with check (
    worker_id = auth.uid()
    and get_my_role() = 'worker'
  );

-- Employer can update application status (accept/reject/complete)
create policy "app_update_employer" on applications
  for update using (
    exists (
      select 1 from jobs
      where jobs.id = applications.job_id
        and jobs.employer_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- CHAT CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "conv_select_participant" on chat_conversations;
drop policy if exists "conv_insert_worker"      on chat_conversations;

-- Only participants can view the conversation
create policy "conv_select_participant" on chat_conversations
  for select using (auth.uid() = any(participants));

-- Worker or employer can create a conversation
create policy "conv_insert_worker" on chat_conversations
  for insert with check (auth.uid() = any(participants));

-- ─────────────────────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "msg_select_participant" on chat_messages;
drop policy if exists "msg_insert_participant" on chat_messages;

create policy "msg_select_participant" on chat_messages
  for select using (
    exists (
      select 1 from chat_conversations cc
      where cc.id = chat_messages.conversation_id
        and auth.uid() = any(cc.participants)
    )
  );

create policy "msg_insert_participant" on chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from chat_conversations cc
      where cc.id = chat_messages.conversation_id
        and auth.uid() = any(cc.participants)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "reports_select_own"   on reports;
drop policy if exists "reports_select_admin" on reports;
drop policy if exists "reports_insert_auth"  on reports;

create policy "reports_select_own" on reports
  for select using (reporter_id = auth.uid());

create policy "reports_select_admin" on reports
  for select using (get_my_role() = 'admin');

create policy "reports_insert_auth" on reports
  for insert with check (reporter_id = auth.uid());

create policy "reports_update_admin" on reports
  for update using (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- ESCROW TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "escrow_select_party" on escrow_transactions;
drop policy if exists "escrow_select_admin" on escrow_transactions;

create policy "escrow_select_party" on escrow_transactions
  for select using (
    employer_id = auth.uid() or worker_id = auth.uid()
  );

create policy "escrow_select_admin" on escrow_transactions
  for select using (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- TRUST SCORES
-- ─────────────────────────────────────────────────────────────
drop policy if exists "ts_select_any" on trust_scores;

-- Trust scores are public (needed for job matching UI)
create policy "ts_select_any" on trust_scores
  for select using (auth.uid() is not null);

-- ─────────────────────────────────────────────────────────────
-- RATINGS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "ratings_select_any"  on ratings;
drop policy if exists "ratings_insert_auth" on ratings;

create policy "ratings_select_any" on ratings
  for select using (auth.uid() is not null);

create policy "ratings_insert_auth" on ratings
  for insert with check (from_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "notif_select_own"  on notifications;
drop policy if exists "notif_update_own"  on notifications;

create policy "notif_select_own" on notifications
  for select using (user_id = auth.uid());

create policy "notif_update_own" on notifications
  for update using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- USER SESSIONS
-- ─────────────────────────────────────────────────────────────
drop policy if exists "sessions_select_own" on user_sessions;

create policy "sessions_select_own" on user_sessions
  for select using (user_id = auth.uid());

-- =============================================================
-- Done. All tables secured with RLS policies.
-- Edge Functions use service-role key and bypass these policies.
-- =============================================================
