# Production Audit Fix Plan

## Execution Mode

Local orchestration. No code implementation in this plan.

Specialist perspectives applied:

- Planning: convert accepted audit findings into ordered execution work.
- Architecture: define authoritative state boundaries and merge related fixes.
- API patterns: identify contract changes and route ownership.
- Database design: identify schema, migration, constraints, and data integrity work.
- Clean code: keep fixes small, centralized, and avoid parallel shadow models.
- Test strategy: define regression tests before broad refactors.

## Root Cause Groups

| Root cause | Findings covered | Core correction |
|---|---|---|
| Client-authoritative gameplay state | forged `/progress`, participant `/complete`, refresh resets round state | Move gameplay progress and completion authority to server-side session/event state. |
| Room/session state not exposed consistently | lobby polling lacks active session state, refresh desync | Make room summary return active session and hydrate clients from DB state. |
| Local-only shared room data | custom questions in `localStorage` only | Persist room-scoped custom questions in DB and expose through room APIs. |
| Authenticated-but-not-authorized admin APIs | admin roles exist but routes are not role-aware | Add centralized role-aware admin authorization and apply it per route. |
| Weak abuse identity and route exemptions | public random question endpoint exemption, shared `unknown` bucket | Make rate-limit subject trustworthy by default and apply limits to DB-writing public routes. |
| Unsafe deployment/data scripts | build runs `prisma db push`, seed deletes all questions | Move schema mutation out of build and make seed non-destructive. |
| Runtime/schema drift | dead/illusory gameplay models | Either fully use `GameEvent`/player counters or remove them after migration. |

## Authoritative State Model

| Area | Authoritative source | Client responsibility | Notes |
|---|---|---|---|
| Rooms | `Room` row | Render and request changes | `Room.isActive` remains room lifecycle state, not gameplay progress state. |
| Lobby players | `Player` rows for the room | Optimistic UI only | Add/edit/remove/reorder should be reflected by polling/reload. |
| Active gameplay session | `GameSession` row with `status = ACTIVE` | Store only UI cache/session pointer | Room summary should expose the active session summary. |
| Gameplay progress | Server-written `GameEvent` rows plus transactional `GameSession` aggregates | Send intent/event request, not final counters | Use idempotency or unique round/event constraints. |
| Completion | Server transition of `GameSession.status` | Host triggers completion request | Participants must not be able to complete a room/session. |
| Public questions | `Question` rows | Request random question | DB-writing random endpoint must be rate limited. |
| Room custom questions | New room-scoped DB model | Edit via API, cache locally only as fallback UI | LocalStorage cannot be source of truth for shared room data. |
| Stats | `GameSession` aggregates and/or `GameEvent` facts | Display DB-derived history | Avoid stats derived from localStorage or unwritten models. |
| Admin permissions | `Admin.role` | UI may hide unavailable actions | Server must enforce roles even if UI exposes a button. |
| Rate limit identity | Runtime IP or trusted-proxy IP, then explicit fallback subject | None | Default must not collapse all users into one `unknown` bucket. |

## Refactors To Merge

| Merge these findings | Why |
|---|---|
| forged `/progress`, refresh round reset, stats integrity, dead `GameEvent` model | A single server-side progress/event service fixes authority, replay, aggregate stats, and dead model drift. |
| participant `/complete` and progress authorization | Both need the same session/room role decision: host or explicitly authorized controller only. |
| lobby active session polling and gameplay hydration | Both depend on a shared room/session summary contract. |
| custom questions and lobby room summary | Custom questions are room state and should be returned or linked from the room loading flow. |
| random endpoint exemption and `unknown` rate-limit bucket | Both are rate-limit trust-boundary problems and should be fixed in one pass. |
| build `db push` and destructive seed | Both are deployment/data-safety controls and can ship independently from gameplay changes. |

## Finding Implementation Matrix

