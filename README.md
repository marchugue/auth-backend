# Express + TypeScript JWT Auth Template

Production-shaped Node.js/Express backend: JWT auth (access + refresh), DB-backed
sessions, email verification, password reset — with local Postgres for dev and a
Neon cloud instance kept in sync via Prisma migrations and an offline-safe write queue.

## Stack

- **Express** (Node.js) + **TypeScript**
- **PostgreSQL** via **Prisma** — local dev DB + **Neon** (cloud)
- **JWT** (`jsonwebtoken`) for access tokens, DB-backed sessions for refresh tokens
- **zod** for request/env validation
- **bcryptjs** for password hashing
- **nodemailer** for verification/reset emails (logs to console if unconfigured)
- **helmet**, **cors**, **morgan**, **cookie-parser**

## Project structure

```
.
├── app/
│   ├── auth/
│   │   ├── controller/auth.controller.ts
│   │   ├── services/auth.service.ts       # business logic only — no direct Prisma calls
│   │   ├── models/
│   │   │   ├── user.model.ts              # all User queries + writes
│   │   │   └── session.model.ts           # all Session queries + writes
│   │   ├── routes/auth.routes.ts
│   │   └── types/auth.types.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/internal.routes.ts          # cron-triggered sync endpoint
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   ├── ApiError.ts
│   │   ├── jwt.ts
│   │   ├── hash.ts
│   │   ├── duration.ts
│   │   ├── mailer.ts
│   │   ├── prisma.ts                      # local PrismaClient singleton
│   │   ├── cloudPrisma.ts                 # Neon PrismaClient (reads .env.cloud)
│   │   └── syncQueue.ts                   # outbox drain + retry logic
│   └── config/env.ts
├── scripts/
│   └── sync-cloud.ts                      # non-fatal wrapper around `migrate deploy`
├── prisma/
│   ├── schema.prisma                      # User, Session, SyncOutbox
│   └── migrations/
├── api/
│   └── index.ts                           # serverless entry (exports app, for Vercel)
├── app.ts
├── server.ts                              # local/long-running entry point
├── .env.example
├── package.json
└── tsconfig.json
```

## Environment files

| File | Used by | Contains |
|---|---|---|
| `.env` | local dev | local `DATABASE_URL`/`DIRECT_URL`, JWT secrets, SMTP, feature flags |
| `.env.cloud` | `prisma:migrate:cloud` only | Neon `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) |

Neither is committed. In production, all variables are set directly in the host's
dashboard (see **Deployment**), not read from a file.

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, etc.
npm run prisma:migrate      # create tables, generate client
npm run dev
```

