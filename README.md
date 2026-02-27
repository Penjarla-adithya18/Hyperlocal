# HyperLocal AI Job & Skill Matching Platform

A full-stack job matching platform for Tier-2 and Tier-3 cities in India, connecting workers with employers through AI-powered recommendations, real-time chat, escrow payments, and WhatsApp OTP authentication.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | 11 Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL + Row-Level Security |
| Auth | Custom PBKDF2 (210 000 iterations, SHA-256) |
| OTP | WATI WhatsApp Business API |
| Real-time | Supabase Realtime (chat) |
| Icons | Lucide React |
| Analytics | Vercel Analytics |

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Create .env.local
cp .env.example .env.local   # then fill in values below

# 3. Run the dev server
pnpm dev

# 4. Open http://localhost:3000
```

### Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Database Setup

1. Go to **Supabase Dashboard → SQL Editor**
2. Run `supabase/schema.sql` to create tables, RLS policies, and functions
3. Run `supabase/seed.sql` to load sample data (32 users, jobs, applications, etc.)

All seed users have the password **`Password@123`**.

### Deploy Edge Functions

```bash
supabase functions deploy auth --no-verify-jwt
supabase functions deploy users --no-verify-jwt
supabase functions deploy jobs --no-verify-jwt
supabase functions deploy applications --no-verify-jwt
supabase functions deploy chat --no-verify-jwt
supabase functions deploy profiles --no-verify-jwt
supabase functions deploy escrow --no-verify-jwt
supabase functions deploy reports --no-verify-jwt
supabase functions deploy trust-scores --no-verify-jwt
supabase functions deploy admin --no-verify-jwt
supabase functions deploy wati --no-verify-jwt
```

### Optional — WATI WhatsApp OTP

Set these as Supabase secrets for live OTP:

```bash
supabase secrets set WATI_API_URL=https://live-mt-server.wati.io
supabase secrets set WATI_API_TOKEN=<your-wati-token>
```

---

## Project Structure

```
├── app/                              # Next.js App Router (19 routes)
│   ├── page.tsx                      # Landing page
│   ├── layout.tsx                    # Root layout (AuthProvider + Toaster)
│   ├── login/ signup/ forgot-password/
│   ├── worker/                       # Worker pages (6)
│   │   ├── dashboard/ profile/ jobs/ jobs/[id]/ applications/ chat/
│   ├── employer/                     # Employer pages (6)
│   │   ├── dashboard/ jobs/ jobs/post/ jobs/[id]/ jobs/[id]/edit/ chat/
│   └── admin/                        # Admin pages (3)
│       ├── dashboard/ users/ reports/
├── lib/
│   ├── api.ts                        # API client — calls edge functions, exports db facade
│   ├── types.ts                      # All TypeScript interfaces & enums
│   ├── auth.ts                       # sendOTP / verifyOTP (WATI integration)
│   ├── aiMatching.ts                 # AI skill extraction & job matching
│   ├── escrowService.ts              # Escrow payment helpers
│   └── supabase/
│       ├── client.ts                 # Supabase browser client
│       └── mappers.ts                # DB row → app type mappers
├── components/
│   ├── admin/AdminNav.tsx
│   ├── employer/EmployerNav.tsx
│   ├── worker/WorkerNav.tsx
│   └── ui/                           # 70+ shadcn/ui components
├── contexts/
│   └── AuthContext.tsx                # Global auth state + role guards
├── supabase/
│   ├── schema.sql                    # Tables, RLS policies, functions
│   ├── seed.sql                      # Sample data (32 users)
│   └── functions/                    # 11 Edge Functions + _shared/
│       ├── _shared/                  # cors.ts, auth.ts, crypto.ts
│       ├── auth/                     # Register, login, reset-password
│       ├── users/                    # CRUD users
│       ├── jobs/                     # CRUD jobs + search
│       ├── applications/             # Apply, accept, reject
│       ├── chat/                     # Conversations + messages
│       ├── profiles/                 # Worker & employer profiles
│       ├── escrow/                   # Escrow transactions
│       ├── reports/                  # Content reports
│       ├── trust-scores/             # Trust score calculation
│       ├── admin/                    # Admin stats & actions
│       └── wati/                     # WhatsApp OTP via WATI
└── hooks/ contexts/ public/
```

---

## Architecture

```
┌──────────────┐    HTTPS/JSON    ┌──────────────────────┐
│  Next.js App │ ───────────────► │  Supabase Edge Fns   │
│  (React 19)  │ ◄─────────────── │  (Deno runtime)      │
│              │                  │                      │
│  lib/api.ts  │                  │  _shared/auth.ts     │
│  call<T>()   │                  │  _shared/crypto.ts   │
└──────────────┘                  └──────────┬───────────┘
                                             │
                                  ┌──────────▼───────────┐
                                  │  Supabase PostgreSQL  │
                                  │  + RLS Policies       │
                                  │  + Realtime           │
                                  └───────────────────────┘