| Finding | Files likely to change | Schema | API contract | UI | Migration | Tests |
|---|---|---:|---:|---:|---:|---:|
| Participant can forge `/progress` and inflate stats | `src/app/(backend)/api/rooms/[code]/progress/route.ts`, `src/backend/roomAuth.ts`, new `src/backend/gameSessionService.ts`, `src/frontend/game/gameSession.ts`, `src/app/(frontend)/game/play/page.tsx`, mode pages | Yes | Yes | Yes | Yes | Yes |
| Participant can call `/complete` | `src/app/(backend)/api/rooms/[code]/complete/route.ts`, `src/backend/roomAuth.ts`, new `src/backend/gameSessionService.ts` | Maybe | Maybe | No | Maybe | Yes |
| Lobby polling does not expose active session state | `src/app/(backend)/api/rooms/[code]/route.ts`, `src/backend/roomService.ts`, `src/app/(frontend)/lobby/[roomCode]/page.tsx`, `src/shared/schemas.ts` | No | Yes | Yes | No | Yes |
| Admin roles exist but authorization is not role-aware | `src/backend/adminAuth.ts`, `src/app/(backend)/api/admin/**/route.ts`, `src/app/(backend)/api/questions/route.ts`, `src/app/(backend)/api/questions/[id]/route.ts`, admin UI pages | No | No | Maybe | No | Yes |
| Refresh resets client round state and desyncs with persisted session | `src/frontend/game/gameSession.ts`, gameplay pages, `src/app/(backend)/api/rooms/[code]/route.ts`, maybe new `src/app/(backend)/api/sessions/[sessionId]/route.ts` | Maybe | Yes | Yes | Maybe | Yes |
| Custom questions exist only in `localStorage` and are not room-shared | `prisma/schema.prisma`, new `src/app/(backend)/api/rooms/[code]/questions/route.ts`, `src/app/(backend)/api/rooms/[code]/route.ts`, `src/app/(frontend)/lobby/[roomCode]/page.tsx`, `src/shared/schemas.ts` | Yes | Yes | Yes | Yes | Yes |
| Public random question endpoint is exempt from global rate limit despite DB writes | `src/proxy.ts`, `src/app/(backend)/api/questions/random/route.ts`, `src/backend/rateLimit.ts` | No | No | No | No | Yes |
| Default rate limiting collapses users into shared `unknown` bucket | `src/backend/requestSecurity.ts`, `src/backend/rateLimit.ts`, `.env.example`, deployment docs | No | No | No | No | Yes |
| Build runs `prisma db push` | `package.json`, deployment docs, CI config if present | No | No | No | No | Build validation |
| Seed script deletes all questions | `prisma/seed.ts`, `package.json` if seed scripts change | No | No | No | No | Seed dry-run/test |
| Dead/illusory gameplay models exist | `prisma/schema.prisma`, `src/backend/userGameStats.ts`, `src/frontend/game/gamePlayerStats.ts`, gameplay routes | Yes if removed or completed | Maybe | Maybe | Yes if schema changes | Yes |

## Phase 1: Security And Integrity Hotfixes

Goal: close active trust-boundary bugs without waiting for the full gameplay refactor.

Tasks:

- Add `requireRoomHost` or equivalent authoritative helper in `src/backend/roomAuth.ts`.
- Change `/api/rooms/[code]/complete` to require host authority and verify the active session belongs to the room before completing.
- Temporarily restrict `/api/rooms/[code]/progress` to host authority while the event model is added.
- Add strict progress validation so submitted `sessionId` must match the active room session.
- Add centralized `requireAdminRole(minRole | allowedRoles)` in `src/backend/adminAuth.ts`.
- Apply role checks to admin mutation/export/user-management/question-management routes.
- Remove the global rate-limit exemption for `/api/questions/random` or add equivalent per-route rate limiting before DB writes.
- Replace the insecure `unknown` rate-limit subject behavior with a fail-safe subject strategy.

Dependencies:

- This phase can ship before schema changes if progress is host-restricted first.
- Admin route role mapping must be decided before code changes.

Exit criteria:

- Participants cannot complete a session.
- Participants cannot advance or inflate persisted progress unless explicitly authorized.
- Lower-privilege admins receive server-side 403s for restricted operations.
- `/api/questions/random` is rate limited.
- Rate-limit keys do not collapse all untrusted requests into one shared `unknown` bucket.

## Phase 2: State-Authority Corrections

Goal: make DB/session state the source of truth for lobby, gameplay, custom questions, progress, and stats.

Tasks:

