# Supabase Setup Guide

## 1) Configure Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_USE_SUPABASE=true`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

## 5) Backend Architecture

- Supabase is the only backend.
- The frontend calls Supabase directly using `@supabase/supabase-js`.
- No Next.js API route backend is required.

## 6) Frontend Integration Mode

The app now uses a compatibility data layer in `lib/mockDb.ts`:

- If `NEXT_PUBLIC_USE_SUPABASE=true`, frontend calls Supabase directly.
- Otherwise, it falls back to in-memory mock data.

This allows gradual migration without rewriting all pages at once.

## 7) Session Auth Behavior

- Login/signup validate credentials against Supabase `users` table.
- Auth state is stored in browser local storage via `AuthContext`.
