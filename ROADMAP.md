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

- [ ] **Simplify the Events page** (`/events`) — the current table is confusing;
      make it scannable at a glance (clearer columns/spacing, group or de-emphasize
      low-signal fields, obvious threat/severity cues).
- [ ] **Simplify the Alert detail page** (`/alerts/[id]`) — too much going on; cut
      the noise so an analyst instantly sees what happened, why it matters, and what
      to do. Fewer panels, clearer hierarchy.
- [ ] **Investigation timeline** — `events/[id]` is still a placeholder; show the
      correlated event chain + resulting alert/incident.
- [ ] **Search DSL** on Events (`event:LOGIN_FAILED ip:1.2.3.4 severity:HIGH`).
- [ ] Applications page: per-app metrics (events today, alerts, failed logins, traffic).
- [ ] User risk scoring (aggregate signal per user/account).

## 🟢 Hardening / ops

- [ ] Move detection off the request path onto **BullMQ + Redis** (already in
      `docker-compose.yml`, unused) so ingestion stays fast under load.
- [ ] Rate-limit the ingestion endpoint.
- [ ] Pagination on all list endpoints (events/alerts/incidents).
- [ ] API tests (Jest is set up) for guards, ingestion, and each rule.
- [ ] Retention policy (e.g. raw events 30–90d, alerts longer).
- [ ] Dockerfiles for `api` + `web`.

## 🔒 Security hygiene (do before "real")

- [ ] **Change the seeded admin password** — still `admin1234` in prod.
- [ ] **Rotate the Neon DB password** — it was exposed during setup; update
      `apps/api/.env` + the API project's `DATABASE_URL`/`DIRECT_URL`.
- [ ] Restrict CORS: confirm `WEB_ORIGIN` is set on the deployed API.
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
