# HyperLocal AI Job & Skill Matching Platform — Feature Documentation

> **Version:** 2.0.0 | **Last Updated:** February 2026  
> **Stack:** Next.js 16 + React 19 + TypeScript + Supabase + Gemini AI  
> **Default Test Credentials (all seed users):** Password → `Password@123`

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Worker Features](#2-worker-features)
   - 2.1 [Worker Dashboard](#21-worker-dashboard)
   - 2.2 [Job Discovery & Smart Search](#22-job-discovery--smart-search)
   - 2.3 [Job Detail & AI Career Coach](#23-job-detail--ai-career-coach)
   - 2.4 [Application Tracking](#24-application-tracking)
   - 2.5 [Earnings Dashboard](#25-earnings-dashboard)
   - 2.6 [AI Skill Gap Analyzer](#26-ai-skill-gap-analyzer)
   - 2.7 [Worker Profile Management](#27-worker-profile-management)
   - 2.8 [Worker Chat with Translation](#28-worker-chat-with-translation)
3. [Employer Features](#3-employer-features)
   - 3.1 [Employer Dashboard](#31-employer-dashboard)
   - 3.2 [AI Smart Job Posting](#32-ai-smart-job-posting)
   - 3.3 [Job Detail & AI Candidate Ranking](#33-job-detail--ai-candidate-ranking)
   - 3.4 [AI Resume Search (RAG)](#34-ai-resume-search-rag)
   - 3.5 [Employer Chat with Translation](#35-employer-chat-with-translation)
4. [Admin Features](#4-admin-features)
   - 4.1 [Admin Dashboard](#41-admin-dashboard)
   - 4.2 [User Management](#42-user-management)
   - 4.3 [Reports & Moderation](#43-reports--moderation)
5. [AI / Gemini Features](#5-ai--gemini-features)
   - 5.1 [AI Job Matching & Recommendations](#51-ai-job-matching--recommendations)
   - 5.2 [AI Learning Plan Generator](#52-ai-learning-plan-generator)
   - 5.3 [AI Interview Preparation](#53-ai-interview-preparation)
   - 5.4 [AI Cover Letter Generator](#54-ai-cover-letter-generator)
   - 5.5 [AI Candidate Ranking](#55-ai-candidate-ranking)
   - 5.6 [AI Job Description Generator](#56-ai-job-description-generator)
   - 5.7 [AI Salary Estimator](#57-ai-salary-estimator)
   - 5.8 [AI Skill Gap Analysis](#58-ai-skill-gap-analysis)
   - 5.9 [AI Dashboard Insights](#59-ai-dashboard-insights)
   - 5.10 [AI Chat Translation](#510-ai-chat-translation)
   - 5.11 [AI Multilingual Search](#511-ai-multilingual-search)
6. [Platform Features](#6-platform-features)
   - 6.1 [Escrow Payment System](#61-escrow-payment-system)
   - 6.2 [Trust Score & Reputation](#62-trust-score--reputation)
   - 6.3 [Chat Safety Filter](#63-chat-safety-filter)
   - 6.4 [Voice Input](#64-voice-input)
   - 6.5 [Location Input with Google Places](#65-location-input-with-google-places)
   - 6.6 [Notification System](#66-notification-system)
   - 6.7 [Internationalization (i18n)](#67-internationalization-i18n)
   - 6.8 [PWA Support](#68-pwa-support)
   - 6.9 [Role-Based Skills System](#69-role-based-skills-system)
   - 6.10 [Settings & Account Management](#610-settings--account-management)

---

## 1. Authentication & Onboarding

### How It Works

The platform uses phone-number-based authentication with WhatsApp OTP verification. Passwords are hashed using **PBKDF2** (210,000 iterations, SHA-256) on the server side. After signup, users are guided through progressive profile completion rather than forcing all details upfront.

**Roles:** Worker, Employer, Admin — each role gets a separate dashboard and navigation.

**Files:** `app/signup/page.tsx`, `app/login/page.tsx`, `app/forgot-password/page.tsx`, `contexts/AuthContext.tsx`, `lib/auth.ts`

### How to Test

#### Signup (New User)
1. Open `http://localhost:3000/signup`
2. Enter Full Name, Phone Number, Password, and Confirm Password
3. Select Role: **Worker** or **Employer**
4. Click **Sign Up**
5. An OTP screen appears — in demo mode, the OTP is displayed on screen
6. Enter the OTP and click **Verify**
7. **Expected:** Redirects to the appropriate dashboard (`/worker/dashboard` or `/employer/dashboard`)

#### Login (Existing User)
1. Open `http://localhost:3000/login`
2. Enter any seed user's phone number (e.g., `9876543210`) and password `Password@123`
3. Click **Login**
4. **Expected:** Authenticated and redirected to the role-specific dashboard

#### Forgot Password
1. Open `http://localhost:3000/forgot-password`
2. Enter a registered phone number
3. Receive and enter OTP
4. Enter a new password + confirmation
5. Click **Reset Password**
6. **Expected:** Password updated, redirected to login

#### Role Guards
1. While logged in as a worker, manually navigate to `/employer/dashboard`
2. **Expected:** Automatically redirected to `/login`

---

## 2. Worker Features

### 2.1 Worker Dashboard

**File:** `app/worker/dashboard/page.tsx`

#### How It Works

The dashboard is the worker's home screen. It shows:
- **Welcome message** with the worker's name
- **Profile completion bar** — real-time percentage (skills 25% + categories 25% + availability 20% + experience 20% + location 10%) with a call-to-action to complete
- **Stats cards** — Total Applications, Trust Score, Average Rating, Completed Jobs
- **AI Insights** — Personalized coaching cards (tips, achievements, opportunities) generated by Gemini AI and cached in `sessionStorage`
- **AI-Recommended Jobs** — Top 5 jobs matched by the AI engine with match score badges. The top recommendation gets an AI-generated match summary
- **Recent Applications** — Last 3 applications with status badges and links

#### How to Test

1. Log in as a worker (e.g., phone `9876543210`, password `Password@123`)
2. **Expected:** Dashboard loads with stats cards, recommended jobs, and recent apps
3. Check the **Profile Completion bar**:
   - If < 100%, a yellow alert card shows with "Complete Your Profile" button
   - Click it → redirects to `/worker/profile`
4. Check **AI Insights** section (appears below stats cards):
   - **Expected:** 2–3 colorful cards with coaching tips (e.g., "Complete Your Profile", "Stay Active", "Keep It Up!")
   - Reload the page → insights load instantly from cache
5. Check **Recommended Jobs**:
   - The first card should show an AI-generated summary in italic purple text
   - Click any job card → navigates to job detail
6. Check **Recent Applications**:
   - Each shows status badge (Pending/Accepted/Rejected/Completed)
   - Click "View Details" → navigates to job detail

---

### 2.2 Job Discovery & Smart Search

**File:** `app/worker/jobs/page.tsx`

#### How It Works

Workers browse and search for jobs across three tabs:
- **Recommended** — AI-scored jobs (match ≥ 40%) sorted by relevance
- **All Jobs** — Every active job with search and filters
- **Saved** — Bookmarked jobs (persisted in `localStorage`)

**Smart Search features:**
- Text search across job title, description, and skills
- **Multilingual AI search** — Hindi/Telugu queries are processed through Gemini AI and translated (shows "AI understood: ..." hint)
- **Voice search** — Microphone button for speech-to-text input
- **Category filter** — Dropdown with all job categories
- **Location filter** — Text filter for city/area
- **GPS distance display** — Uses browser Geolocation + Haversine formula to show distance to each job (e.g., "2.3 km away")
- **Pagination** — 12 jobs per page

**Job Cards show:** Title, company, up to 3 skill badges (+ overflow count), pay amount (₹), location with distance, duration, experience level, match score, save/bookmark toggle.

**Hidden jobs:** Jobs previously reported by the worker are automatically hidden.

#### How to Test

##### Basic Browsing
1. Navigate to `/worker/jobs`
2. **Expected:** Three tabs visible — "Recommended", "All Jobs", "Saved"
3. Click **All Jobs** tab
4. **Expected:** Grid of job cards with 12 per page, pagination controls at bottom

##### AI Smart Search
1. In the search bar, type a Hindi query like `प्लंबर का काम` (plumber job)
2. **Expected:** A blue hint appears below search bar: "AI understood: plumber work" (translated query)
3. Results filter to matching plumbing jobs

##### Voice Search
1. Click the **microphone icon** in the search bar
2. Speak a job title (e.g., "electrician near me")
3. **Expected:** Speech converted to text in search bar, results auto-filter

##### Filters
1. Select a **Category** from the dropdown (e.g., "Plumbing")
2. **Expected:** Only plumbing jobs shown
3. Type a location in the **Location** field (e.g., "Hyderabad")
4. **Expected:** Results filtered to that location

##### GPS Distance
1. Allow browser location access when prompted
2. **Expected:** Each job card shows a distance badge (e.g., "2.3 km")

##### Save/Bookmark Jobs
1. Click the **bookmark icon** on any job card
2. **Expected:** Icon fills in (solid), toast confirms "Job saved"
3. Click the **Saved** tab
4. **Expected:** The bookmarked job appears in the saved list
5. Click bookmark again to unsave
6. Reload page → saved jobs persist (stored in `localStorage`)

##### Pagination
1. Browse **All Jobs** with no filters
2. Scroll to the bottom
3. **Expected:** "Next" button appears if more than 12 jobs; clicking it loads the next page

---

### 2.3 Job Detail & AI Career Coach

**File:** `app/worker/jobs/[id]/page.tsx`

#### How It Works

When a worker opens a job, they see the full job details plus an AI-powered assistant sidebar:

**Job Information:**
- Title, description, category, required skills, pay, duration, location, experience level
- Job mode badge (Remote / On-site) and job nature badge (Technical / Non-Technical)
- Escrow protection badge when applicable
- AI match percentage bar with explanation

**AI Career Coach Panel** (collapsible sidebar with sparkle icon):
- **Learn Skills tab:**
  - Readiness score (percentage bar)
  - Quick wins checklist (easy actions to improve readiness)
  - Learning resources per skill — each with title, URL link, type icon (video/course/article/practice/community), platform name, "Free" badge, description, and clickable external link
  - Career growth path (long-term progression advice)
- **Interview Prep tab:**
  - 5 numbered practice questions with sample answers and pro tips
  - General interview tips checklist
  - 2-column grid: Dress Code advice + What to Bring list

**Application Form:**
- Cover letter textarea with **"AI Write for me"** button (auto-generates personalized cover letter)
- Resume upload (required for technical jobs) — accepts PDF, DOCX, TXT (max 5MB)
- Submit button

**Report Job:** Dialog with reasons (fake/scam, payment issue, misleading, illegal, spam) + optional details

**Dynamic Translation:** When the user's locale is Hindi or Telugu, job title and description are auto-translated

#### How to Test

##### Viewing Job Detail
1. From `/worker/jobs`, click any job card
2. **Expected:** Full job detail page loads with all information, match score, employer card

##### AI Career Coach — Learning Plan
1. On the job detail page, find the **"AI Career Coach"** panel in the sidebar (or below job details on mobile)
2. Click the panel header to expand it (if collapsed)
3. Click **"Load Learning Plan"** button
4. **Expected:** Loading spinner → then:
   - Readiness score bar (e.g., "72% Ready")
   - Quick wins section with actionable items
   - Learning resources for each required skill with clickable web links
   - Career path section
5. Click any **resource link** → opens in new tab (YouTube, Coursera, Skill India, etc.)
6. Reload page → plan loads instantly from `sessionStorage` cache

##### AI Career Coach — Interview Prep
1. Switch to the **"Interview Prep"** tab in the AI Career Coach panel
2. Click **"Prepare for Interview"** button
3. **Expected:** Loading spinner → then:
   - 5 numbered questions relevant to the job
   - Each question has a "Sample Answer" in a muted box and a "Pro Tip" with lightbulb icon
   - General Tips section (checklist)
   - Dress Code + What to Bring grid

##### AI Cover Letter
1. Scroll to the Application Form section
2. Click the **"✨ AI Write for me"** button next to the Cover Letter label
3. **Expected:** Button shows loading spinner → cover letter text auto-fills in the textarea
4. Edit the generated text as needed

##### Resume Upload (Technical Jobs)
1. Open a technical job (e.g., Software Development or Data Analytics category)
2. **Expected:** Resume upload section is visible
3. Click "Upload Resume" and select a PDF/DOCX file (max 5MB)
4. **Expected:** File name displayed, AI extracts skills from resume content

##### Submitting Application
1. Fill in (or AI-generate) the cover letter
2. Upload resume if required
3. Click **"Submit Application"**
4. **Expected:** Success toast, button changes to "Applied ✓", application status card appears

##### Report Job
1. Click the **flag icon** or "Report Job" button
2. Select a reason (e.g., "Fake / Scam")
3. Optionally add details
4. Click **Submit Report**
5. **Expected:** Success toast, job is hidden from future search results

##### Dynamic Translation
1. Go to Settings → change language to Hindi or Telugu
2. Open any job detail
3. **Expected:** Job title and description show translated text below the original English text

---

### 2.4 Application Tracking

**File:** `app/worker/applications/page.tsx`

#### How It Works

Workers track all their submitted applications in one place with status-filtered tabs.

**Tabs:** Pending, Accepted, Completed, Rejected — each shows a count badge  
**Application cards show:** Job title, employer name, applied date, status badge (color-coded), job details (location, pay, duration, experience), cover letter preview  
**Rate Employer:** Available on accepted/completed applications (1–5 star rating with optional feedback)

#### How to Test

1. Navigate to `/worker/applications`
2. **Expected:** Tabs visible with counts — click each tab to filter
3. Each application card shows:
   - Job title and employer name
   - Color-coded status badge (green = accepted, red = rejected, yellow = pending, blue = completed)
   - Job details summary
4. On an **accepted or completed** application, click **"Rate Employer"**
5. Select 1–5 stars, optionally add feedback text
6. Click **Submit Rating**
7. **Expected:** Success toast, green "Rated ✓" indicator appears on the card
8. Click **"View Job"** on any application → navigates to the job detail page

---

### 2.5 Earnings Dashboard

**File:** `app/worker/earnings/page.tsx`

#### How It Works

Workers view their complete earnings history and financial overview:

**Summary Cards:**
- **Total Earned** — Lifetime earnings with month-over-month growth percentage (up/down arrow)
- **This Month** — Current month's earnings
- **In Escrow** — Amount currently held in escrow (not yet released)
- **Platform Commission** — Total commission deducted (10%)

**Period Filter:** All Time, This Month, Last 3 Months, Last 6 Months

**Tabs:**
- **Recent Transactions** — Table with columns: Job, Amount (₹), Commission (₹), Net (₹), Status (color-coded badge: released/held/pending/refunded), Date
- **Monthly Breakdown** — Month-by-month cards showing earned amount, commission, and job count

#### How to Test

1. Navigate to `/worker/earnings` (also accessible from sidebar nav → "Earnings")
2. **Expected:** Four summary cards at top with formatted INR amounts
3. Check **Month-over-Month growth:**
   - If positive: green up-arrow with percentage
   - If negative: red down-arrow
4. Change the **Period filter** dropdown:
   - Select "This Month" → only current month's transactions show
   - Select "Last 3 Months" → last 3 months' data
5. Click **"Recent Transactions"** tab:
   - **Expected:** Table with all transactions, sortable
   - Status badges: green (released), blue (held), yellow (pending), red (refunded)
6. Click **"Monthly Breakdown"** tab:
   - **Expected:** Cards grouped by month (e.g., "February 2026") with totals

---

### 2.6 AI Skill Gap Analyzer

**File:** `app/worker/skill-gap/page.tsx`

#### How It Works

The AI analyzes a worker's skill profile against the current job market to identify strengths and gaps:

1. Aggregates the **top 20 in-demand skills** from all active jobs by frequency
2. Compares against the worker's listed skills
3. Calls Gemini AI (`analyzeSkillGap`) for a detailed analysis
4. Displays results with actionable improvement suggestions

**UI Sections:**
- **Summary Cards:** Market Readiness (% with progress bar), Strong Skills count, Skill Gaps count
- **AI Assessment:** Natural language summary of competitive position
- **Strong Skills:** Green badges for skills the worker has that are in demand
- **Skills to Learn:** Orange-highlighted cards per gap skill with AI-generated learning tips
- **Top In-Demand Skills:** Full list with color-coded badges (green = worker has, grey = missing)

Results are cached in `sessionStorage`. Users can click **"Re-analyze"** to refresh.

#### How to Test

1. Ensure the logged-in worker has at least some skills in their profile (go to `/worker/profile` and add skills if empty)
2. Navigate to `/worker/skill-gap` (also accessible from sidebar nav → "Skill Gap")
3. **Expected:** Loading state → then results appear:
   - Market Readiness percentage (e.g., "65%")
   - Strong Skills badges in green
   - Skills to Learn with individual tips
4. Check the **AI Assessment** card — should contain a paragraph of analysis
5. Click **"Re-analyze"** button
6. **Expected:** Loading spinner → fresh AI analysis (may differ slightly from cached version)
7. Scroll to **"Top In-Demand Skills"** section:
   - Green badges = skills you have
   - Default badges = skills you're missing
8. Reload page → results load instantly from `sessionStorage` cache

---

### 2.7 Worker Profile Management

**File:** `app/worker/profile/page.tsx`

#### How It Works

Workers build their professional profile for better AI matching:

- **Profile Photo:** Upload with client-side crop (200×200px square, JPEG, max 2MB)
- **Live Completeness Bar:** Real-time percentage: skills (25%) + categories (25%) + availability (20%) + experience (20%) + location (10%)
- **Personal Info:** Full name, phone (read-only), location, bio
- **Trust Score Banner:** Shows current trust level (Trusted/Active/New) with color coding and star rating
- **Job Categories:** Multi-select badges from 31 categories
- **Experience:** Textarea with **Voice Input** support (append mode — adds to existing text)
- **AI Skill Extraction:** "Extract Skills with AI" button analyzes written experience to find and suggest skills
- **Skills:** Manual add/remove with input field + badge chips
- **Availability:** Dropdown (Full-time, Part-time, Weekends, Flexible, Evening, Morning)
- **Danger Zone:** Account deletion with confirmation dialog

#### How to Test

##### Profile Completeness
1. Navigate to `/worker/profile`
2. **Expected:** Profile completeness bar visible at top showing current %
3. Add skills → bar increases by up to 25%
4. Select categories → increases by up to 25%
5. Set availability → increases by 20%
6. Add experience → increases by 20%
7. Set location → increases by 10%

##### Voice Input for Experience
1. In the **Experience** text area, click the **microphone icon**
2. Speak your work experience (e.g., "I have 3 years of plumbing experience")
3. **Expected:** Speech is converted to text and appended to the textarea

##### AI Skill Extraction
1. Type or dictate some experience text (e.g., "Worked as an electrician for 5 years. Expert in wiring, circuit breakers, and motor repair.")
2. Click **"Extract Skills with AI"**
3. **Expected:** AI analyzes the text and adds extracted skills (e.g., "Wiring", "Circuit Breakers", "Motor Repair") as badges
4. Duplicate skills are not added twice

##### Category Selection
1. Click any category badge (e.g., "Electrical") → turns solid (selected)
2. Click again → deselects
3. **Expected:** Selected categories influence AI job recommendations

##### Save Profile
1. Make changes to any field
2. Click **"Save Profile"**
3. **Expected:** Success toast, profile completeness updates, changes persisted

---

### 2.8 Worker Chat with Translation

**File:** `app/worker/chat/page.tsx`

#### How It Works

Workers chat in real-time with employers about jobs. Features include:
- **Conversation list** with search, unread badges, last message preview
- **Message bubbles** (sent = primary color right-aligned, received = muted left-aligned)
- **AI Translation** — Every message has a "Translate" button that translates it to the user's current locale language using Gemini AI
- **Chat safety filter** — Blocks phone numbers, email addresses, off-platform contact info, and fraud keywords before sending
- **Sensitive content masking** — Received messages have phone/email masked as `[phone hidden]`/`[email hidden]`
- **Report abuse** — Flag button opens a report dialog
- **Conversation closure** — Messages are disabled when the job is completed
- **Auto-polling** — New messages fetched every 5 seconds

#### How to Test

##### Sending Messages
1. Navigate to `/worker/chat`
2. Select a conversation from the left panel
3. Type a message and press **Enter** or click **Send**
4. **Expected:** Message appears as a right-aligned bubble

##### AI Translation
1. On any received message, click the **"🌐 Translate"** button (Languages icon + "Translate" text)
2. **Expected:** Loading spinner → translated text appears in italic below the original message
3. Translation is based on the user's current locale (English/Hindi/Telugu)

##### Chat Safety Filter
1. Try sending a message with a phone number (e.g., "Call me at 9876543210")
2. **Expected:** Message is **blocked** with toast: "Message blocked — Phone number sharing is not allowed"
3. Try sending "Send me money via GPay"
4. **Expected:** Message blocked — fraud keyword detected

##### Report Abuse
1. Click the **flag icon** in the chat header
2. Select a reason, optionally add description
3. Click **Submit**
4. **Expected:** Report submitted toast

---

## 3. Employer Features

### 3.1 Employer Dashboard

**File:** `app/employer/dashboard/page.tsx`

#### How It Works

The employer's home screen showing business overview:
- **Welcome message** with business name
- **Stats cards** — Active Jobs, Total Applications, Pending Applications, Trust Score
- **AI Insights** — Personalized business coaching cards (hiring tips, response speed advice, achievements) from Gemini AI
- **Quick Actions** — Post Job, Review Applications, Messages
- **Recent Jobs** — Last 4 posted jobs with status, application count, views, payment status
- **Trust Score Card** — Score breakdown: completion rate, average rating, total ratings

#### How to Test

1. Log in as an employer (e.g., phone `9876543211`, password `Password@123`)
2. **Expected:** Dashboard with stats cards and job listings
3. Check **AI Insights** section (below stats):
   - **Expected:** 2–3 colored cards with tips like "Write Better Descriptions", "Respond Quickly", "Growing Network"
   - Insights cache → reload shows them instantly
4. Click **"Post a Job"** quick action → navigates to `/employer/jobs/post`
5. Check **Recent Jobs** — each card shows:
   - Title, category, status badge, application count, views
   - Payment status (escrow secured vs. draft)
   - Click "View Details" → navigates to job detail

---

### 3.2 AI Smart Job Posting

**File:** `app/employer/jobs/post/page.tsx`

#### How It Works

Employers create job postings with comprehensive AI assistance:

**AI Smart Job Posting Banner:**
- Purple banner at top with **"Auto-Fill with AI"** button
- One click generates: description, requirements, benefits, suggested skills, and suggested pay
- After AI fills the form, a green "AI has filled the form" message shows

**AI Salary Estimation:**
- **"AI Suggest Pay"** button next to the pay field
- Shows market rate range (min / avg / max) with confidence level, market trend, and reasoning
- Quick-apply buttons: "Use ₹300", "Use ₹450 (avg)", "Use ₹600" etc.

**Form Fields:**
- Job Title, Description (textarea), Job Mode (On-site / Remote toggle), Category (31 categories split into Technical/Non-Technical), Location (Google Places autocomplete), Job Nature auto-detection
- Required Skills (role-relevant skills shown as toggleable badges + custom skill input)
- Payment Type (Hourly / Fixed), Amount (₹), Duration (presets + custom), Worker Slots, Start Date, Experience Level
- Requirements (textarea), Benefits (textarea)
- Escrow toggle (recommended for secure payments)

**Posting Limits:** Basic trust-level employers limited to 3 active/draft jobs

#### How to Test

##### AI Auto-Fill
1. Navigate to `/employer/jobs/post`
2. Enter a job title: **"Need Experienced Plumber for Bathroom Repair"**
3. Click the purple **"✨ Auto-Fill with AI"** button
4. **Expected:**
   - Loading spinner → then all fields auto-fill:
   - Description: 3–5 sentence engaging description
   - Requirements: Bullet-pointed list
   - Benefits: Realistic perks (tea provided, bonus, etc.)
   - Skills: Relevant skills auto-added as badges
   - Pay: Suggested amount filled in
   - Green confirmation message: "AI has filled the form"
5. Review and edit any field as needed

##### AI Salary Estimation
1. After entering a title and selecting a category
2. Click **"AI Suggest Pay"** next to the pay amount field
3. **Expected:**
   - Blue info card appears below pay field showing:
   - Market Rate range: "₹300 – ₹600/hr"
   - Reasoning: "Based on average intermediate-level Plumbing rates in India."
   - Badges: Confidence (low/medium/high), Trend (rising/stable/declining)
   - Quick-apply buttons: click "Use ₹450 (avg)" → pay field updates to 450

##### Category & Skills
1. Select category **"Plumbing"** from dropdown
2. **Expected:** 8 plumbing-relevant skills appear as toggleable badges
3. Non-technical indicator shows: "Non-Technical Job — No resume required"
4. Switch to **"Software Development"**
5. **Expected:** Technical skills appear, indicator changes to "Technical Job — Workers will be asked to upload a resume"

##### Job Mode
1. Click **"On-site / Local"** button → active state
2. Click **"Remote"** button → switches
3. **Expected:** Selected mode gets filled styling

##### Submit
1. Fill all required fields (or use AI auto-fill)
2. Click **"Post Job"**
3. **Expected:** Redirects to payment page `/employer/payment/[jobId]` for escrow setup

---

### 3.3 Job Detail & AI Candidate Ranking

**File:** `app/employer/jobs/[id]/page.tsx`

#### How It Works

Employers manage a specific job and review applicants:

**Job Status Management:**
- Draft → "Complete Payment" to go live
- Active → "Edit Job" button
- Actions: Edit, Close/Cancel, Track payment status

**AI Candidate Ranking:**
- When 2+ applicants exist, a golden **"AI Candidate Insights"** panel appears
- **"Rank Candidates with AI"** button triggers Gemini analysis
- Results show ranked candidates with: rank number, name, score %, "Best Match" badge for #1, reasoning text, green strength badges, orange concern badges, summary quote

**Application Management:**
- Each applicant card: avatar, name, match score, trust level, status badge
- **Accept / Reject** buttons for pending applications
- **Chat** button to message the worker directly

**Escrow Payment Panel:**
- Status: Secured / Released / Refunded / Pending
- Amount breakdown: Job Amount → Platform Fee (10%) → Worker Receives
- Actions: "Pay & Make Live" (draft), "Job Done — Release Payment" (active), "Raise a Dispute"
- WhatsApp notification sent to worker on payment release

**Rate Worker:** Star rating (1–5) with feedback after job completion

#### How to Test

##### AI Candidate Ranking
1. Open a job that has 2+ applicants: `/employer/jobs/[id]`
2. Find the golden **"AI Candidate Insights"** card (has a trophy icon with animation)
3. Click **"Rank Candidates with AI"**
4. **Expected:**
   - Loading spinner → then ranked results:
   - #1 candidate with "Best Match" badge and highest score
   - Each candidate shows: score, reasoning, strengths (green), concerns (orange)
   - Summary quote at top
5. Reload page → rankings load from `sessionStorage` cache

##### Accept/Reject Applicants
1. On a pending applicant, click **"Accept"**
2. **Expected:** Status changes to "Accepted", toast confirmation
3. On another applicant, click **"Reject"**
4. **Expected:** Status changes to "Rejected"

##### Escrow Actions
1. On a draft job, click **"Pay & Make Live"**
2. **Expected:** Redirects to payment flow, job status changes to "Active"
3. On an active job with completed work, click **"Job Done — Release Payment"**
4. **Expected:** Escrow released, worker notified, status updated

##### Chat with Worker
1. Click **"Chat"** on any applicant
2. **Expected:** Navigates to `/employer/chat` with that conversation selected

##### Rate Worker
1. On a completed job, click **"Rate Worker"**
2. Select 1–5 stars and optionally add feedback
3. Click **Submit**
4. **Expected:** Rating saved, toast confirmation

---

### 3.4 AI Resume Search (RAG)

**File:** `app/employer/resume-search/page.tsx`

#### How It Works

Employers search for workers using a conversational AI chatbot powered by RAG (Retrieval-Augmented Generation):

1. On page load, **indexes all worker resumes** from the employer's job applicants
2. Shows indexed count badge (e.g., "3 resumes indexed")
3. Employer types natural language queries like "Find workers skilled in data analytics"
4. Query parsed via `parseRAGQuery` → `ragSearch` performs keyword + AI re-ranking
5. Results shown as cards: worker name, phone, match score, highlighted skill badges, experience summary, projects, AI explanation

**Quick search suggestions** shown on initial load for easy starting.

#### How to Test

1. Navigate to `/employer/resume-search` (sidebar → "AI Search")
2. **Expected:** Chat interface with bot welcome message and a badge showing indexed resume count
3. Click a **quick search suggestion** (e.g., "Find workers with plumbing skills")
4. **Expected:** User message appears → bot responds with matching worker cards
5. Type a custom query: **"Who has experience with electrical wiring?"**
6. **Expected:** Relevant workers shown with highlighted matching skills and AI explanation
7. If no resumes indexed: bot explains that applicants need to have submitted resumes

---

### 3.5 Employer Chat with Translation

**File:** `app/employer/chat/page.tsx`

#### How It Works

Same chat functionality as worker chat (see [2.8](#28-worker-chat-with-translation)) but with the employer's perspective:
- Conversation list shows worker names
- AI Translation button on every message
- Chat safety filters and sensitive content masking
- Report abuse functionality
- Auto-polling every 5 seconds

#### How to Test

Same steps as Worker Chat (section 2.8), but logged in as an employer.

---

## 4. Admin Features

### 4.1 Admin Dashboard

**File:** `app/admin/dashboard/page.tsx`

#### How It Works

Platform-wide statistics overview:
- **Stats Cards:** Total Users (workers + employers count), Jobs Posted (active + completed), Applications (pending count), Reports (unhandled badge)
- **Escrow Overview:** Total escrow volume (₹), currently held amount (₹)
- **Platform Health:** Unhandled reports, active jobs, pending applications
- **Clickable navigation:** Users card → User Management, Reports card → Reports page

#### How to Test

1. Log in as admin (seed admin account)
2. Navigate to `/admin/dashboard`
3. **Expected:** Stats cards with platform-wide numbers
4. Click the **Users** card → navigates to `/admin/users`
5. Click the **Reports** card → navigates to `/admin/reports`
6. Check **Escrow Overview** → shows total and held amounts

---

### 4.2 User Management

**File:** `app/admin/users/page.tsx`

#### How It Works

Admins search, view, and moderate all platform users:
- **Search bar:** Search by name, email, or phone
- **Tabs:** All Users, Workers, Employers (with counts)
- **User cards:** Avatar, name, verified badge, contact info, skills (workers), company (employers), trust score, role badge
- **Actions:** Suspend user (sets verified=false, trust=0) or Restore account (reactivates)

#### How to Test

1. Navigate to `/admin/users`
2. **Expected:** All users listed with role badges
3. Search for a user by name → results filter live
4. Click **Workers** tab → only workers shown
5. Click **"Suspend"** on a user → confirmation dialog appears
6. Confirm → user status changes, trust score set to 0
7. Click **"Restore"** on a suspended user → account reactivated

---

### 4.3 Reports & Moderation

**File:** `app/admin/reports/page.tsx`

#### How It Works

Admins handle content reports (job reports, chat abuse, user reports):
- **Tabs:** Pending (with count), Resolved, Dismissed
- **Report cards:** Report type, date, status badge, reporter info, reported user info, reason, resolution
- **Review panel:** Selecting a report opens an inline panel with admin action notes textarea
- **Actions:** "Resolve & Take Action" or "Dismiss Report"

#### How to Test

1. Navigate to `/admin/reports`
2. **Expected:** Pending reports tab shows unresolved reports
3. Click any report → review panel expands below
4. Add admin notes in the textarea
5. Click **"Resolve & Take Action"** → report moves to Resolved tab
6. Or click **"Dismiss Report"** → moves to Dismissed tab
7. Click the **Resolved** / **Dismissed** tabs to verify

---

## 5. AI / Gemini Features

All AI features are powered by **Google Gemini** (gemini-2.0-flash and gemini-2.0-flash-lite) with:
- **Round-robin API key rotation** for parallel quota
- **In-memory TTL cache** (30 min for summaries, 10 min for translations)
- **`sessionStorage` caching** on the client side for subsequent page loads
- **Deterministic fallbacks** when API fails (real URLs, realistic data)
- **Code fence stripping** for reliable JSON parsing

**File:** `lib/gemini.ts`

---

### 5.1 AI Job Matching & Recommendations

**File:** `lib/aiMatching.ts`

**How It Works:** Calculates a match score (0–100%) between a worker's profile and each job based on:
- Skill overlap (weighted)
- Category match
- Location proximity
- Experience level fit
- Availability alignment

**Where It Appears:** Worker Dashboard (top jobs), Worker Job Browse (Recommended tab), Job Detail (match bar)

**How to Test:**
1. Complete your worker profile with skills and categories
2. Go to `/worker/dashboard` → check recommended jobs have match score badges
3. Go to `/worker/jobs` → Recommended tab shows AI-scored jobs ≥ 40%

---

### 5.2 AI Learning Plan Generator

**Function:** `generateLearningPlan()` in `lib/gemini.ts`

**How It Works:** Given a job's required skills vs. worker's skills, generates:
- Readiness score (0–100%)
- Quick wins (easy actions)
- Learning resources per skill (with real URLs to YouTube, Coursera, Skill India, etc.)
- Career growth path

**Where It Appears:** Worker Job Detail → AI Career Coach → Learn Skills tab

**How to Test:** See [section 2.3 — AI Career Coach Learning Plan](#ai-career-coach--learning-plan)

---

### 5.3 AI Interview Preparation

**Function:** `generateInterviewPrep()` in `lib/gemini.ts`

**How It Works:** Generates interview preparation materials for a specific job:
- 5 relevant questions with sample answers and tips
- General interview tips
- Dress code advice
- What to bring list

**Where It Appears:** Worker Job Detail → AI Career Coach → Interview Prep tab

**How to Test:** See [section 2.3 — AI Career Coach Interview Prep](#ai-career-coach--interview-prep)

---

### 5.4 AI Cover Letter Generator

**Function:** `generateCoverLetter()` in `lib/gemini.ts`

**How It Works:** Writes a personalized cover letter using: job title, description, required skills, worker's skills, experience, and name.

**Where It Appears:** Worker Job Detail → Application Form → "AI Write for me" button

**How to Test:** See [section 2.3 — AI Cover Letter](#ai-cover-letter)

---

### 5.5 AI Candidate Ranking

**Function:** `rankCandidates()` in `lib/gemini.ts`

**How It Works:** Takes all applicants for a job, enriches with profile data (skills, experience, rating), and asks Gemini to rank them. Returns: ranked list with scores, reasoning, strengths, and concerns.

**Where It Appears:** Employer Job Detail → AI Candidate Insights panel

**How to Test:** See [section 3.3 — AI Candidate Ranking](#ai-candidate-ranking)

---

### 5.6 AI Job Description Generator

**Function:** `generateJobDescription()` in `lib/gemini.ts`

**How It Works:** Given a job title, category, location, mode, experience level, and duration, generates: compelling description, requirements, benefits, suggested skills, and suggested pay range.

**Where It Appears:** Employer Job Post → "Auto-Fill with AI" button

**How to Test:** See [section 3.2 — AI Auto-Fill](#ai-auto-fill)

---

### 5.7 AI Salary Estimator

**Function:** `estimateSalary()` in `lib/gemini.ts`

**How It Works:** Analyzes Indian market rates for a given role, category, location, experience level, and skills. Returns: min/max/avg pay, confidence level, reasoning, and market trend.

**Where It Appears:** Employer Job Post → "AI Suggest Pay" button

**How to Test:** See [section 3.2 — AI Salary Estimation](#ai-salary-estimation)

---

### 5.8 AI Skill Gap Analysis

**Function:** `analyzeSkillGap()` in `lib/gemini.ts`

**How It Works:** Compares worker's current skills against market-demanded skills. Returns: readiness score, strong skills, gap skills with learning tips, and an overall assessment summary.

**Where It Appears:** Worker Skill Gap page (`/worker/skill-gap`)

**How to Test:** See [section 2.6](#26-ai-skill-gap-analyzer)

---

### 5.9 AI Dashboard Insights

**Function:** `generateDashboardInsights()` in `lib/gemini.ts`

**How It Works:** Takes a user's role + stats (jobs, earnings, ratings, applications) and generates 3–4 personalized coaching insights. Each insight has: title, message, type (tip/alert/achievement/opportunity), and icon.

**Where It Appears:** Worker Dashboard (insight cards), Employer Dashboard (insight cards)

**How to Test:**
1. Log in as worker or employer
2. Go to dashboard
3. **Expected:** 2–3 colorful insight cards below stats cards
4. Card types: green (achievement), amber (alert), blue (opportunity), purple (tip)

---

### 5.10 AI Chat Translation

**Function:** `translateChatMessage()` in `lib/gemini.ts`

**How It Works:** Translates any chat message to the user's current locale (English, Hindi, or Telugu) using Gemini flash-lite. Keeps the translation natural and chat-appropriate.

**Where It Appears:** Worker Chat (all messages), Employer Chat (all messages)

**How to Test:**
1. Open any chat conversation
2. Click **"Translate"** below any message
3. **Expected:** Loading spinner → italic translated text appears below the original
4. Change locale to Hindi → translate shows Hindi translation

---

### 5.11 AI Multilingual Search

**Function:** `processUserInput()` in `lib/gemini.ts`

**How It Works:** Processes non-English search queries via Gemini to extract job title and location in English. For example, Hindi query "प्लंबर का काम दिल्ली में" → `{ jobTitle: "plumber job", location: "Delhi" }`.

**Where It Appears:** Worker Job Browse → search bar

**How to Test:**
1. Go to `/worker/jobs`
2. Type a Hindi search query (e.g., `इलेक्ट्रीशियन हैदराबाद`)
3. **Expected:** Blue hint: "AI understood: electrician Hyderabad"
4. Results filtered accordingly

---

## 6. Platform Features

### 6.1 Escrow Payment System

**File:** `lib/escrowService.ts`

#### How It Works

Secure payment flow:
1. **Employer posts job** → redirected to payment page
2. **Employer funds escrow** → money held securely (status: "locked")
3. **Job goes live** when escrow is funded
4. **Worker completes job** → employer clicks "Release Payment"
5. **Platform deducts 10% commission** → remaining 90% released to worker
6. **Disputes:** Either party can raise a dispute → refund processed in 3–5 business days
7. WhatsApp notification sent to worker on payment release

#### How to Test

1. Post a job as an employer
2. On the payment page, complete the escrow funding
3. **Expected:** Job status changes from "Draft" to "Active"
4. Open the job detail → Escrow panel shows "Payment Secured" with amount breakdown
5. Accept an applicant → they complete the work
6. Click **"Job Done — Release Payment"**
7. **Expected:** Escrow released, amount shows: "Job Amount - 10% fee = Worker Receives"
8. To test dispute: click **"Raise a Dispute"** → fill in reason → submit
9. **Expected:** Refund status shows "Processing (3–5 business days)"

---

### 6.2 Trust Score & Reputation

**File:** `lib/escrowService.ts` (calculation), displayed throughout the app

#### How It Works

Every user has a trust score (0–100) calculated from:
- Completed jobs (weighted heavily)
- Average rating from counterparts
- Disputes (negative impact)
- On-time completion rate
- Account age

**Trust Levels:**
- **New** (0–39): Recently joined, limited privileges
- **Active** (40–69): Established presence
- **Trusted** (70–100): Verified reliable user — unlocked features (more job postings, priority visibility)

#### How to Test

1. Check your trust score on:
   - Worker Dashboard → stats card
   - Worker Profile → trust level banner
   - Settings → Trust & Reputation card
2. Complete jobs and receive ratings → score increases
3. Disputes → score decreases
4. **Expected:** Trust level badge updates (New → Active → Trusted) as score changes

---

### 6.3 Chat Safety Filter

**File:** `lib/chatFilter.ts`

#### How It Works

All chat messages pass through a safety filter before being sent:
- **Phone number blocking:** Indian mobile numbers in any format (+91, spaced, dashed, word-spelled)
- **Off-platform contact blocking:** WhatsApp, Telegram, Signal, Instagram, Facebook, LinkedIn, Twitter mentions
- **Fraud keyword detection:** "registration fee", "advance payment", "send money via GPay/PhonePe/Paytm"
- **Email blocking:** Any email address pattern
- **Hindi variant patterns:** "call kar", "number do", "number share karo"
- **Secondary layer:** `maskSensitiveContent()` hides leaked phone/email in received messages as `[phone hidden]`/`[email hidden]`

#### How to Test

1. Open any chat conversation
2. Try sending each of these messages (each should be **blocked**):
   - `"My number is 9876543210"` → blocked (phone number)
   - `"Add me on WhatsApp"` → blocked (off-platform contact)
   - `"Send advance payment via GPay"` → blocked (fraud keyword)
   - `"Email me at test@gmail.com"` → blocked (email)
   - `"Mera number share karo"` → blocked (Hindi variant)
3. **Expected for each:** Red toast — "Message blocked" with specific reason
4. Send a normal message like `"When should I come for work?"` → sends successfully

---

### 6.4 Voice Input

**File:** `components/ui/voice-input.tsx`

#### How It Works

Uses the **Web Speech API** (Chrome/Edge) for speech-to-text:
- Idle state: microphone button
- Click → listening state: pulsing red border animation
- Speak → processing state → text output
- Configurable language (default: `en-IN`)
- **Append mode:** Adds to existing text instead of replacing

**Used in:** Job search bar, Profile experience textarea

#### How to Test

1. Use Chrome or Edge browser (Voice Input is hidden on unsupported browsers)
2. Go to `/worker/jobs` → click the **microphone icon** in the search bar
3. **Expected:** Button turns red with pulse animation
4. Speak clearly: "Plumber near Hyderabad"
5. **Expected:** Text appears in the search bar, results auto-filter
6. Go to `/worker/profile` → Experience section → click microphone
7. Speak your experience → text appends to existing text in the textarea

---

### 6.5 Location Input with Google Places

**File:** `components/ui/location-input.tsx`

#### How It Works

Smart location input with two modes:
- **With Google Maps API key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): Google Places Autocomplete filtered to Indian cities, returns both text address and `{ lat, lng }` coordinates
- **Without API key:** Plain text input (graceful fallback)

**Used in:** Job posting form (location field)

#### How to Test

1. Go to `/employer/jobs/post`
2. Click the **Location** field
3. If Google API key is configured:
   - Start typing "Hyder" → autocomplete dropdown with Indian cities
   - Select "Hyderabad, Telangana" → field populates, lat/lng captured
4. If no API key:
   - Field works as a normal text input
   - Type any location text

---

### 6.6 Notification System

**File:** `components/ui/notification-bell.tsx`

#### How It Works

In-app notification system with:
- **Bell icon** in the navigation bar with unread count badge (red, "9+" overflow)
- **Popover dropdown** with notification list
- **Notification types:** job_match, application, message, payment, rating, system — each with a distinct icon
- **Auto-polling:** Fetches new notifications every 30 seconds
- **Auto-mark-read:** All notifications marked as read 1.5 seconds after opening the popover
- **Relative timestamps:** "just now", "5m ago", "2h ago", "3d ago"
- **"Mark all read"** button at the bottom

#### How to Test

1. Log in and look at the **bell icon** in the top navigation
2. If there are unread notifications: red badge with count
3. Click the bell → popover opens with notification list
4. **Expected:** Notifications sorted by time, each with an icon based on type
5. Wait 1.5 seconds → unread badge disappears (auto-marked as read)
6. Trigger a notification (e.g., apply to a job, receive a message)
7. Wait up to 30 seconds → new notification badge appears

---

### 6.7 Internationalization (i18n)

**Files:** `contexts/I18nContext.tsx`, `messages/en.json`, `messages/hi.json`, `messages/te.json`

#### How It Works

Full 3-language support:
- **English (en)**, **Hindi (hi)**, **Telugu (te)**
- **250+ translation keys** covering all UI: navigation, auth, dashboard, jobs, payments, settings, profile, applications
- **Variable interpolation:** `{{variable}}` syntax (e.g., "Welcome, {{name}}")
- **Persistence:** Locale stored in cookie + localStorage
- **`useI18n()` hook** provides `t(key, vars?)` function and `locale` value

**Language switcher** available in navigation and settings page.

#### How to Test

1. Click the **language switcher** in the navigation bar (globe icon)
2. Select **हिंदी (Hindi)**
3. **Expected:** Entire UI translates — navigation labels, button text, form labels, dashboard content
4. Switch to **తెలుగు (Telugu)**
5. **Expected:** Telugu translations appear
6. Reload the page → language persists (stored in cookie/localStorage)
7. Switch back to **English**

---

### 6.8 PWA Support

**File:** `app/manifest.ts`

#### How It Works

The app is a Progressive Web App:
- **App name:** "HyperLocal – AI Job Matching"
- **Display:** Standalone (hides browser UI)
- **Orientation:** Portrait
- **Theme color:** Indigo (#6366f1)
- **Icons:** Multiple sizes including maskable (192×192, 512×512)
- **Categories:** jobs, productivity, utilities

#### How to Test

1. Open the app in Chrome on Android
2. Click the browser menu (three dots) → **"Add to Home Screen"** or **"Install App"**
3. **Expected:** App installs with the HyperLocal icon
4. Open from home screen → app runs in standalone mode (no browser address bar)
5. On desktop Chrome: look for install icon in the address bar → click to install

---

### 6.9 Role-Based Skills System

**File:** `lib/roleSkills.ts`

#### How It Works

Manages job categories and their associated skills:
- **31 job categories** split into Technical (10) and Non-Technical (20) + Other
- **8 context-appropriate skills per category** (e.g., Plumbing: Pipe Fitting, Leak Repair, Drainage Systems...)
- `getRoleSkills(category)` — returns relevant skills for form display
- `isRoleTechnical(category)` — determines if resume upload is required for that job
- `inferJobNature(category)` — auto-detects technical vs. non-technical

**Used in:** Job posting form (skill selection), Job detail (resume requirement), Profile (category selection)

#### How to Test

1. Go to `/employer/jobs/post`
2. Select category **"Plumbing"**
3. **Expected:** 8 plumbing skills appear as badges (Pipe Fitting, Leak Repair, etc.)
4. Change to **"Software Development"**
5. **Expected:** 8 tech skills appear (JavaScript, Python, React, etc.) + "Technical Job" indicator
6. Change to **"Cooking"**
7. **Expected:** 8 cooking skills appear (Indian Cuisine, Baking, etc.) + "Non-Technical Job" indicator

---

### 6.10 Settings & Account Management

**File:** `app/settings/page.tsx`

#### How It Works

Unified settings page for all roles:
- **Trust & Reputation card:** Trust score, trust level badge with color coding
- **Change Password:** Current → New → Confirm (min 8 chars); auto re-login after change
- **Update Phone Number:** OTP-based verification (Send OTP → enter OTP → verify → update)
- **Adaptive Nav:** Automatically shows WorkerNav, EmployerNav, or AdminNav based on role
- **Sign Out:** Logout button in danger zone

#### How to Test

##### Change Password
1. Navigate to `/settings`
2. Enter current password: `Password@123`
3. Enter new password: `NewPassword@456`
4. Confirm new password
5. Click **"Change Password"**
6. **Expected:** Success toast, auto re-logged in
7. Logout and login with new password to verify

##### Update Phone Number
1. In Settings, scroll to **Update Phone Number**
2. Enter a new phone number
3. Click **"Send OTP"**
4. In demo mode: OTP displayed on screen
5. Enter OTP and click **"Verify"**
6. **Expected:** Phone number updated, shown in profile

##### Sign Out
1. Scroll to bottom → click **"Sign Out"**
2. **Expected:** Redirected to login page, session cleared

---

## Quick Reference: Test Accounts

All seed users use password: **`Password@123`**

| Role | Phone Number | Name |
|------|-------------|------|
| Worker | 9876543210 | (Check seed.sql for names) |
| Employer | 9876543211 | (Check seed.sql for names) |
| Admin | (Check seed.sql) | Platform Admin |

> Run `supabase/seed.sql` to load 32 test users with jobs, applications, conversations, and escrow transactions.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NEXT_PUBLIC_GEMINI_API_KEYS` | Yes | Comma-separated Gemini API keys |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Google Maps API key for location autocomplete |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key for admin operations |

---

## Architecture Summary

```
┌──────────────────┐     HTTPS/JSON     ┌────────────────────────┐
│                  │ ──────────────────► │  Supabase Edge Fns     │
│  Next.js 16 App  │ ◄────────────────── │  (11 Deno functions)   │
│  (React 19 + TS) │                    │                        │
│                  │                    │  _shared/auth.ts       │
│  lib/gemini.ts ──┼── Gemini AI ──────► │  _shared/crypto.ts     │
│  lib/api.ts    ──┼── API calls ──────► │                        │
│                  │                    └────────────┬───────────┘
└──────────────────┘                                │
                                         ┌──────────▼───────────┐
                                         │  Supabase PostgreSQL  │
                                         │  + Row-Level Security │
                                         │  + Realtime (chat)    │
                                         └───────────────────────┘
```

**16 Gemini AI Functions** | **11 Edge Functions** | **31 Job Categories** | **250+ i18n Keys** | **3 Languages** | **70+ UI Components**
