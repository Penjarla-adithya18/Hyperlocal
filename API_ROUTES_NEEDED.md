# API Routes Structure Guide
## Routes Needed for Production

**Current Status:** All data operations are handled client-side using mock services.  
**For Production:** Create these API routes to connect frontend to real backend.

---

## Authentication Routes

### POST /api/auth/send-otp
**Purpose:** Send OTP to phone number  
**Body:**
```json
{
  "phone": "9876543210",
  "role": "worker" | "employer"
}
```
**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionId": "xxx"
}
```

### POST /api/auth/verify-otp
**Purpose:** Verify OTP and create session  
**Body:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "sessionId": "xxx"
}
```
**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": { ...userObject }
}
```

### POST /api/auth/signup
**Purpose:** Register new user  
**Body:**
```json
{
  "phone": "9876543210",
  "name": "John Doe",
  "role": "worker" | "employer",
  "password": "hashed",
  "email": "optional@email.com"
}
```

### POST /api/auth/login
**Purpose:** Login existing user  
**Body:**
```json
{
  "phone": "9876543210",
  "password": "password"
}
```

### POST /api/auth/logout
**Purpose:** Invalidate session

### POST /api/auth/forgot-password
**Purpose:** Send password reset OTP

---

## User/Profile Routes

### GET /api/users/[id]
**Purpose:** Get user profile  
**Response:** User object with profile data

### PUT /api/users/[id]
**Purpose:** Update user profile  
**Body:** Updated user fields

### GET /api/users/me
**Purpose:** Get current authenticated user

### POST /api/users/[id]/verify
**Purpose:** Admin verify user account

### POST /api/users/[id]/ban
**Purpose:** Admin ban user

---

## Worker Routes

### GET /api/workers/[id]/profile
**Purpose:** Get worker profile details

### PUT /api/workers/[id]/profile
**Purpose:** Update worker profile  
**Body:**
```json
{
  "skills": ["carpentry", "plumbing"],
  "availability": "full-time",
  "location": "Mumbai",
  "bio": "Experienced worker..."
}
```

### POST /api/workers/[id]/documents
**Purpose:** Upload verification documents  
**Body:** FormData with files

### GET /api/workers/[id]/stats
**Purpose:** Get worker statistics

---

## Employer Routes

### GET /api/employers/[id]/profile
**Purpose:** Get employer profile

### PUT /api/employers/[id]/profile
**Purpose:** Update employer profile  
**Body:**
```json
{
  "company": {
    "name": "ABC Company",
    "type": "small_business",
    "industry": "Construction"
  }
}
```

### GET /api/employers/[id]/stats
**Purpose:** Get employer statistics

---

## Job Routes

### GET /api/jobs
**Purpose:** List all jobs with filters  
**Query Params:**
- `category` - Filter by category
- `location` - Filter by city
- `type` - full-time, part-time, gig
- `minSalary` - Minimum salary
- `maxSalary` - Maximum salary
- `search` - Search query
- `page` - Pagination
- `limit` - Results per page

### GET /api/jobs/[id]
**Purpose:** Get single job details

### POST /api/jobs
**Purpose:** Create new job (employer only)  
**Body:**
```json
{
  "title": "Carpenter Needed",
  "category": "Construction",
  "description": "...",
  "requirements": ["Experience", "Tools"],
  "location": {
    "city": "Mumbai",
    "address": "..."
  },
  "salary": {
    "min": 500,
    "max": 800,
    "type": "daily"
  },
  "skills": ["carpentry"],
  "slots": { "total": 2 }
}
```

### PUT /api/jobs/[id]
**Purpose:** Update job (employer only)

### DELETE /api/jobs/[id]
**Purpose:** Delete/cancel job

### GET /api/jobs/[id]/applications
**Purpose:** Get all applications for a job

### GET /api/jobs/matched
**Purpose:** Get AI-matched jobs for worker  
**Query:** `workerId`  
**Response:** Jobs with match scores

---

## Application Routes

### POST /api/applications
**Purpose:** Apply to a job  
**Body:**
```json
{
  "jobId": "job_123",
  "workerId": "worker_456",
  "coverLetter": "I am interested...",
  "proposedSalary": 600
}
```

### GET /api/applications/[id]
**Purpose:** Get single application

### PUT /api/applications/[id]
**Purpose:** Update application status  
**Body:**
```json
{
  "status": "accepted" | "rejected" | "shortlisted"
}
```

### GET /api/applications/worker/[workerId]
**Purpose:** Get all applications by worker

### GET /api/applications/job/[jobId]
**Purpose:** Get all applications for job

---

## Chat Routes

### GET /api/chat/conversations
**Purpose:** Get user's conversations  
**Query:** `userId`

### GET /api/chat/conversations/[id]
**Purpose:** Get single conversation with messages

### POST /api/chat/conversations
**Purpose:** Create new conversation  
**Body:**
```json
{
  "participants": ["user1", "user2"],
  "jobId": "job_123"
}
```

### POST /api/chat/messages
**Purpose:** Send message  
**Body:**
```json
{
  "conversationId": "conv_123",
  "senderId": "user_123",
  "content": "Hello!",
  "type": "text"
}
```

### PUT /api/chat/messages/[id]/read
**Purpose:** Mark message as read

---

## Rating Routes

### POST /api/ratings
**Purpose:** Submit rating  
**Body:**
```json
{
  "jobId": "job_123",
  "fromUserId": "user_123",
  "toUserId": "user_456",
  "rating": 4.5,
  "review": "Great work!",
  "categories": {
    "communication": 5,
    "punctuality": 4,
    "quality": 5
  }
}
```

### GET /api/ratings/user/[userId]
**Purpose:** Get ratings for a user

### GET /api/ratings/job/[jobId]
**Purpose:** Get ratings for a job

---

## Escrow Routes

### POST /api/escrow/create
**Purpose:** Create escrow transaction  
**Body:**
```json
{
  "jobId": "job_123",
  "employerId": "emp_123",
  "workerId": "worker_456",
  "amount": 5000
}
```

### GET /api/escrow/[id]
**Purpose:** Get escrow transaction details

### POST /api/escrow/[id]/release
**Purpose:** Release payment to worker

### POST /api/escrow/[id]/refund
**Purpose:** Refund payment to employer

### POST /api/escrow/[id]/dispute
**Purpose:** Raise dispute

---

## Trust Score Routes

### GET /api/trust-score/[userId]
**Purpose:** Get trust score for user

### POST /api/trust-score/[userId]/calculate
**Purpose:** Recalculate trust score (admin/cron)

---

## Report Routes

### POST /api/reports
**Purpose:** Submit report  
**Body:**
```json
{
  "reportedBy": "user_123",
  "reportedUser": "user_456",
  "reason": "fraud",
  "description": "This user..."
}
```

### GET /api/reports
**Purpose:** Get all reports (admin only)  
**Query:** `status`, `page`, `limit`

### GET /api/reports/[id]
**Purpose:** Get single report

### PUT /api/reports/[id]
**Purpose:** Update report status  
**Body:**
```json
{
  "status": "resolved" | "dismissed",
  "resolution": "Action taken..."
}
```

---

## Notification Routes

### GET /api/notifications
**Purpose:** Get user notifications  
**Query:** `userId`, `unread`, `limit`

### PUT /api/notifications/[id]/read
**Purpose:** Mark notification as read

### PUT /api/notifications/read-all
**Purpose:** Mark all as read

### POST /api/notifications/send
**Purpose:** Send notification (internal/admin)

---

## Admin Routes

### GET /api/admin/stats
**Purpose:** Get platform statistics  
**Response:**
```json
{
  "totalUsers": 1500,
  "activeWorkers": 800,
  "activeEmployers": 200,
  "totalJobs": 450,
  "activeJobs": 120,
  "totalApplications": 3200,
  "pendingReports": 15
}
```

### GET /api/admin/users
**Purpose:** Get all users with filters

### POST /api/admin/users/[id]/verify
**Purpose:** Verify user account

### POST /api/admin/users/[id]/ban
**Purpose:** Ban user

### GET /api/admin/reports/pending
**Purpose:** Get pending reports

### GET /api/admin/escrow
**Purpose:** Monitor escrow transactions

---

## Search Routes

### GET /api/search/jobs
**Purpose:** Full-text search for jobs  
**Query:** `q`, `location`, `filters`

### GET /api/search/workers
**Purpose:** Search for workers (employer feature)  
**Query:** `skills`, `location`, `availability`

---

## Analytics Routes

### GET /api/analytics/user/[userId]
**Purpose:** Get user analytics

### GET /api/analytics/job/[jobId]
**Purpose:** Get job analytics

### GET /api/analytics/platform
**Purpose:** Platform-wide analytics (admin)

---

## Webhook Routes (For Payment Gateway)

### POST /api/webhooks/razorpay
**Purpose:** Handle Razorpay webhooks

### POST /api/webhooks/stripe
**Purpose:** Handle Stripe webhooks

---

## File Upload Routes

### POST /api/upload/profile-photo
**Purpose:** Upload profile photo  
**Body:** FormData with image

### POST /api/upload/documents
**Purpose:** Upload verification documents

### POST /api/upload/company-logo
**Purpose:** Upload company logo

### POST /api/upload/chat-attachment
**Purpose:** Upload chat attachment

---

## Implementation Example

### Sample API Route Structure

```typescript
// app/api/jobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getJobs, createJob } from '@/lib/database';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const location = searchParams.get('location');
    
    const jobs = await getJobs({ category, location });
    
    return NextResponse.json({ 
      success: true, 
      data: jobs 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user || user.role !== 'employer') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const job = await createJob(body, user.id);
    
    return NextResponse.json({
      success: true,
      data: job
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
```

---

## Current Frontend Usage

All frontend pages currently use mock services from `/lib/mockDb.ts`.  
To connect to real API routes:

### Before (Mock):
```typescript
// In component
const jobs = mockDb.getJobs({ category: 'Construction' });
```

### After (Real API):
```typescript
// In component
const response = await fetch('/api/jobs?category=Construction');
const { data: jobs } = await response.json();
```

---

## Middleware Needed

### /middleware.ts
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get('auth_token');
  
  if (!token && request.nextUrl.pathname.startsWith('/worker')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (!token && request.nextUrl.pathname.startsWith('/employer')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (!token && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/worker/:path*', '/employer/:path*', '/admin/:path*']
};
```

---

## Security Considerations for API Routes

1. **Authentication:** Verify JWT tokens on all protected routes
2. **Authorization:** Check user roles for admin/employer-only routes
3. **Rate Limiting:** Implement rate limits (use Upstash Redis)
4. **Input Validation:** Validate all request bodies (use Zod)
5. **SQL Injection:** Use parameterized queries/ORM
6. **CORS:** Configure proper CORS headers
7. **Error Handling:** Don't leak sensitive info in errors
8. **Logging:** Log all API requests for monitoring

---

## Priority Implementation Order

1. **Authentication APIs** (send-otp, verify-otp, signup, login)
2. **User/Profile APIs** (get, update)
3. **Job APIs** (list, create, get, update)
4. **Application APIs** (create, list, update)
5. **Chat APIs** (conversations, messages)
6. **Rating APIs** (create, get)
7. **Escrow APIs** (create, release)
8. **Admin APIs** (stats, moderation)
9. **Search APIs** (full-text search)
10. **Analytics APIs** (tracking, reporting)

---

## Testing API Routes

Use tools like:
- **Postman** - API testing
- **Thunder Client** (VS Code extension)
- **curl** - Command line testing
- **Playwright** - E2E testing

---

**Note:** Currently, all data operations happen client-side using mock services. Creating these API routes is the critical next step for production deployment.
