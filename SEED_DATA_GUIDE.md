# 🌱 HyperLocal AI - Seed Data Guide

This document explains how to populate your Supabase database with realistic test data for the HyperLocal AI Job & Skill Matching Platform.

## 📁 Files Included

### 1. `seed-data.json`
- **Format:** JSON
- **Usage:** For reference, import into tools, or manual data entry
- **Contains:** All tables with realistic Indian data (Vijayawada, Guntur, Visakhapatnam)

### 2. `seed-data.sql`
- **Format:** PostgreSQL SQL
- **Usage:** Run directly in Supabase SQL Editor
- **Recommended:** Best method for quick population

---

## 🚀 How to Use in Supabase

### Method 1: Direct SQL Import (RECOMMENDED ✅)

#### Step 1: Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/yecelpnlaruavifzxunw
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

#### Step 2: Copy & Paste SQL
1. Open `supabase/seed-data.sql` from your project
2. Copy all content
3. Paste into Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

#### Step 3: Verify Data
You should see output like:
```
total_users | total_jobs | total_applications | chat_conversations | total_ratings | escrow_transactions
     8      |     5      |         4           |         3           |       2       |         3
```

✅ **Done!** Your database is now populated with seed data.

---

## 📊 Seed Data Overview

### Users Created (8 Total)

#### Workers (5)
| Name | Phone | Trust Level | Skills | Status |
|---|---|---|---|---|
| Rajesh Kumar | +919876543210 | Active (78) | Cleaning, Housekeeping | Profile Complete |
| Priya Sharma | +919876543211 | Trusted (85) | Design, Marketing | Profile Complete |
| Suresh Patel | +919876543212 | Active (72) | Plumbing, Carpentry | Profile Complete |
| Ananya Desai | +919876543213 | Basic (50) | None | Profile Incomplete |
| Arjun Singh | +919876543214 | Trusted (88) | Web Dev, App Dev | Profile Complete |

#### Employers (3)
| Name | Phone | Business | Trust Level |
|---|---|---|---|
| Vijay Reddy | +919876543220 | Reddy's Consulting (IT) | Active (82) |
| Meera Nair | +919876543221 | Nair Hospitality Group | Trusted (90) |
| Ashok Kumar | +919876543222 | Kumar Home Services | Basic (65) |

### Jobs Created (5 Total)

| Title | Type | Pay | Status | Escrow |
|---|---|---|---|---|
| Hotel Room Cleaner | Part-time | ₹3,500/day | Active | Released ✅ |
| Mobile App Development | Full-time | ₹75,000 fixed | Active | Locked 🔒 |
| Home Deep Cleaning | Gig | ₹2,000 fixed | Draft | Pending |
| Event Coordinator | Part-time | ₹2,100/day | Active | Released ✅ |
| Graphic Designer | Gig | ₹5,000 fixed | Active | Locked 🔒 |

### Key Scenarios Included

✅ **Completed Jobs**
- "Hotel Room Cleaner" - 1 worker accepted, payment released, both rated 5⭐

✅ **Ongoing Jobs**
- "Mobile App Development" - 1 worker accepted, escrow locked, chat active
- "Graphic Designer" - 1 worker accepted, escrow locked, chat active

✅ **Pending Applications**
- Multiple workers with different match scores

✅ **Chat History**
- 6 sample messages between workers and employers
- Real-world conversation flow

✅ **Trust Scores**
- Varied trust levels (Basic, Active, Trusted)
- Realistic ratings and completion history

✅ **Escrow Transactions**
- Released (completed job)
- Held/Locked (ongoing jobs)

---

## 🎯 Testing Scenarios with Seed Data

### Scenario 1: View Completed Job
1. Login as **Rajesh Kumar** (Worker)
   - Phone: `+919876543210`
   - Password: `any_password` (mock auth)
2. Go to **My Applications**
3. See "Hotel Room Cleaner" - **Accepted** ✅
4. View **Ratings Given** - 5⭐

### Scenario 2: See Active Employer Chat
1. Login as **Vijay Reddy** (Employer)
   - Phone: `+919876543220`
2. Go to **Chat**
3. See conversation with **Arjun Singh**
4. View chat history about Mobile App project

### Scenario 3: Browse Jobs with Match Scores
1. Login as **Priya Sharma** (Worker)
   - Phone: `+919876543211`
2. Go to **Browse Jobs**
3. See "Graphic Designer" with **89% match score** 🎯

### Scenario 4: View Trust Scores
1. Login as **Meera Nair** (Employer)
   - Phone: `+919876543221`
2. Go to **Manage Jobs** or **Dashboard**
3. See trust score indicators for each worker
4. View completed transactions

### Scenario 5: Test Draft Job
1. Login as **Ashok Kumar** (Employer)
   - Phone: `+919876543222`
