-- ============================================================
-- Fix: RLS stack-depth recursion (Postgres error 54001)
--
-- Root cause: sa_select_admin policy on skill_assessments uses
--   exists (select 1 from users where id = auth.uid() and role = 'admin')
-- This triggers the users table's own RLS policies, which may in turn
-- query other tables, causing policy-chain recursion until Postgres
-- hits the stack depth limit.
--
-- Fix: Wrap the admin check in a SECURITY DEFINER function.
-- SECURITY DEFINER bypasses RLS when executing the function body,
-- breaking the recursion chain entirely.
-- ============================================================

-- ── is_admin() helper ────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer        -- runs as function owner, bypasses RLS
stable                  -- same result within a transaction
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
  )
$$;

-- ── Patch sa_select_admin on skill_assessments ───────────────────────────────
drop policy if exists "sa_select_admin" on skill_assessments;
create policy "sa_select_admin" on skill_assessments
  for select using (public.is_admin());

-- ── Also patch any other tables that use the same inline admin sub-query ─────
-- notifications
drop policy if exists "notifications_select_admin" on notifications;
create policy "notifications_select_admin" on notifications
  for select using (
    user_id = auth.uid() or public.is_admin()
  );