Health check: `GET /health`. API mounted under `/api/auth`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server, hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run prisma:migrate` | Create + apply migration locally (interactive) |
| `npm run prisma:deploy` | Apply pending migrations, non-interactive (CI/prod) |
| `npm run prisma:migrate:cloud` | Apply pending migrations to Neon |
| `npm run db:sync` | Local migration, then replay on Neon |
| `npm run db:push-data` | One-way copy of local **data** into Neon (destructive, pre-launch only) |
| `npm run prisma:studio` | Prisma Studio on local DB |

## Schema changes

1. Edit `prisma/schema.prisma`.
2. `npm run prisma:migrate` — names + applies the migration locally.
3. `npm run db:sync` — replays the same migration on Neon.

Both DBs run identical SQL from the same migration files, so they can't drift as
long as schema changes only ever go through Prisma.

## Cloud sync (local ↔ Neon)

Every write in `user.model.ts` / `session.model.ts` also queues a row in
`SyncOutbox` and fires a non-blocking drain attempt:

- **Online:** the row is pushed to Neon and removed from the outbox within moments.
- **Offline:** the row stays queued; local requests are unaffected. A background
  worker (`server.ts`) retries every 30s. On serverless (no persistent process —
  see below), the same drain is instead triggered opportunistically on each
  incoming request, with a cron job as a backstop.

Inspect backlog: `npm run prisma:studio` → `sync_outbox` table.

## Auth system

**Access + refresh tokens** — access token (15m default) returned in the JSON
body, sent as `Authorization: Bearer <token>`. Refresh token (7d default) set as
an **httpOnly cookie** scoped to `/api/auth`.

**DB-backed sessions** — each login/register/refresh creates a `Session` row.
The refresh JWT carries only a session id; the token itself is stored as a
**SHA-256 hash**, so a DB leak alone isn't enough to forge a session. Refresh
tokens rotate on every use (old session deleted, new one issued) — a
leaked-but-unused token is single-use. `logout-all` (and password reset) wipes
every session for a user.

**Email verification / password reset** — random 32-byte token, raw token
emailed, only its SHA-256 hash + expiry stored. Blank `SMTP_HOST` in dev logs
emails to console instead of sending. `REQUIRE_EMAIL_VERIFICATION=true` blocks
login for unverified accounts.

## API reference

All routes under `/api/auth`.

| Method | Route | Auth | Description |
|--------|-------|:---:|---|
| POST | `/register` | | Create account, sends verification email |
| POST | `/login` | | Returns access token, sets refresh cookie |
| POST | `/refresh` | | Rotates refresh cookie, returns new access token |
| POST | `/logout` | | Revokes current session |
| POST | `/logout-all` | ✅ | Revokes every session for the user |
| GET | `/me` | ✅ | Current user's profile |
| POST | `/verify-email` | | Body: `{ token }` |
| POST | `/resend-verification` | | Body: `{ email }` |
| POST | `/forgot-password` | | Body: `{ email }` |
| POST | `/reset-password` | | Body: `{ token, password }`, revokes all sessions |

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Passw0rd!","name":"Jane"}'

curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Passw0rd!"}'

curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/refresh
curl -b cookies.txt -X POST http://localhost:5000/api/auth/logout
```

## Error handling

Controllers are wrapped in `asyncHandler` — thrown/rejected errors forward to
Express's `next()` automatically. Throw `ApiError.badRequest(...)` (etc.)
anywhere in a service/controller; the global handler formats:

```json
{ "success": false, "message": "Invalid email or password" }
```

Validation errors include a `details` array with per-field messages.

## Deployment (Vercel)

Vercel Functions are stateless — no persistent process, so `server.ts`'s
`app.listen()` and interval-based sync worker don't apply here. The serverless
entry (`api/index.ts`) and opportunistic/cron sync trigger handle this instead.
If you'd rather keep the always-on worker unchanged, a host built for
long-running Node processes (Railway, Render, Fly.io) is a more direct fit.

1. **Env vars** — set everything from `.env` in the Vercel dashboard, with
   `DATABASE_URL`/`DIRECT_URL` pointing at Neon (prod now talks to Neon directly).
2. **Build command** (Settings → General):
   ```
   npm run prisma:deploy && npm run build
   ```
3. **`postinstall` script** so the build regenerates Prisma Client:
   ```json
   "postinstall": "prisma generate"
   ```
4. **`vercel.json`**:
   ```json
   {
     "version": 2,
     "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "api/index.ts" }],
     "crons": [{ "path": "/api/internal/sync", "schedule": "0 0 * * *" }]
   }
   ```
   Hobby plan caps cron at once/day — the opportunistic per-request trigger
   covers the gaps in between. Hourly+ cadence requires Pro.
5. **Deploy:**
   ```bash
   npm run deploy   # alias for: vercel --prod
   ```

Never point `prisma:migrate` (interactive `dev` version) at production
`DATABASE_URL` — always `prisma:deploy`.

## Extending

New feature module (e.g. `users`): mirror `auth/` — `controller/`, `services/`,
`models/`, `routes/`, `types/` — then mount its router in `app/index.ts`.
`authenticate`, `requireRole`, `asyncHandler`, and `ApiError` are shared across
modules.