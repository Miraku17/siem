# SIEM Platform — Roadmap / Checklist

Living checklist of what's shipped and what's next, priority-ordered.
Legend: 🔴 high impact · 🟠 next · 🟡 rounding out · 🟢 hardening · ⚪ later.

---

## ✅ Shipped

- [x] Event ingestion API (API-key auth) + normalization + persistence (Prisma/Postgres)
- [x] Detection engine scaffold + **brute-force rule** (`auth.brute_force`)
- [x] Dashboard auth: `POST /auth/login` (JWT, scrypt-hashed passwords), login page, route guard
- [x] Dashboard (shadcn/ui, dark SOC theme): Overview (severity cards, world map, alert-types
      donut, event-volume area chart), Events (filterable table), Alerts, Incidents, Applications
- [x] Alert detail page (evidence overview, activity timeline, risk summary) +
      status actions (`PATCH /alerts/:id`: acknowledge / resolve / false-positive)
- [x] `GET /overview` aggregate endpoint (counts, severity breakdown, timeline, geo)
- [x] **Deployed to prod:** Neon (DB) + Vercel serverless (API) + Vercel (web)
- [x] **Bedrock integration** (live): `LOGIN_SUCCESS/FAILED`, `LOGOUT` (+actor),
      `MFA_SUCCESS/FAILED`, `PASSWORD_RESET`, `ROLE_CHANGED`

---

## ✅ Detection rules — DONE (implemented + verified end-to-end)

Rules live in `apps/api/src/detection/rules/` and are registered in `rules/index.ts`.
The engine runs every rule per ingested event; dedup suppresses duplicates.

- [x] **MFA fatigue** (`auth.mfa_fatigue`) — ≥5 `MFA_FAILED`/user in 10m → **HIGH**
- [x] **Account-takeover chain** (`auth.takeover_chain`) — `PASSWORD_RESET` then
      `LOGIN_SUCCESS` from a never-seen IP within 6h → **CRITICAL**
- [x] **Brute force that succeeded** (`auth.brute_force_success`) — ≥5 `LOGIN_FAILED`
      then a `LOGIN_SUCCESS` from the same IP → **CRITICAL**
- [x] **Privilege escalation** (`authz.privilege_escalation`) — `ROLE_CHANGED` with
      `metadata.to === "admin"` → **HIGH**
- [x] **New country** (`auth.new_country`) — `metadata.country` new for a user → **HIGH**
      (fires once GeoIP populates `metadata.country`)
- [x] **New device / new IP** (`auth.new_ip`) — login from an IP the account has never
      used → **MEDIUM**
- [x] **Alert dedup** — cooldown per rule + entity (IP/user/email), matched via the
      alert's linked event; no schema change needed. Default 15m window.
- [ ] Impossible travel (time+distance between logins) — stretch; needs GeoIP lat/lng.

## 🟠 Enrichment

- [x] **GeoIP** — `apps/api/src/events/geoip.ts` resolves `country` + `lat`/`lng`
      from the IP at ingestion (via ipwho.is, cached, private-IP aware, fully
      defensive). Populates the world map and activates `auth.new_country`.
      Source-provided `metadata.country` still wins.
- [x] **IP reputation** — `apps/api/src/events/threat-intel.ts` scores each source
      IP at ingestion (AbuseIPDB when `ABUSEIPDB_API_KEY` is set; keyless DNSBL
      fallback otherwise). Result stored in `metadata.threat`; the
      `intel.malicious_ip` rule alerts on flagged IPs (HIGH/CRITICAL).
- [ ] Improve the status post (include like the payload, the file hash, like all request info important ones)
## 📡 More source events to emit (Bedrock)

Auth is well covered (`LOGIN_*`, `LOGOUT`, `MFA_*`, `PASSWORD_RESET`, `ROLE_CHANGED`).
Next tier for an accounting app = who touches financial data + privileged admin
actions. Emit via the existing `logSecurityEvent` helper; put context
(`businessId`, record counts, target user) in `metadata`. Each pairs with a new
SIEM detection rule.

