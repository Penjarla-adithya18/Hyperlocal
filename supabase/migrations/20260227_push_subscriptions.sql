-- Web Push subscription storage
-- Run in Supabase SQL editor after enabling push notifications

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Users can only manage their own push subscriptions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'push_subs_select' AND tablename = 'push_subscriptions') THEN
    CREATE POLICY "push_subs_select" ON push_subscriptions FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'push_subs_insert' AND tablename = 'push_subscriptions') THEN
    CREATE POLICY "push_subs_insert" ON push_subscriptions FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'push_subs_delete' AND tablename = 'push_subscriptions') THEN
    CREATE POLICY "push_subs_delete" ON push_subscriptions FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Add 'report_action' notification type if not already present
-- (alter check constraint to add new type)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('job_match','application','message','payment','rating','system','report_action'));