- Add a server-side gameplay service, likely `src/backend/gameSessionService.ts`, for start/progress/complete transitions.
- Extend `GameEvent` or replace it with a concrete event model used by real gameplay.
- Add idempotency to progress writes using `clientEventId` or a unique `(sessionId, roundNumber, eventType)` strategy.
- Maintain `GameSession.roundCount`, `GameSession.totalDrinks`, `startedAt`, `endedAt`, and `status` transactionally.
- Update `/api/rooms/[code]` and `src/backend/roomService.ts` to return active session summary.
- Update lobby polling to react to active session state and avoid stale local-only assumptions.
- Update gameplay pages to hydrate current round/session state from server on load or refresh.
- Add a DB-backed room custom question model and route.
- Replace custom-question localStorage authority with API-backed add/edit/remove flow.
- Update stats helpers to read from the authoritative `GameSession` aggregate or event facts, not unwritten/local-only state.

Dependencies:

- Schema migration for room custom questions and event idempotency should land before UI conversion.
- Frontend hydration should land after room/session API response is stable.

Exit criteria:

- Refreshing during gameplay resumes from persisted session state.
- Other clients can see that a room has an active session.
- Room custom questions survive refresh and are shared across clients.
- Persisted stats match completed real gameplay sessions.
- `GameEvent` is either used by production flows or scheduled for removal in Phase 4.

## Phase 3: Deployment And Data Safety Fixes

Goal: prevent deploy/build/seed commands from mutating production data unexpectedly.

Tasks:

- Change `package.json` build script from `prisma generate && prisma db push && next build` to `prisma generate && next build`.
- Add or document `prisma migrate deploy` as the production migration command.
- Make `prisma/seed.ts` non-destructive by replacing `question.deleteMany()` with `upsert` or a guarded reset-only path.
- Add an explicit environment guard so destructive seed/reset behavior cannot run in production by accident.
- Document required env configuration for trusted proxy IP headers and rate-limit identity.

Dependencies:

- Can ship independently from gameplay changes.
- If migrations are added in Phase 2, deployment scripts must support applying them safely.

Exit criteria:

- Build never mutates the database.
- Seed can be run without deleting existing production questions.
- Production deploy path is migration-based and repeatable.

## Phase 4: Cleanup And Dead-Model Removal

Goal: remove drift after authoritative models are in place.

Tasks:

- Remove obsolete localStorage-only gameplay/stat helpers or demote them to cache-only utilities.
- Remove unused Prisma fields/models only after migration and code search confirm no production route depends on them.
- Consolidate duplicate session, progress, and stats logic into backend service functions.
- Simplify route handlers so validation, authorization, and DB writes are not copied across endpoints.
- Delete dead imports, unused schemas, unused helpers, and fake feature paths surfaced by the refactor.

Dependencies:

- Must wait until Phase 2 confirms which gameplay models are real.
- Requires full typecheck/build after each removal batch.

Exit criteria:

- No production-facing feature depends on local-only shadow state.
- No unused gameplay/stat models remain without a documented future purpose.
- Backend route handlers are thin wrappers around shared service logic.

## Top 5 First Code Changes

1. Add host-only room authorization helper and apply it to `/complete`.
2. Restrict `/progress` to authorized host/session controller and verify active `sessionId`.
3. Remove or replace the `/api/questions/random` rate-limit exemption.
4. Fix rate-limit subject derivation so untrusted requests do not share `"unknown"`.
5. Remove `prisma db push` from `build` and add a safe migration command.

## Top 5 Regression Tests To Add First

1. Participant token calling `POST /api/rooms/[code]/complete` returns 403 and does not change `GameSession.status`.
2. Participant token calling `POST /api/rooms/[code]/progress` cannot increment `roundCount` or `totalDrinks`.
3. `GET /api/rooms/[code]` returns active session summary after host starts a game.
4. `/api/questions/random` is rate limited and does not perform unlimited DB `usageCount` writes.
5. Refresh/resume flow loads persisted round/session state instead of starting from client round `1`.

## Key Risks And Tradeoffs

- Host-only progress is the safest hotfix but may reduce multi-device participant-driven gameplay unless a proper server event protocol is added immediately after.
- `GameEvent` should be completed rather than removed if auditability, idempotency, and stat reconstruction matter.
- Adding room custom questions requires a migration and UI contract change; keep a backward-compatible localStorage import path for existing unsaved draft questions if user data matters.
- Stronger admin role checks may expose previously hidden product decisions; define route-to-role mapping before shipping.
- Rate limiting remains weak in multi-instance deployments if the backing store is in-memory; a shared store should be considered before production scale.
