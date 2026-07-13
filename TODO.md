# SIEM Platform — TODO / Next Steps

Priority-ordered. The first block is the **critical path** to make the dashboard
actually usable end-to-end; the Bedrock integration is the first real data source.

---

## ✅ Critical path (make the dashboard work end-to-end) — DONE

- [x] **Wire dashboard auth (JWT).**
  - [x] `POST /api/v1/auth/login` (email + password → signs a JWT with `JWT_SECRET`).
  - [x] Password hashing for `User` (Node `scrypt`, no new dep) + seeded admin user
        (`admin@siem.local` / `admin1234`).
  - [x] Token stored in `localStorage`; `Authorization` header sent from
        `apps/web/src/lib/api.ts`; 401 clears token + redirects to `/login`.
  - [x] `GET /api/v1/auth/me` resolves the current user.
- [x] **Login page + auth guard** (`/login`, `AppShell` gates every route).
- [x] **`GET /api/v1/overview`** stats endpoint (counts + recent alerts).
- [x] **Wired all pages to real data:** Overview (stat cards + recent alerts),
      Events (table + filter), Alerts, Incidents, Applications.
- [x] **Verified end-to-end:** login → JWT → guarded endpoints return data;
      6 failed logins from one IP tripped the brute-force rule → MEDIUM alert.

## 🟠 First real integration: Bedrock login detection

> Full step-by-step in [Bedrock Integration](#bedrock-integration) below.

- [ ] Register a Bedrock application in the SIEM → get its `sk_live_...` API key.
- [ ] Add the SIEM client into Bedrock's `signIn` server action (success + failure).
- [ ] Add `LOGOUT` emission in Bedrock's `signOut`.
- [ ] Trigger a few failed logins and confirm the brute-force rule raises an alert.

## 🟡 Detection engine

- [ ] More rules beyond brute force:
  - [ ] Impossible travel / new-country login (`metadata.country` change for a user).
  - [ ] New device / new IP for a known user.
  - [ ] MFA failures spike (`MFA_FAILED`).
  - [ ] Privilege change audit (`ROLE_CHANGED`, `USER_DELETED`).
- [ ] Deduplicate alerts (don't raise a new alert on every event within the window).
- [ ] Group related alerts into an Incident automatically.

## 🟡 Dashboard UX

- [ ] Overview page: real stat cards (events/24h, open alerts, incidents) + ECharts timeline.
- [ ] Events page: filtering + the Search DSL (`event:LOGIN_FAILED ip:1.2.3.4 severity:HIGH`).
- [ ] Alert detail: show the triggering event and let an analyst change status
      (`OPEN → ACKNOWLEDGED → RESOLVED / FALSE_POSITIVE`).
- [ ] Incident view: assign, change priority/status, list linked alerts.

## 🟢 Platform / infra

- [ ] Move detection off the request path onto **BullMQ + Redis** (both already in
      `docker-compose.yml` but unused) so ingestion stays fast.
- [ ] Pagination on all list endpoints.
- [ ] Rate-limit the ingestion endpoint.
- [ ] API tests (Jest is set up) for guards, ingestion, and each rule.
- [ ] Dockerfile for `api` and `web`; add them to `docker-compose.yml`.

## 🟢 Later / roadmap

- [ ] Enrichment integrations: AbuseIPDB / VirusTotal (IP reputation), MaxMind GeoLite2 (geo).
- [ ] Notifications: Slack / Discord / Email on CRITICAL alerts.
- [ ] MITRE ATT&CK mapping, IOC management, Sigma rules, user risk scoring.

---

## Bedrock Integration

**Goal:** every login attempt on Bedrock (Velocity's accounting app) shows up in the
SIEM, and repeated failures trigger the brute-force alert.

**What Bedrock is:** Next.js 16 app, Supabase auth. Logins happen in a **server action**,
so we emit SIEM events server-side — the API key never reaches the browser. 

**Integration point:** `src/app/(auth)/actions.ts`
- `signIn()` — after `signInWithPassword`: `error` present → `LOGIN_FAILED`, else `LOGIN_SUCCESS`.
- `signOut()` / `signOutIdle()` — emit `LOGOUT`.

### Step 1 — Register Bedrock in the SIEM

Once dashboard auth exists, `POST /api/v1/applications` with `{ "name": "Bedrock 360", "slug": "bedrock-360" }`
and copy the returned `apiKey`. (For now you can also add it directly via the seed script.)

### Step 2 — Add the SIEM key to Bedrock's env

`bedrock/.env.local`:
```bash
SIEM_API_URL="http://localhost:4000"
SIEM_API_KEY="sk_live_xxxxxxxxxxxxxxxx"   # the Bedrock app's key
```
> Note: **no `NEXT_PUBLIC_` prefix** — this must stay server-only.

### Step 3 — Add a tiny SIEM helper in Bedrock

You can either `npm install` the `@siem/sdk` package or drop this small server-only
helper (no dependency, matches the SDK's fire-and-forget contract).

`bedrock/src/lib/siem.ts`:
```ts
import "server-only";
import { headers } from "next/headers";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const BASE = process.env.SIEM_API_URL ?? "http://localhost:4000";
const KEY = process.env.SIEM_API_KEY;

// Fire-and-forget. Must never throw into the auth flow.
export async function logSecurityEvent(
  event: string,
  severity: Severity,
  ctx: {
    email?: string;
    userId?: string;
    statusCode?: number;
    metadata?: Record<string, unknown>;
  } = {},
) {
  if (!KEY) return; // no-op if not configured

  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      undefined;
    const userAgent = h.get("user-agent") ?? undefined;

    await fetch(`${BASE}/api/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        application: "bedrock-360",
        event,
        severity,
        timestamp: new Date().toISOString(),
        endpoint: "/login",
        method: "POST",
        ip,
        userAgent,
        ...ctx,
      }),
    });
  } catch {
    // Swallow — telemetry must never break sign-in.
  }
}
```

### Step 4 — Emit events from the `signIn` action

In `bedrock/src/app/(auth)/actions.ts`, import the helper and add two calls:

```ts
import { logSecurityEvent } from "@/lib/siem";

