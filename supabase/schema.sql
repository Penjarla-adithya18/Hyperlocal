-- HyperLocal schema for Supabase
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";
-- Enable pgvector for semantic job matching (requires Supabase Pro or pgvector addon)
-- Run: CREATE EXTENSION IF NOT EXISTS vector;
-- After enabling, the embedding column below will populate via Edge Functions.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone_number text not null unique,
  role text not null check (role in ('worker', 'employer', 'admin')),
  password_hash text,
  profile_completed boolean not null default false,
  trust_score numeric not null default 50,
  trust_level text not null default 'basic' check (trust_level in ('basic','active','trusted')),
  is_verified boolean not null default false,
  company_name text,
  company_description text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists worker_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  skills text[] not null default '{}',
  availability text not null default '',
  experience text,
  categories text[] not null default '{}',
  location text,
  profile_picture_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employer_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  business_name text not null,
  organization_name text,
  location text,
  business_type text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  job_type text not null check (job_type in ('full-time','part-time','gig','freelance')),
  category text not null,
  required_skills text[] not null default '{}',
  location text not null,
  latitude double precision,
  longitude double precision,
  pay numeric not null default 0,
  pay_amount numeric not null default 0,
  pay_type text not null default 'hourly' check (pay_type in ('hourly','fixed')),
  payment_status text not null default 'pending' check (payment_status in ('pending','locked','released','refunded')),
  escrow_amount numeric,
  escrow_required boolean not null default false,
  timing text not null default 'Flexible',
  duration text,
  experience_required text default 'entry',
  requirements text,
  benefits text,
  slots integer default 1,
  start_date date,
  status text not null default 'active' check (status in ('draft','active','filled','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  application_count integer not null default 0,
  views integer not null default 0,
  -- pgvector embedding for semantic AI matching (1536 dims for text-embedding-3-small)
  -- Uncomment after enabling pgvector extension:
  -- embedding vector(1536)
);

-- Uncomment to add vector similarity search index after enabling pgvector:
-- CREATE INDEX ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  worker_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','completed')),
  match_score numeric not null default 0,
  cover_message text,
  cover_letter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null,
  worker_id uuid,
  employer_id uuid,
  job_id uuid,
  application_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_id uuid references users(id) on delete set null,
  reported_user_id uuid references users(id) on delete set null,
  reported_job_id uuid references jobs(id) on delete set null,
  type text,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  employer_id uuid not null references users(id) on delete cascade,
  worker_id uuid not null references users(id) on delete cascade,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','held','released','refunded')),
  commission numeric default 0,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  refunded_at timestamptz
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists trust_scores (
  user_id uuid primary key references users(id) on delete cascade,
  score numeric not null default 50,
  level text not null default 'basic' check (level in ('basic','active','trusted')),
  job_completion_rate numeric not null default 0,
  average_rating numeric not null default 0,
  total_ratings integer not null default 0,
  complaint_count integer not null default 0,
  successful_payments integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('job_match','application','message','payment','rating','system')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_employer on jobs(employer_id);
create index if not exists idx_applications_worker on applications(worker_id);
create index if not exists idx_applications_job on applications(job_id);
create unique index if not exists idx_applications_unique on applications(job_id, worker_id);
create index if not exists idx_chat_messages_conversation on chat_messages(conversation_id);
create index if not exists idx_reports_status on reports(status);
create index if not exists idx_user_sessions_user on user_sessions(user_id);
create index if not exists idx_user_sessions_token on user_sessions(token);
create index if not exists idx_trust_scores_user on trust_scores(user_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_ratings_to_user on ratings(to_user_id);

-- OTP verifications (used by WATI edge function)
create table if not exists otp_verifications (
  phone_number text primary key,
  otp_code text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

-- Function used by applications edge function to increment job application count
create or replace function increment_application_count(job_id uuid)
returns void language plpgsql as $$
begin
  update jobs set application_count = application_count + 1 where id = job_id;
end;
$$;

alter table users enable row level security;
alter table worker_profiles enable row level security;
alter table employer_profiles enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table reports enable row level security;
alter table escrow_transactions enable row level security;
alter table user_sessions enable row level security;
alter table trust_scores enable row level security;
alter table ratings enable row level security;
alter table notifications enable row level security;

-- ─── Scheduled Jobs (pg_cron) ────────────────────────────────────────────────
-- Enable pg_cron in Supabase dashboard: Extensions → pg_cron → Enable
-- Then run the following in the Supabase SQL editor:
--
-- 1. Recalculate trust scores nightly at 2 AM UTC
-- SELECT cron.schedule(
--   'trust-score-refresh',
--   '0 2 * * *',
--   $$
--     UPDATE trust_scores ts
--     SET
--       rating_score = LEAST(30, COALESCE((
--         SELECT AVG(rating) * 6 FROM ratings WHERE to_user_id = ts.user_id
--       ), 0)),
--       completion_bonus = LEAST(20, (
--         SELECT COUNT(*) * 4 FROM applications
--         WHERE worker_id = ts.user_id AND status = 'completed'
--       )),
--       updated_at = now()
--     WHERE true;
--     UPDATE users u
--     SET trust_score = LEAST(100, 50 + ts.rating_score + ts.completion_bonus),
--         trust_level = CASE
--           WHEN LEAST(100, 50 + ts.rating_score + ts.completion_bonus) >= 80 THEN 'trusted'
--           WHEN LEAST(100, 50 + ts.rating_score + ts.completion_bonus) >= 60 THEN 'active'
--           ELSE 'basic'
--         END
--     FROM trust_scores ts
--     WHERE u.id = ts.user_id;
--   $$
-- );
--
-- 2. Auto-expire jobs older than 30 days that are still active
-- SELECT cron.schedule(
--   'job-auto-expire',
--   '0 0 * * *',
--   $$
--     UPDATE jobs
--     SET status = 'cancelled'
--     WHERE status = 'active'
--       AND created_at < now() - interval '30 days';
--   $$
-- );
--
-- 3. Clean up expired OTP records hourly
-- SELECT cron.schedule(
--   'otp-cleanup',
--   '0 * * * *',
--   $$
--     DELETE FROM otp_verifications WHERE expires_at < now();
--   $$
-- );
