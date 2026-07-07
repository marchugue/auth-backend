# Express + TypeScript JWT Auth Template

A production-shaped Node.js/Express backend template written in TypeScript, with a
complete authentication system built in: registration, login, JWT access + refresh
tokens, database-backed sessions, email verification, and password reset.

## Stack

- **Express** (Node.js) + **TypeScript**
- **PostgreSQL** via **Prisma**
- **JWT** (`jsonwebtoken`) for access tokens, DB-backed sessions for refresh tokens
- **zod** for request validation and environment variable validation
- **bcryptjs** for password hashing
- **nodemailer** for verification/reset emails (falls back to console logging in dev)
- **helmet**, **cors**, **morgan**, **cookie-parser** for standard hardening/logging

## Project structure

```
.
├── app/
│   ├── auth/
│   │   ├── controller/
│   │   │   └── auth.controller.ts   # HTTP layer: req/res, cookies, status codes
│   │   ├── services/
│   │   │   └── auth.service.ts      # Business logic, talks to Prisma
│   │   ├── routes/
│   │   │   └── auth.routes.ts       # Route definitions + middleware wiring
│   │   └── types/
│   │       └── auth.types.ts        # zod schemas, JWT payload types, PublicUser
│   ├── middleware/
│   │   ├── auth.middleware.ts       # `authenticate` (verifies access token), `requireRole`
│   │   ├── error.middleware.ts      # Global error handler + 404 handler
│   │   └── validate.middleware.ts   # Generic zod request-validation middleware
│   ├── utils/
│   │   ├── asyncHandler.ts          # Wraps async route handlers, forwards errors to next()
│   │   ├── ApiError.ts              # Typed HTTP error class with status-code helpers
│   │   ├── jwt.ts                   # Sign/verify access & refresh tokens
│   │   ├── hash.ts                  # bcrypt password hashing + secure token generation
│   │   ├── duration.ts              # Parses "15m" / "7d" style durations to ms
│   │   ├── mailer.ts                # nodemailer wrapper (logs to console if unconfigured)
│   │   └── prisma.ts                # PrismaClient singleton
│   ├── config/
│   │   └── env.ts                   # Loads + validates all environment variables
│   └── index.ts                     # Aggregates feature routers (mounted under /api)
├── prisma/
│   └── schema.prisma                # User + Session models
├── app.ts                           # Express app: middleware stack, routes, error handlers
├── server.ts                        # Boots the HTTP server, graceful shutdown
├── .env.example
├── package.json
└── tsconfig.json
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# Generate strong secrets with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Create the database tables
npx prisma migrate dev --name init

# 4. Run in dev mode (auto-restarts on file changes)
npm run dev
```

The server starts on `http://localhost:5000` (or whatever `PORT` you set), with a
health check at `GET /health`.

### Building for production

```bash
npm run build   # compiles to dist/
npm start       # runs dist/server.js
```

## How the auth system works

### Access + refresh tokens

- **Access token**: short-lived (default 15m), returned in the JSON response body.
  Send it as `Authorization: Bearer <token>` on requests to protected routes.
- **Refresh token**: longer-lived (default 7d), set as an **httpOnly cookie**
  scoped to `/api/auth`, so client-side JavaScript never touches it (mitigates XSS
  token theft). Only the browser automatically attaches it when calling
  `/api/auth/refresh` or `/api/auth/logout`.

### Database-backed sessions

Every login/register/refresh creates a row in the `Session` table. The refresh JWT
only carries a session id — the actual token is stored in the database as a
**SHA-256 hash**, never in plaintext. This means:

- A stolen database dump alone can't be replayed as a valid token.
- Sessions are individually revocable (`logout` deletes one row).
- `logout-all` wipes every session for a user (also triggered automatically on
  password reset), effectively "logging out all devices."
- Refresh tokens **rotate** on every use — each refresh deletes the old session and
  issues a brand new one, so a leaked-but-unused refresh token is single-use.

### Email verification & password reset

Both flows use the same pattern: generate a random 32-byte token, email the raw
token to the user, and store only its SHA-256 hash (with an expiry) in the `User`
row. Verifying/resetting hashes the incoming token and looks for a match.

If `SMTP_HOST` is left blank in `.env`, emails aren't sent — they're logged to the
console instead, so you can copy the link out of your terminal during local dev.

Set `REQUIRE_EMAIL_VERIFICATION=true` to block login for unverified accounts.

## API reference

All routes are mounted under `/api/auth`.

| Method | Route                   | Auth required | Description                                  |
|--------|--------------------------|:---:|-----------------------------------------------|
| POST   | `/register`               |     | Create an account, sends verification email   |
| POST   | `/login`                  |     | Log in, returns access token + sets refresh cookie |
| POST   | `/refresh`                |     | Rotates refresh cookie, returns new access token |
| POST   | `/logout`                 |     | Revokes the current session                    |
| POST   | `/logout-all`             |  ✅  | Revokes every session for the user             |
| GET    | `/me`                     |  ✅  | Returns the current user's profile             |
| POST   | `/verify-email`           |     | Body: `{ token }`                              |
| POST   | `/resend-verification`    |     | Body: `{ email }`                              |
| POST   | `/forgot-password`        |     | Body: `{ email }`, sends reset email           |
| POST   | `/reset-password`         |     | Body: `{ token, password }`, revokes all sessions |

### Example requests

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Passw0rd!","name":"Jane"}'

# Login (save cookies to reuse the refresh token)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Passw0rd!"}'

# Call a protected route
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken from login response>"

# Refresh the access token using the httpOnly cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/auth/refresh

# Logout
curl -b cookies.txt -X POST http://localhost:5000/api/auth/logout
```

## Error handling

Every controller is wrapped in `asyncHandler`, so thrown/rejected errors are
automatically forwarded to Express's `next()` — no manual `try/catch` needed in
controllers. Throw an `ApiError` (e.g. `ApiError.badRequest('message')`) anywhere
in a service or controller and the global `errorHandler` will format a consistent
JSON error response:

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

Validation errors (from `validate.middleware.ts`) include a `details` array with
per-field messages.

## Extending the template

To add a new feature module (e.g. `users`), follow the same pattern as `auth/`:
`controller/`, `services/`, `routes/`, `types/`, then mount its router in
`app/index.ts`. The `authenticate` and `requireRole` middleware, `asyncHandler`,
and `ApiError` are all reusable across modules.
