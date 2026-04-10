# Source Layout

This project keeps Next.js routes and implementation code separated by role.

## App Router

- `app/(frontend)`: UI pages and route groups. The route group does not change URLs.
- `app/(backend)/api`: API routes. The route group does not change `/api/*` URLs.
- `app/layout.tsx`, `app/globals.css`, `app/favicon.ico`, `app/robots.ts`: root app assets required by Next.js.

## Implementation Code

- `frontend`: client/UI code such as components, hooks, Zustand stores, and browser game-session helpers.
- `frontend/integrations`: client-side third-party UI integrations such as Cloudflare Turnstile widgets.
- `backend`: server-only code such as auth, Prisma access, admin services, API utilities, rate limiting, logging, and room services.
- `backend/integrations`: server-side third-party integrations such as Cloudflare Turnstile verification.
- `shared`: code/assets that are safe to use from both sides, such as schemas, sanitizers, config constants, global types, and shared assets.
- `shared/integrations`: constants and types shared by client/server integrations.

Use imports that show the boundary clearly:

```ts
import { Button } from "@/frontend/components/ui";
import { requireAdmin } from "@/backend/adminAuth";
import { roomCodeSchema } from "@/shared/schemas";
```
