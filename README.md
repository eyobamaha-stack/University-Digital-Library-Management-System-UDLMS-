# UDLMS - University Digital Library Management System

This repository now contains a full MVP web application based on your prototype, including:

- Frontend: Next.js (App Router, TypeScript)
- Backend: Express + TypeScript + Prisma
- Database: PostgreSQL
- Auth: JWT with role-based access control (STUDENT, LIBRARIAN, ADMIN)
- DevOps: Docker Compose, multi-stage Dockerfiles, CI workflow

## 1. Project Structure

```text
UDLMS/
  UDLMS.html                      # Original prototype (kept as reference)
  docker-compose.yml
  package.json                    # npm workspaces root
  README.md
  .github/workflows/ci.yml
  apps/
    api/
      Dockerfile
      package.json
      tsconfig.json
      .env.example
      prisma/
        schema.prisma
        seed.ts
      src/
        index.ts
        prisma.ts
        types.ts
        middleware/auth.ts
        services/auth.ts
        routes/
          auth.ts
          catalog.ts
          loans.ts
          admin.ts
          system.ts
    web/
      Dockerfile
      package.json
      tsconfig.json
      next.config.js
      .env.example
      app/
        layout.tsx
        page.tsx
        globals.css
        (auth)/login/page.tsx
        (dashboard)/layout.tsx
        (dashboard)/catalog/page.tsx
        (dashboard)/loans/page.tsx
        (dashboard)/librarian/page.tsx
        (dashboard)/admin/page.tsx
      components/
        shell.tsx
        toast.tsx
      lib/
        auth.ts
        api.ts
```

## 2. Features Implemented

### Student
- Login
- Search/filter catalog
- Borrow available item
- Reserve unavailable item
- View loans and reservations
- Renew and return loans

### Librarian
- Add catalog items
- Process checkout/checkin from UI
- View active circulation queue
- Send mocked patron reminders (email/sms)

### Admin
- View and update loan policy
- View users
- View audit logs
- View live operational metrics (users, active loans, overdue, catalog stock)

### Cross-Cutting
- JWT authentication
- RBAC authorization middleware
- Audit event recording for critical actions
- Health endpoint: `GET /health`

## 3. API Endpoints (MVP)

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Catalog
- `GET /catalog?q=&type=`
- `GET /catalog/stats/summary`
- `POST /catalog` (LIBRARIAN, ADMIN)
- `PUT /catalog/:id` (LIBRARIAN, ADMIN)

### Loans
- `GET /loans/me`
- `POST /loans/borrow`
- `POST /loans/reserve`
- `POST /loans/:id/renew`
- `POST /loans/:id/return`
- `GET /loans/circulation/active` (LIBRARIAN, ADMIN)
- `POST /loans/circulation/checkout` (LIBRARIAN, ADMIN)
- `POST /loans/circulation/checkin` (LIBRARIAN, ADMIN)

### Admin
- `GET /admin/policy`
- `PUT /admin/policy`
- `GET /admin/users`
- `GET /admin/audit`
- `GET /admin/metrics`

### System (Mock Integrations)
- `POST /system/notifications/mock` (LIBRARIAN, ADMIN)

## 4. Local Run (Without Docker)

1. Install Node.js 20+ and npm.
2. Run setup in one command:
   - `npm run setup`
3. If you also want Docker PostgreSQL auto-start:
   - `npm run setup:with-db`
4. Start both apps:
   - `npm run run:local`
5. Open `http://localhost:3000`.

Alternative manual path:
- `npm install`
- copy `apps/api/.env.example` to `apps/api/.env`
- copy `apps/web/.env.example` to `apps/web/.env.local`
- start PostgreSQL
- `npm run prisma:generate -w apps/api`
- `npm run prisma:push -w apps/api`
- `npm run prisma:seed -w apps/api`
- `npm run dev -w apps/api`
- `npm run dev -w apps/web`

## 5. Run With Docker Compose

```bash
npm run run:docker
```

Or directly:

```bash
docker compose up --build
```

Then open:
- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

## 6. Demo Accounts

All demo users use password: `password123`

- `student@udlms.local`
- `librarian@udlms.local`
- `admin@udlms.local`

## 7. Security and Ops Notes

- JWT expires after 12h.
- API uses Helmet and CORS controls.
- Audit logs track major loan/reservation/policy actions.
- Mock notification actions are audited and return accepted status.
- CI workflow builds both backend and frontend.

## 8. Suggested Next Upgrades

- Add refresh tokens and secure httpOnly cookie auth
- Add OpenAPI docs and request tracing
- Add unit/integration tests and coverage gates
- Add notification worker (email/SMS) and real payment provider integration
- Add migration files and backup/restore automation