```

All frontend API calls go through `lib/api.ts` which exports:
- `db` — main database operations interface
- `userOps`, `jobOps`, `applicationOps`, `escrowOps`, etc. — typed CRUD helpers
- `registerUser()`, `loginUser()`, `resetPassword()` — auth functions

---

## Features

### Workers
- Phone-based registration with WhatsApp OTP
- Profile with skills, experience, availability, location
- AI-powered job recommendations (match score 0–100%)
- Advanced job search with filters (type, location, pay, skills)
- One-click applications with cover letter
- Application tracking dashboard
- Real-time chat with employers
- Trust score and earnings overview

### Employers
- Business profile management
- Rich job posting (title, description, skills, pay, location, type)
- Job management (edit, close, delete)
- AI-matched candidate recommendations
- Application review (accept/reject)
- Real-time chat with applicants
- Escrow payment system
- Free tier: 3 job posts; limits enforced server-side

### Admins
- Platform statistics (users, jobs, applications, revenue)
- User management (verify, ban, suspend, activate)
- Content report handling (review, resolve, dismiss)

---

## Data Model

| Entity | Key Fields |
|--------|-----------|
| `User` | id, fullName, phoneNumber, role, isVerified, trustLevel |
| `WorkerProfile` | userId, skills[], experience, availability, location |
| `EmployerProfile` | userId, businessName, industry, location |
| `Job` | id, employerId, title, skills[], jobType, salary, status |
| `Application` | id, jobId, workerId, status, matchScore, coverLetter |
| `ChatConversation` | id, participants[], lastMessage |
| `ChatMessage` | id, conversationId, senderId, content, timestamp |
| `EscrowTransaction` | id, jobId, employerId, workerId, amount, status |
| `TrustScore` | userId, score, completedJobs, avgRating, disputes |
| `Report` | id, reportedBy, targetId, reason, status |

---

## Security

- **PBKDF2** password hashing (210 000 iterations, SHA-256) in edge functions
- **Row-Level Security** on all tables — users see only their own data
- **JWT session tokens** issued by the auth edge function
- **Chat safety filters** — profanity and PII detection before message storage
- **Role-based route guards** in `AuthContext.tsx`
- **Employer job posting limits** enforced at the edge function level

---

## AI Matching

`lib/aiMatching.ts` provides:
- **Skill extraction** from free-text job descriptions using keyword matching
- **Match scoring** combining skill overlap, location proximity, experience fit, and availability
- **Fraud detection** scoring for suspicious job postings
- **Trust score calculation** based on completed jobs, ratings, disputes, on-time completion

---

## Routes

| Path | Role | Description |
|------|------|------------|
| `/` | Public | Landing page |
| `/signup` | Public | Registration |
| `/login` | Public | Login |
| `/forgot-password` | Public | Password reset |
| `/worker/dashboard` | Worker | Dashboard & stats |
| `/worker/profile` | Worker | Edit profile & skills |
| `/worker/jobs` | Worker | Browse & search jobs |
| `/worker/jobs/[id]` | Worker | Job detail & apply |
| `/worker/applications` | Worker | Application tracker |
| `/worker/chat` | Worker | Messages |
| `/employer/dashboard` | Employer | Analytics overview |
| `/employer/jobs` | Employer | Manage jobs |
| `/employer/jobs/post` | Employer | Create job |
| `/employer/jobs/[id]` | Employer | Job detail |
| `/employer/jobs/[id]/edit` | Employer | Edit job |
| `/employer/chat` | Employer | Messages |
| `/admin/dashboard` | Admin | Platform stats |
| `/admin/users` | Admin | User management |
| `/admin/reports` | Admin | Content moderation |

---

## Edge Functions

| Function | Methods | Purpose |
|----------|---------|---------|
| `auth` | POST | Register, login, reset-password, get-user-by-phone |
| `users` | GET, PATCH, DELETE | List, update, delete users |
| `jobs` | GET, POST, PATCH, DELETE | CRUD jobs with search/filter |
| `applications` | GET, POST, PATCH | Apply, list, accept/reject |
| `chat` | GET, POST | Conversations & messages |
| `profiles` | GET, POST, PATCH | Worker & employer profiles |
| `escrow` | GET, POST, PATCH | Escrow transactions |
| `reports` | GET, POST, PATCH | Content reports |
| `trust-scores` | GET, POST | Trust score read/recalculate |
| `admin` | GET | Platform statistics |
| `wati` | POST | Send/verify WhatsApp OTP |

All functions share `_shared/cors.ts` (CORS handling), `_shared/auth.ts` (JWT auth + Supabase client), and `_shared/crypto.ts` (PBKDF2 hashing).

---

## Design System

- **Primary:** Purple (oklch 0.55 0.18 285)
- **Background:** White (oklch 0.99)
- **Font:** Geist (sans-serif)
- **Components:** Card-based layouts, responsive (mobile-first), shadcn/ui

---

## License

All rights reserved.

---

**Version:** 2.0.0  
**Last Updated:** 2026
