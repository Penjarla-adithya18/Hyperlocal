# Supabase Setup Guide

## 1) Configure Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_USE_SUPABASE=true`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) Create Database Schema

Open Supabase SQL Editor and run:

- `supabase/schema.sql`

## 3) Install Dependencies

```bash
npm install
```

(or `pnpm install` if available)

## 4) Start App

```bash
npm run dev
```

## 5) Backend API Routes Added

- `GET /api/users`
- `GET/PATCH /api/users/[id]`
- `GET/POST /api/jobs`
- `GET/DELETE /api/jobs/[id]`
- `GET/POST /api/applications`
- `GET /api/chat/conversations`
- `GET/POST /api/chat/messages`
- `GET /api/reports`
- `PATCH /api/reports/[id]`
- `GET /api/escrow`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## 6) Frontend Integration Mode

The app now uses a compatibility data layer in `lib/mockDb.ts`:

- If `NEXT_PUBLIC_USE_SUPABASE=true`, frontend calls the API routes above.
- Otherwise, it falls back to in-memory mock data.

This allows gradual migration without rewriting all pages at once.

## 7) Session Auth Behavior

- Login/signup now create a `session_token` HttpOnly cookie.
- `middleware.ts` protects `/worker/*`, `/employer/*`, and `/admin/*` when Supabase mode is enabled.
- Server session records are stored in `user_sessions`.
