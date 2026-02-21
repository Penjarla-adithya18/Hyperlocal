# Stabilization Checklist (Codebase Consistency Pass)

Date: 2026-02-21  
Scope: Align app routes, imports, data contracts, and service exports so the project can compile and match documented behavior.

---

## P0 — Build-Blocking Contract Issues

### 1) Missing `mockDb` export/API facade in `lib/mockDb.ts`
**Problem**
- Many pages import `mockDb` and call methods like `getAllJobs`, `getJobById`, `createJob`, `getConversationsByUser`, etc.
- `lib/mockDb.ts` currently exports operation groups (`mockJobOps`, `mockApplicationOps`, etc.) but no `mockDb` object with those method names.

**Impact**
- Immediate import/runtime/type failures across worker/employer/chat pages.

**Files using `mockDb` object**
- `app/worker/jobs/page.tsx`
- `app/worker/jobs/[id]/page.tsx`
- `app/worker/chat/page.tsx`
- `app/worker/applications/page.tsx`
- `app/employer/jobs/post/page.tsx`
- (and other pages via same pattern)

**Fix options**
- **Option A (minimal):** Add `export const mockDb = { ... }` facade in `lib/mockDb.ts` that delegates to existing ops.
- **Option B (cleaner):** Refactor all pages to call `mock*Ops` modules directly and remove `mockDb` usage.

---

### 2) Missing `matchJobs` export in `lib/aiMatching.ts`
**Problem**
- `app/worker/jobs/page.tsx` imports and calls `matchJobs`.
- `lib/aiMatching.ts` exports `calculateMatchScore`, `getRecommendedJobs`, `getBasicRecommendations`, but not `matchJobs`.

**Impact**
- Import failure in worker jobs page.

**Fix**
- Add a `matchJobs` helper that maps `Job[] -> { job, score }[]` using current scoring logic, or update page to use existing exported functions.

---

### 3) `escrowService` references non-existent model/functions
**Problem**
- `lib/escrowService.ts` imports `EscrowTransaction` from `lib/types.ts` (not present).
- Calls `mockDb.createEscrowTransaction`, `mockDb.getEscrowTransactionById`, `mockDb.getAllEscrowTransactions` (not present).

**Impact**
- Compile/type errors and dead escrow service path.

**Fix**
- Add escrow types + storage ops, or temporarily remove/feature-flag escrow service usage until model is implemented.

---

### 4) Component export/import mismatch (default vs named)
**Problem**
- `components/worker/WorkerNav.tsx` and `components/employer/EmployerNav.tsx` export named functions.
- Several pages import them as default imports.

**Impact**
- Module import errors.

**Files to fix**
- `app/worker/jobs/page.tsx`
- `app/worker/jobs/[id]/page.tsx`
- `app/worker/chat/page.tsx`
- `app/worker/applications/page.tsx`
- `app/employer/jobs/page.tsx`
- `app/employer/jobs/post/page.tsx`
- `app/employer/chat/page.tsx`

**Fix**
- Standardize to named imports (recommended) or add default exports in nav components.

---

## P1 — Route/Navigation Drift

### 5) Worker nav path mismatch
**Problem**
- Nav links to `/worker/messages`, but implemented page is `/worker/chat`.

**File**
- `components/worker/WorkerNav.tsx`

### 6) Employer nav path mismatches
**Problem**
- Nav/dashboard link to non-existent routes:
  - `/employer/post-job` (implemented: `/employer/jobs/post`)
  - `/employer/applicants` (missing)
  - `/employer/messages` (implemented: `/employer/chat`)

**Files**
- `components/employer/EmployerNav.tsx`
- `app/employer/dashboard/page.tsx`

### 7) Admin nav links to missing pages
**Problem**
- Admin nav points to `/admin/jobs` and `/admin/trust`, but only dashboard/users/reports exist.

**File**
- `components/admin/AdminNav.tsx`

**Fix strategy**
- Either create missing pages, or update nav to implemented routes only.

---

## P1 — Data Model Drift (`types.ts` vs page usage)

### 8) User field mismatches in app pages
**Problem examples**
- Pages reference `user.email`, `user.phone`, `user.companyName`.
- `User` model has `phoneNumber`; no `email` or `companyName` fields.

**Files with drift**
- `app/admin/users/page.tsx`
- `app/worker/jobs/page.tsx`
- `app/worker/jobs/[id]/page.tsx`
- `app/worker/chat/page.tsx`

### 9) Job field mismatches in app pages
**Problem examples**
- Pages reference `payAmount`, `payType`, `duration`, `experienceRequired`.
- `Job` model defines `pay`, `timing`, `jobType` and does not include those fields.

**Files with drift**
- `app/worker/jobs/page.tsx`
- `app/worker/jobs/[id]/page.tsx`
- `app/worker/applications/page.tsx`
- `app/employer/jobs/post/page.tsx`

### 10) Worker profile completeness checked on wrong model
**Problem**
- `app/worker/dashboard/page.tsx` checks `profile.profileCompleted`.
- `WorkerProfile` has no `profileCompleted`; this flag exists on `User`.

---

## P2 — Documentation Alignment

### 11) Completion docs overstate implementation consistency
**Observed**
- Documentation claims all features complete, but source has contract/routing inconsistencies and unresolved model drift.

**Files to update after stabilization**
- `README.md`
- `PROJECT_COMPLETION.md`
- `FINAL_COMPLETION_REPORT.md`

---

## Recommended Execution Order

1. **Stabilize imports/exports** (`mockDb` facade + `matchJobs` + nav import style)
2. **Normalize route links** (worker/employer/admin nav + dashboard links)
3. **Choose canonical data model** and update pages (User/Job fields)
4. **Fix escrow model/service** (or temporarily disable)
5. **Run install + build** (`npm install`, `npm run build`) and resolve remaining TypeScript errors
6. **Update docs** to match actual state

---

## Acceptance Criteria

- `npm run build` succeeds locally.
- No unresolved imports from `lib/aiMatching`, `lib/mockDb`, nav components.
- Navigation links only target existing routes.
- App pages use fields that exist in `lib/types.ts` (or types are intentionally expanded).
- Escrow service compiles with valid types and backing mock methods (or is clearly removed/flagged).
- Documentation status aligns with source reality.
