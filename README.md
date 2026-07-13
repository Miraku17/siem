# SIEM Platform

A lightweight, centralized **Security Information and Event Management** platform.
Web applications send security events to the SIEM via a REST API. The SIEM
collects, normalizes, stores, and analyzes events, generates alerts, and exposes
a modern SOC dashboard for investigation.

> Portfolio project intended to resemble a lightweight commercial SIEM.

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
          Event Normalizer        Detection Engine
                    │                    │
                    └─────────┬──────────┘
                              ▼
                       PostgreSQL (Prisma)
                              ▼
                       Next.js Dashboard
```

## Tech Stack

| Layer     | Technology                                                  |
| --------- | ----------------------------------------------------------- |
| Frontend  | Next.js, TypeScript, Tailwind CSS, shadcn/ui, React Query, Apache ECharts |
| Backend   | NestJS, TypeScript                                          |
| Database  | PostgreSQL + Prisma ORM                                     |
| Cache     | Redis (optional)                                           |
| Queue     | BullMQ (optional)                                          |
| Auth      | JWT (dashboard users) + API Keys (applications)            |

## Monorepo Layout

```
siem-platform/
├── apps/
│   ├── api/          NestJS ingestion API + detection engine
│   └── web/          Next.js SOC dashboard
├── packages/
│   └── sdk/          TypeScript client SDK (applications call this)
├── docker-compose.yml   Postgres + Redis for local dev
└── .env.example
```

## Getting Started

```bash
# 1. Start infrastructure (Postgres + Redis)
docker compose up -d

# 2. API
cd apps/api
cp ../../.env.example .env
npm install
npx prisma migrate dev
npm run start:dev        # http://localhost:4000

# 3. Web dashboard
cd apps/web
npm install
npm run dev              # http://localhost:3000
```

## Event Ingestion

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

## Roadmap

- [ ] Event ingestion + normalization
- [ ] Detection engine (rule-based)
- [ ] Alerts & incidents
- [ ] Dashboard (overview, apps, alerts, incidents, events, investigation)
- [ ] Search DSL (`event:LOGIN_FAILED ip:1.2.3.4 severity:HIGH`)
- [ ] SDK
- [ ] Integrations: VirusTotal, AbuseIPDB, MaxMind GeoLite2, Slack/Discord/Email
- [ ] MITRE ATT&CK mapping, IOC management, Sigma rules, user risk scoring
