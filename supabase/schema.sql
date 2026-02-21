-- HyperLocal schema for Supabase
-- Run in Supabase SQL editor

create extension if not exists "pgcrypto";

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
  views integer not null default 0
);

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

create index if not exists idx_jobs_employer on jobs(employer_id);
create index if not exists idx_applications_worker on applications(worker_id);
create index if not exists idx_applications_job on applications(job_id);
create index if not exists idx_chat_messages_conversation on chat_messages(conversation_id);
create index if not exists idx_reports_status on reports(status);
create index if not exists idx_user_sessions_user on user_sessions(user_id);
create index if not exists idx_user_sessions_token on user_sessions(token);
