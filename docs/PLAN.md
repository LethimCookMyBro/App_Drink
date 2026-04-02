# Plan

## Goal
Review the current Next.js full-stack app with a code-review mindset, then clean up dead/duplicate code and remove performance bottlenecks without removing animations.

## Current Scope
- App router pages in `src/app/*`
- API routes in `src/app/api/*`
- Shared logic in `src/lib/*`, `src/hooks/*`, `src/store/*`, `src/components/ui/*`
- Database and runtime config in `prisma/*`, `prisma.config.ts`, `src/lib/db.ts`
- App shell and client boot paths in `src/app/layout.tsx`, `src/middleware.ts`, `src/components/ThemeProvider.tsx`

## Phase 1: Review Findings
1. Inspect correctness and regressions in the main user flows.
   - `src/app/login/page.tsx`
   - `src/app/register/page.tsx`
   - `src/app/create/page.tsx`
   - `src/app/join/page.tsx`
   - `src/app/lobby/[roomCode]/page.tsx`
   - `src/app/game/*`
   - `src/app/profile/page.tsx`
   - `src/app/history/page.tsx`
2. Inspect API safety and data flow.
   - `src/app/api/auth/*`
   - `src/app/api/admin/*`
   - `src/app/api/rooms/*`
   - `src/app/api/feedback/*`
   - `src/app/api/questions/*`
   - `src/app/api/user/*`
3. Check security-sensitive plumbing.
   - `src/middleware.ts`
   - `src/lib/apiUtils.ts`
   - `src/lib/auth.ts`
   - `src/lib/adminAuth.ts`
   - `src/lib/roomAuth.ts`
   - `src/lib/requestSecurity.ts`
   - `src/lib/cloudflare.ts`

## Phase 2: Clean Code
1. Remove dead code and stale branches.
   - Unused exports in `src/hooks/index.ts`, `src/components/ui/index.ts`, `src/lib/*`
   - Fallback logic that no longer matches the PostgreSQL flow
2. Deduplicate repeated logic.
   - Repeated origin/rate-limit guards in API routes
   - Repeated auth form submit/error patterns in client pages
   - Repeated room and question sanitization checks
3. Tighten naming and structure.
   - Prefer small helpers with one job
   - Keep page components thin and move shared logic into `src/lib/*` or `src/hooks/*`

## Phase 3: Performance
1. Measure first, then optimize.
   - Load-time checks for `src/app/layout.tsx` and the heaviest game pages
   - Interaction checks for `src/app/game/play/page.tsx`, `src/app/game/summary/page.tsx`, `src/app/lobby/[roomCode]/page.tsx`
2. Focus on likely wins.
   - Reduce unnecessary client re-renders in hooks and stores
   - Avoid repeated data fetches in lobby/profile/history flows
   - Keep animations, but make sure they do not block first paint or input
3. Preserve the current visual language.
   - Do not remove Framer Motion usage unless a specific animation causes measurable jank
   - Prefer lighter animation props, shorter lists, and fewer rerenders over deleting motion

## Dependencies And Risks
- The app recently migrated to PostgreSQL and Cloudflare Turnstile, so DB and auth changes must be reviewed as one unit.
- Many files are already modified in the worktree; do not revert unrelated user changes.
- `package.json`, `prisma.config.ts`, and `src/lib/db.ts` are now critical runtime files and should be treated as high-risk edits.
- Some code paths may still be using stale SQLite assumptions or placeholder fallback text.

## Verification
- `npx tsc --noEmit --pretty false --incremental false`
- `cd /mnt/d/fortestdrink/wong-taek-app && git diff --check`
- Security scan with the repo script when implementation starts
- Lint on touched files only after each change batch
- Manual smoke test for login, register, create/join/lobby, gameplay, profile, and admin login

## Done Criteria
- Review findings are documented with file-level references.
- Dead and duplicate code is removed without breaking imports.
- Performance changes are measured and do not remove animations.
- The app still passes type-check and diff-check after each change batch.