2. Go to **Post Job**
3. See "Home Deep Cleaning" in draft state
4. Complete escrow payment to activate

---

## 📝 Sample Test Logins

**Note:** The platform uses phone number + password authentication (mock OTP).

### Workers
```
Phone: +919876543210 | Password: password | Name: Rajesh Kumar
Phone: +919876543211 | Password: password | Name: Priya Sharma
Phone: +919876543212 | Password: password | Name: Suresh Patel
Phone: +919876543213 | Password: password | Name: Ananya Desai
Phone: +919876543214 | Password: password | Name: Arjun Singh
```

### Employers
```
Phone: +919876543220 | Password: password | Name: Vijay Reddy
Phone: +919876543221 | Password: password | Name: Meera Nair
Phone: +919876543222 | Password: password | Name: Ashok Kumar
```

### Mock OTP for Testing
During signup/login, any **6-digit code** works as valid OTP:
- `123456` ✅
- `000000` ✅
- `999999` ✅

---

## 🗺️ Geographic Data

### Cities Included
- **Vijayawada** - IT Hub (Reddy's Consulting jobs)
- **Visakhapatnam** - Hospitality (Nair Hotels jobs)
- **Guntur** - Home Services (Kumar Services jobs)

### Coordinates Used
Real GPS coordinates for each city center:
- Vijayawada: `16.9891° N, 82.2475° E`
- Visakhapatnam: `17.6869° N, 83.2185° E`
- Guntur: `16.5889° N, 80.6245° E`

---

## ⚙️ What Each Table Contains

| Table | Records | Purpose |
|---|---|---|
| `users` | 8 | 5 workers + 3 employers |
| `worker_profiles` | 4 | Skills, availability, experience |
| `employer_profiles` | 3 | Business details |
| `jobs` | 5 | Job listings in various states |
| `applications` | 4 | Worker applications with match scores |
| `chat_conversations` | 3 | Messaging sessions |
| `chat_messages` | 6 | Sample conversation data |
| `ratings` | 2 | Job completion reviews (5⭐) |
| `trust_scores` | 4 | Trust level calculations |
| `escrow_transactions` | 3 | Payment state tracking |
| `notifications` | 4 | User alerts |
| `reports` | 1 | Fraud reporting example |

---

## 🔄 Refreshing Seed Data

### To Reset and Reload

#### Option 1: Delete All Data (⚠️ Careful!)
```sql
DELETE FROM reports;
DELETE FROM notifications;
DELETE FROM escrow_transactions;
DELETE FROM trust_scores;
DELETE FROM ratings;
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM applications;
DELETE FROM jobs;
DELETE FROM employer_profiles;
DELETE FROM worker_profiles;
DELETE FROM users;
```

Then run `seed-data.sql` again.

#### Option 2: Use Supabase Reset
In Supabase Dashboard:
1. Go to **Settings** → **Database**
2. Click **Reset Database** (dangerous - resets schemas too)
3. Run `schema.sql` first
4. Then run `seed-data.sql`

---

## 🆘 Troubleshooting

### Issue: Foreign Key Violation
**Error:** `"violates foreign key constraint"`
**Solution:** Ensure `users` and `jobs` tables exist first. Run `schema.sql` before `seed-data.sql`.

### Issue: UUID Format Error
**Error:** `"invalid input syntax for type uuid"`
**Solution:** Check your PostgreSQL UUID extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Issue: Duplicate Phone Numbers
**Error:** `"violates unique constraint on phone_number"`
**Solution:** Use different phone numbers if seeding multiple times. Modify phone numbers in `seed-data.sql` before running.

### Issue: Array Type Error
**Error:** `"column \"skills\" is of type text[] but expression is of type text"`
**Solution:** The SQL uses `ARRAY[...]::text[]` syntax. Ensure PostgreSQL version supports it (9.1+).

---

## ✅ Verification Checklist

After seeding, verify:

- [ ] 8 users created (5 workers + 3 employers)
- [ ] 5 jobs visible
- [ ] At least 1 completed job with ratings
- [ ] Escrow transactions in different states (released, held)
- [ ] Chat conversations with messages
- [ ] Trust scores populated
- [ ] Worker profiles filled for active users

---

## 🚀 Next Steps

1. **Seed data loaded** ✅
2. **Login with test accounts** (see credentials above)
3. **Test worker flow:** Browse jobs → Apply → Chat
4. **Test employer flow:** View applications → Accept → Chat → Rate
5. **Test admin dashboard** (if available)

---

## 📧 Support

If you encounter issues:
1. Check **Supabase Logs** in Dashboard
2. Verify schema exists: `supabase/schema.sql`
3. Ensure all tables are created before seeding
4. Check phone numbers are in correct format

---

**Last Updated:** 2026-02-23  
**Database:** Supabase PostgreSQL  
**Project Ref:** `yecelpnlaruavifzxunw`