**🔴 Data movement — the top non-auth signal for financial software**
- [ ] **`DATA_EXPORT`** — chart-of-accounts / report / xlsx export → exfiltration signal
- [ ] **`DATA_IMPORT`** — bulk CSV/xlsx import (papaparse) → tampering / injection
- [ ] **`BULK_DELETE`** — mass deletion of records → sabotage / covering tracks

**🟠 Financial record integrity (accounting-specific)**
- [ ] **`LEDGER_ENTRY_CREATED/_UPDATED/_DELETED`** — esp. large, backdated, or deleted entries
- [ ] **`ACCOUNT_MODIFIED`** — chart-of-accounts add/rename/delete

**🟠 Privileged / admin actions (insider threat + post-takeover)** — hooks exist in
`admin/team/actions.ts`
- [ ] **`ADMIN_MFA_RESET`** — `resetUserMfa` (admin resets someone else's MFA — major takeover enabler)
- [ ] **`OWNER_GRANTED` / `OWNER_REVOKED`** — `grantOwner` / `revokeOwner`
- [ ] **`USER_CREATED`** — invite accepted (`/auth/confirm`)
- [ ] **`USER_DELETED`** — member removed (`removeMember` in `team/actions.ts`)
- [ ] **`BUSINESS_CREATED` / `_DELETED`** — `businesses/actions.ts`

**🟡 Access & abuse**
- [ ] **`ACCESS_DENIED`** — 403s on resources a user doesn't belong to → IDOR / tenant probing
- [ ] **`RATE_LIMIT_TRIGGERED`** — Supabase "too many attempts" (already detected in `friendlyMessage`)

> **Suggested first batch:** `DATA_EXPORT` + `ADMIN_MFA_RESET` + `USER_DELETED`
> (exfiltration, takeover-enabler, insider offboarding). Then add matching SIEM
> rules (e.g. a *mass-export* alert).

## 🟡 Incidents & response

- [ ] Auto-group related alerts into an **Incident** (same IP/user/rule within a window).
      The Incidents page exists but nothing populates it.
- [ ] Incident view: assign, change status/priority, list linked alerts.
- [ ] **Notifications** — Slack / Discord / Email / webhook on CRITICAL alerts.
      (A SIEM no one watches is just a database.)

## 🟡 Dashboard

- [x] **Simplify the Events page** (`/events`) — trimmed to 6 grouped columns
      (app under the event, location + threat score under the IP), dropped the
      low-signal Endpoint column.
- [x] **Simplify the Alert detail page** (`/alerts/[id]`) — reads what happened →
      why it matters → recommended action, then a clean Event Details facts grid +
      compact Activity timeline. Dropped the risk card, 4 context cards, and the
      tabbed/searchable evidence panel.
- [ ] **Investigation timeline** — `events/[id]` is still a placeholder; show the
      correlated event chain + resulting alert/incident.
- [ ] **Search DSL** on Events (`event:LOGIN_FAILED ip:1.2.3.4 severity:HIGH`).
- [ ] Applications page: per-app metrics (events today, alerts, failed logins, traffic).
- [ ] User risk scoring (aggregate signal per user/account).

## ✅ Correctness & authorization hardening — DONE (2026-08-01)

Fixes for defects found auditing the engine against the docs. All covered by
tests (`npm test` in `apps/api`, 63 tests against a real Postgres).

- [x] **Correlation is scoped per application.** No rule filtered on
      `applicationId`, so every windowed/novelty query ran across all tenants:
      one app's failed logins inflated another's brute-force count, and a
      `userId` shared between apps (`usr_123`) made one tenant's history
      suppress the other's new-IP / new-country / takeover alerts. All 9
      correlating rules now scope by `applicationId`.
- [x] **Alert dedup is scoped per application** (`detection.service.ts`) — the
      same attacker IP hitting two apps used to raise one alert, not two.
- [x] **Detection windows use `createdAt`, not the sender's `timestamp`.**
      Every window keyed off client-supplied `timestamp`, so anyone holding an
      API key could evade all time-based rules by backdating events. Windows now
      use the server-assigned ingestion time; `timestamp` remains for display.
- [x] **Enrichment outranks source metadata.** `metadata.threat` is stripped
      from the payload and only ever written by threat-intel; resolved GeoIP
      overwrites a sender-claimed `country`. Previously a compromised app could
      silence `intel.malicious_ip` and `auth.new_country` on itself.
- [x] **Roles are enforced** — `RolesGuard` + `@Roles()`. `UserRole` existed but
      nothing read it, so a VIEWER could mutate alerts and register applications
      (minting live ingestion keys). Registration is ADMIN-only; alert triage is
      ADMIN/ANALYST; reads stay open to any authenticated user.
- [x] **API keys are hashed at rest** (SHA-256) with a `keyPrefix` for display.
      Shown once at registration; the dashboard shows the prefix. Existing keys
      migrated in place.
- [x] **`JWT_SECRET` is validated at startup** — no more `?? 'change-me'`
      fallback, and `JwtGuard` no longer verifies against a different value than
      `JwtModule` signs with.
- [x] **`POST /applications` has a validated DTO** (was an untyped inline body,
      so the global `ValidationPipe` enforced nothing).
- [x] **Seed no longer ships a fixed password** — uses `SEED_ADMIN_PASSWORD` or
      generates one and prints it once.
- [x] **Test harness** — Jest against a real Postgres (`docker compose up -d
      postgres`), refuses to run unless `DATABASE_URL` is local.

## 🟢 Hardening / ops

- [ ] Move detection off the request path onto **BullMQ + Redis** (already in
      `docker-compose.yml`, unused) so ingestion stays fast under load.
- [ ] Rate-limit the ingestion endpoint.
- [ ] Pagination on all list endpoints (events/alerts/incidents).
- [x] API tests (Jest + real Postgres) for guards, ingestion, dedup, and the
      correlating rules. Still to cover: the stateless rules
      (`privilege_escalation`, `admin_mfa_reset`, `malicious_ip`), auth login,
      and the events search/facets endpoints.
- [ ] Retention policy (e.g. raw events 30–90d, alerts longer).
- [ ] Dockerfiles for `api` + `web`.

## 🔒 Security hygiene (do before "real")

- [x] **Seed no longer hardcodes a password** (`SEED_ADMIN_PASSWORD` or a
      generated one). ⚠️ The already-seeded prod admin still has `admin1234` —
      change it in the database; re-seeding will not.
- [ ] **Rotate the Neon DB password** — it was exposed during setup; update
      `apps/api/.env` + the API project's `DATABASE_URL`/`DIRECT_URL`.
- [ ] Restrict CORS: confirm `WEB_ORIGIN` is set on the deployed API.
- [ ] JWT lives in `localStorage`, so any XSS on the dashboard exfiltrates a
      session. Consider an httpOnly cookie.
- [ ] No audit trail on analyst actions — `PATCH /alerts/:id` records no actor.
- [ ] Add a real user-management flow (invite / roles) instead of a single seeded admin.

## ⚪ Later / stretch

- [ ] More source apps via `@siem/sdk` (Velocity, POS, …).
- [ ] MITRE ATT&CK mapping on alerts.
- [ ] IOC management, Sigma-rule import.
- [ ] SSO for dashboard analysts.

---

### How to add a detection rule (quick reference)

```ts
// apps/api/src/detection/rules/mfa-fatigue.rule.ts
import { SecurityEvent } from '@prisma/client';
import { DetectionRule, RuleMatch } from '../detection-rule.interface';
import { PrismaService } from '../../prisma/prisma.service';

export const mfaFatigueRule: DetectionRule = {
  id: 'auth.mfa_fatigue',
  async evaluate(event: SecurityEvent, prisma: PrismaService): Promise<RuleMatch | null> {
    if (event.eventType !== 'MFA_FAILED' || !event.userId) return null;
    const count = await prisma.securityEvent.count({
      where: {
        eventType: 'MFA_FAILED',
        userId: event.userId,
        timestamp: { gte: new Date(event.timestamp.getTime() - 10 * 60_000) },
      },
    });
    if (count >= 5) {
      return {
        title: 'Possible MFA fatigue',
        severity: 'HIGH',
        description: `${count} failed MFA attempts for ${event.email ?? event.userId} in 10 minutes.`,
      };
    }
    return null;
  },
};
// then register it in apps/api/src/detection/rules/index.ts
```
