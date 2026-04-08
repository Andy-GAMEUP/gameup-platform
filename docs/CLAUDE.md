# GAMEUP Platform

Gaming platform monorepo - indie game discovery, community, and developer tools.

## Project Structure

```
gameup-platform/
├── apps/
│   ├── web/          # Next.js 16 frontend (React 19, Tailwind CSS 4)
│   └── api/          # Express.js 4 backend (MongoDB, Socket.io)
├── packages/
│   ├── db/           # Mongoose models (36 schemas)
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared React components (11)
│   └── utils/        # Shared utilities (date, currency, validation)
├── e2e/              # Playwright E2E tests
└── scripts/          # Migration & admin scripts
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, NextAuth.js 5 beta, TanStack React Query, TipTap editor, dnd-kit, Recharts, Tailwind CSS 4
- **Backend:** Express.js 4, Mongoose 8, Socket.io 4, JWT auth, Multer, express-rate-limit
- **Database:** MongoDB (localhost:27017/gameup-betazone)
- **Monorepo:** Turbo + pnpm workspaces
- **Testing:** Playwright E2E
- **Payment:** Toss Payments SDK

## Commands

```bash
pnpm dev              # Start web + api dev servers (turbo)
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check
pnpm clean            # Clean all build artifacts
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:e2e:ui      # Playwright UI mode

# API-specific
cd apps/api && pnpm seed          # Seed database
cd apps/api && pnpm create-admin  # Create admin user
```

## Key Conventions

- Package names use `@gameup/` scope (e.g., `@gameup/web`, `@gameup/api`, `@gameup/db`)
- App Router route groups: `(auth)`, `(console)`, `(service)`, `(admin)`
- API routes all prefixed with `/api/`
- Admin routes at `/api/admin/*`
- File uploads served from `/uploads` (proxied via Next.js rewrites)
- Environment variables in `.env.local` (gitignored)
- Korean language UI (한국어)

## Test Accounts

- Admin: `admin@gameup.com` / `test123456`
- Developer: `developer@test.com` / `test123456`
- Player: `player@test.com` / `test123456`

## Architecture Notes

- Frontend services layer (`apps/web/src/services/`) wraps all API calls via Axios
- Auth flow: NextAuth.js (frontend) + JWT (API) with token forwarding
- Real-time messaging via Socket.io
- Image proxy: Next.js rewrites `/uploads/*` and `/api/*` to Express (localhost:5000)
- OAuth providers: Kakao, Naver
