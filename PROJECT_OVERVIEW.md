# SIEM Platform — Project Overview

A lightweight, centralized **Security Information and Event Management (SIEM)** platform.
Web applications push security events to the SIEM over a REST API; the SIEM collects,
normalizes, stores, and analyzes them, raises alerts via a rule-based detection engine,
and exposes a SOC (Security Operations Center) dashboard for investigation.

> Portfolio project intended to resemble a lightweight commercial SIEM. It is a
> work in progress — see [Current Status](#current-status).

---

## Architecture

```
   Web Applications (Velocity Pickleball, Bedrock360, POS, ...)
                         │  HTTPS REST API (API Key)
                         ▼
              ┌────────────────────────┐
              │  Event Ingestion API   │  (NestJS)
              └────────────────────────┘
               │                    │
     Event Normalizer        Detection Engine (rules)
               │                    │
               └─────────┬──────────┘
                         ▼
                  PostgreSQL (Prisma)
                         ▼
                  Next.js SOC Dashboard
```

Two auth surfaces:
- **API Keys** (`sk_live_...`) authenticate *applications* sending events (ingestion).
  Stored as a SHA-256 digest — the plaintext is shown once at registration and
  never persisted.
- **JWT** authenticates *dashboard users* (SOC analysts) reading data, with
  `@Roles()` on anything that mutates state or issues credentials.

---

## Tech Stack / Tools

| Layer      | Technology |
| ---------- | ---------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query (`@tanstack/react-query`), Apache ECharts (`echarts` + `echarts-for-react`) |
| Backend    | NestJS 10, TypeScript, `class-validator` / `class-transformer` (DTO validation) |
| Database   | PostgreSQL 16 + Prisma ORM 5 |
| Auth       | `@nestjs/jwt` (dashboard users) + API Keys (applications) |
| Cache/Queue| Redis 7 + BullMQ *(provisioned in infra, optional / not yet wired)* |
| SDK        | `@siem/sdk` — TypeScript client apps use to send events |
| Infra      | Docker Compose (Postgres + Redis), npm workspaces monorepo |
| Testing    | Jest + ts-jest (API) |

---

## Monorepo Layout

```
siem-platform/
├── apps/
│   ├── api/          NestJS ingestion API + detection engine
│   │   ├── src/
│   │   │   ├── events/        ingestion + search
│   │   │   ├── detection/     rule-based detection engine
│   │   │   ├── alerts/        alerts
│   │   │   ├── incidents/     incidents
│   │   │   ├── applications/  registered apps + API keys
│   │   │   ├── auth/          ApiKeyGuard + JwtGuard
│   │   │   └── prisma/        Prisma service/module
│   │   └── prisma/            schema.prisma, migrations, seed.ts
│   └── web/          Next.js SOC dashboard
│       └── src/app/          overview, alerts, incidents, events, applications
├── packages/
│   └── sdk/          TypeScript client SDK (@siem/sdk)
├── docker-compose.yml   Postgres + Redis for local dev
└── .env.example
```

---

## API Endpoints

Base URL: `http://localhost:4000` — all routes are prefixed with `/api/v1`.

| Method  | Path                          | Auth                    | Description |
| ------- | ----------------------------- | ----------------------- | ----------- |
| `POST`  | `/api/v1/auth/login`          | —                       | Exchange email + password for a JWT |
| `GET`   | `/api/v1/auth/me`             | JWT                     | Current user from the token |
| `POST`  | `/api/v1/events`              | API Key                 | Ingest a security event from an application |
| `GET`   | `/api/v1/events`              | JWT                     | Paginated search / filter for the dashboard |
| `GET`   | `/api/v1/events/facets`       | JWT                     | Distinct event types + applications (filter dropdowns) |
| `GET`   | `/api/v1/overview`            | JWT                     | Aggregates for the Overview dashboard |
| `GET`   | `/api/v1/alerts`              | JWT                     | List all alerts |
| `GET`   | `/api/v1/alerts/:id`          | JWT                     | Get a single alert |
| `PATCH` | `/api/v1/alerts/:id`          | JWT · **ADMIN/ANALYST** | Update workflow status / triage disposition |
| `POST`  | `/api/v1/alerts/:id/comments` | JWT · **ADMIN/ANALYST** | Add an analyst comment |
| `GET`   | `/api/v1/incidents`           | JWT                     | List all incidents |
| `GET`   | `/api/v1/applications`        | JWT                     | List registered applications (prefix only, never the key) |
| `POST`  | `/api/v1/applications`        | JWT · **ADMIN**         | Register an application; response carries the key **once** |

**Auth headers**
- API Key: `Authorization: Bearer sk_live_xxxxxxxxxxxx`
- JWT: `Authorization: Bearer <jwt>` (verified against `JWT_SECRET`)

### Example: ingest an event

```http
POST /api/v1/events
Authorization: Bearer sk_live_xxxxxxxxxxxxxx
Content-Type: application/json

{
  "application": "velocity-pickleball",
  "event": "LOGIN_FAILED",
  "severity": "LOW",
  "timestamp": "2026-07-13T15:10:00Z",
  "userId": "usr_123",
  "email": "john@example.com",
  "ip": "203.177.0.1",
  "endpoint": "/login",
  "method": "POST",
  "statusCode": 401,
  "userAgent": "Chrome",
  "metadata": { "device": "Windows", "country": "Philippines" }
}
```

Response: `{ "success": true }` (HTTP 201)

---

## Data Model (Prisma)

- **Application** — a registered source app; holds `slug`, a unique `apiKeyHash`
  (SHA-256 of the issued key) and a display `keyPrefix`, plus `status`.
- **SecurityEvent** — a normalized event (type, severity, actor, IP, endpoint, metadata, timestamps).
- **Alert** — raised by a detection rule; has severity, status, and links to the triggering event/incident.
- **Incident** — a grouping of alerts under investigation; has status, priority, assignee.
- **User** — dashboard/SOC user with a role (`ADMIN | ANALYST | VIEWER`).

Enums: `Severity`, `ApplicationStatus`, `AlertStatus`, `IncidentStatus`, `IncidentPriority`, `UserRole`.

---

## Event Types

Stored as free-form strings so apps can send new types without a migration; the
recognized catalog (`apps/api/src/events/event-types.ts`):

- **Authentication** — `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_RESET`, `ACCOUNT_LOCKED`, `MFA_SUCCESS`, `MFA_FAILED`
- **Audit** — `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, `ROLE_CHANGED`
- **Business** — `BOOKING_CREATED`, `BOOKING_UPDATED`, `BOOKING_CANCELLED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`
- **Security** — `RATE_LIMIT_TRIGGERED`, `INVALID_TOKEN`, `ACCESS_DENIED`, `SUSPICIOUS_REQUEST`, `SERVER_ERROR`

---

## Detection Engine

Rule-based. Each ingested event is evaluated against every registered rule; a
match creates an Alert, deduplicated per rule + entity. Rules live in
`apps/api/src/detection/rules/` and are registered in `rules/index.ts`. See
`ROADMAP.md` for the full list of the 12 shipped rules.

Two invariants every correlating rule must hold — both were violated and are now
covered by tests in `rules/tenant-isolation.spec.ts`:

1. **Scope every query by `applicationId`.** Applications are separate tenants.
   Unscoped correlation both over-counts (one app's failures inflating another's
   brute-force threshold) and under-fires (one app's history making a
   never-seen-before IP look familiar to another).
2. **Window on `createdAt`, never `timestamp`.** `timestamp` is supplied by the
   sender and is display-only; a caller holding an API key can set it freely and
   would otherwise slip straight through every time-based rule. `createdAt` is
   assigned by the SIEM at ingestion.

Enrichment fields follow the same trust rule: `metadata.threat` is stripped from
inbound payloads and written only by threat-intel, and resolved GeoIP overwrites
a sender-claimed `country` — otherwise a source app could silence the rules that
key off them.

---

## Client SDK (`@siem/sdk`)

Applications embed the SDK instead of calling the API directly. It is fire-and-forget
and never throws into the host request path.

```ts
const security = new SiemClient({
  apiKey: process.env.SIEM_API_KEY!,
  application: 'velocity-pickleball',
});

await security.loginFailed({ userId, ip, userAgent });
```

Typed helpers: `loginSuccess`, `loginFailed`, `bookingCreated`, `paymentSuccess`,
`accessDenied`, plus the low-level `send(event, severity, ctx)`.

---

## Running Locally

```bash
# 1. Start infrastructure (Postgres + Redis)
docker compose up -d

# 2. Install all workspace dependencies (from the repo root)
npm install

# 3. Set up the API
cd apps/api
cp ../../.env.example .env
npx prisma generate
npx prisma migrate deploy      # or: npx prisma migrate dev
npx ts-node prisma/seed.ts     # seeds an app + prints its API key

# 4. Start both apps (from the repo root)
npm run dev:api    # NestJS  → http://localhost:4000/api/v1
npm run dev:web    # Next.js → http://localhost:3000
```

**Root scripts:** `dev:api`, `dev:web`, `infra:up`, `infra:down`.

Default services: Web `:3000`, API `:4000`, Postgres `:5432`, Redis `:6379`.

---

## Environment Variables (`.env`)

| Variable              | Purpose |
| --------------------- | ------- |
| `DATABASE_URL`        | PostgreSQL connection string (Prisma) |
| `REDIS_URL`           | Redis connection (optional) |
| `API_PORT`            | API port (default 4000) |
| `JWT_SECRET`          | Secret used to sign/verify dashboard JWTs |
| `JWT_EXPIRES_IN`      | JWT lifetime (e.g. `1d`) |
| `NEXT_PUBLIC_API_URL` | Base API URL the web app calls |

---

## Testing

```bash
docker compose up -d postgres    # from the repo root
cd apps/api && npm test
```

Specs run against a real Postgres (`siem_test`), not a mocked Prisma — the
behaviour under test is largely the SQL itself (tenant filtering, JSON path
matching, time windows). `test/load-env.ts` loads `.env.test` and refuses to run
if `DATABASE_URL` is not local, so a stray `.env` can't point the suite at Neon.

## Current Status

Working:
- Event ingestion via API key (`POST /api/v1/events`), hashed keys
- Normalization + GeoIP / threat-intel enrichment + persistence
- Detection engine — 12 rules, per-application correlation, alert dedup
- Dashboard auth (JWT login + route guard) with role enforcement
- Dashboard: overview, alerts + alert detail/triage, incidents, events, applications
- Client SDK
- Deployed: Neon + Vercel (API) + Vercel (web)

Known gaps (see `ROADMAP.md` for the full list):
- **Incidents are inert** — the page and model exist, but nothing groups alerts
  into them yet.
- **Enrichment and detection run on the ingestion request path**, including
  outbound HTTP/DNS lookups. Redis/BullMQ are provisioned in Docker but unused.
- **No pagination on `/alerts` and `/incidents`** (events are paginated).
- **No audit trail** on analyst actions — `PATCH /alerts/:id` records no actor.
- No rate limit on ingestion; no retention policy; no CI.

Roadmap: Search DSL (`event:LOGIN_FAILED ip:1.2.3.4 severity:HIGH`),
notifications (Slack/Discord/Email), MITRE ATT&CK mapping, IOC management,
Sigma rules, user risk scoring.