// ...inside signIn(), replace the error branch:
const { error, data } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  await logSecurityEvent("LOGIN_FAILED", "LOW", {
    email,
    statusCode: 401,
    metadata: { reason: error.message },
  });
  return { error: friendlyMessage(error.message) };
}

// ...right after a successful sign-in (before the MFA/redirect logic):
await logSecurityEvent("LOGIN_SUCCESS", "LOW", {
  email,
  userId: data.user.id,
  statusCode: 200,
});
```

And in `signOut` / `signOutIdle`, before the redirect:
```ts
await logSecurityEvent("LOGOUT", "LOW");
```

> Optional: also emit `MFA_FAILED` in the `/mfa/challenge` verify path, and
> `ACCOUNT_LOCKED` if you add lockout — both are already in the SIEM event catalog.

### Step 5 — Verify

1. Start the SIEM (`npm run dev:api`) and Bedrock (`npm run dev`).
2. Log in to Bedrock with a wrong password 5+ times.
3. Check the SIEM: the events land via `POST /events`, and the `auth.brute_force`
   rule should raise a **MEDIUM** alert (5+ fails/60s) — visible in `/api/v1/alerts`
   (and the dashboard once auth is wired).

### Gotchas
- `signInWithPassword` failures **don't tell you which user** exists — we log the
  submitted `email` only. That's fine for brute-force detection (it keys on IP).
- Behind a proxy/CDN, confirm `x-forwarded-for` is actually populated; otherwise the
  brute-force rule (which keys on IP) won't group attempts.
- Keep the SIEM call **awaited but wrapped in try/catch** (as above) so a SIEM outage
  never blocks a Bedrock login.
