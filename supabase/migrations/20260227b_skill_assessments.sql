-- Skill video assessments: workers record video answers, admins review
create table if not exists skill_assessments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references users(id) on delete cascade,
  skill text not null,

  -- The question/scenario shown to the worker (multilingual JSON)
  question jsonb not null,           -- { en: "...", hi: "...", te: "..." }
  expected_answer text not null,     -- Reference answer for admin

  -- Video recording
  video_url text,                     -- Base64 data-url or storage URL
  video_duration_ms integer,

  -- Anti-cheat analysis results (filled by AI analysis)
  analysis jsonb,                     -- { confidence_score, is_reading, tone_analysis, flags[] }

  -- Admin review
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_skill_assessments_worker on skill_assessments(worker_id);
create index if not exists idx_skill_assessments_status on skill_assessments(status);
create index if not exists idx_skill_assessments_skill on skill_assessments(skill);

-- RLS
alter table skill_assessments enable row level security;
