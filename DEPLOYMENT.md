# Deploying the SIEM Platform

Recommended stack — **everything on Vercel + Neon, fully free, no sleep**:

| Piece | Platform | Cost |
| ----- | -------- | ---- |
| Postgres | **Neon** | Free (auto-suspends when idle) |
| API (`apps/api`, NestJS) | **Vercel** (serverless) | Free (Hobby) |
| Web (`apps/web`, Next.js) | **Vercel** | Free (Hobby) |

The API runs as a Vercel serverless function (see `apps/api/api/index.ts` +
`apps/api/vercel.json`). Vercel functions scale to zero and cold-start on demand
— there's no Render-style "sleep then down". A Render alternative is in
[§6](#6-alternative-api-on-render).

Deploy order matters: **Neon → API (Vercel) → Web (Vercel)**, because the web
build needs the API's URL, and the API needs the database URL.

---

## 0. Code changes — already done ✅

These are committed on the `feat/vercel-api-deploy` branch:

- [x] Shared `createApp()` factory (`src/create-app.ts`) — used by both local
      server and the serverless handler
- [x] Serverless entrypoint `apps/api/api/index.ts` + `apps/api/vercel.json`
- [x] API reads `PORT` (`src/main.ts`) for the Render fallback
- [x] Prisma `binaryTargets` (`rhel` for Vercel, `debian` for Render) + `directUrl`
- [x] CORS restricted to `WEB_ORIGIN`
- [x] `tsconfig` builds cleanly to `dist/main.js` (incremental off, `api/` excluded)

---

## 1. Database — Neon

1. Sign up at **neon.tech** → **Create project** (pick a region near your users).
2. After creation, open **Dashboard → Connection Details**. You get two strings:
   - **Pooled** (host contains `-pooler`) → use as `DATABASE_URL` (runtime).
   - **Direct** (no `-pooler`) → use as `DIRECT_URL` (migrations).
3. Append `?sslmode=require` if not present. For the pooled one Prisma also wants
   `&pgbouncer=true&connection_limit=1`. Example:

   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
   ```

4. Keep both strings — you'll paste them into Render in step 2.

> Neon free tier **auto-suspends after 5 min idle**. The first query after idle
> has a ~1s cold start. Fine for a portfolio; upgrade Neon or keep it warm for
> always-on.

---

## 2. API — Vercel (serverless)

The repo is already wired for this: `apps/api/vercel.json` sets the build command
(Prisma generate + migrate + `nest build`) and rewrites every request to the
serverless function `apps/api/api/index.ts`.

### Create the project
1. **vercel.com → Add New → Project** → import the repo.
2. Settings:
   - **Root Directory:** `apps/api`
   - **Framework Preset:** Other (config comes from `vercel.json` — leave build
     settings default; do **not** override the build command).
   - Vercel installs the workspace deps from the repo root automatically. If
     install fails, set **Install Command** to `npm install --prefix ../..`.
3. **Environment variables:**
   | Key | Value |
   | --- | ----- |
   | `DATABASE_URL` | Neon **pooled** string |
   | `DIRECT_URL` | Neon **direct** string |
   | `JWT_SECRET` | a long random secret (`openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `1d` |
   | `WEB_ORIGIN` | your web URL (add after step 3, then redeploy) |
4. Deploy. The build runs `prisma migrate deploy` automatically, so the schema is
   applied. Note the URL: `https://siem-api-xxxx.vercel.app`. Test it:
   `curl https://siem-api-xxxx.vercel.app/api/v1/events` → `401` means it's live.

> **No sleep:** Vercel functions scale to zero and cold-start (~1s) on demand —
> there's no 15-min shutdown. Neon still suspends its DB after 5 min idle, adding
> a one-time ~1s to the first query after a lull.

### Seed the admin user + apps (one time)
The login user and API keys don't exist in prod until you seed. Run it locally
against the prod DB:
```
cd apps/api
DATABASE_URL="<neon-pooled>" DIRECT_URL="<neon-direct>" npx ts-node prisma/seed.ts
```
It prints the admin login and each app's API key. **Change the seeded
`admin1234` password** (or edit `seed.ts` before running).

> **Prisma on Vercel:** the schema's `binaryTargets` include `rhel-openssl-3.0.x`
> (Vercel's Amazon-Linux runtime). If you ever see a Prisma "engine not found"
> error, the message names the exact target to add.

---

## 3. Web — Vercel

1. **vercel.com → Add New → Project** → import the repo.
2. Settings:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto-detected)
   - Vercel installs workspace deps from the repo root automatically. If install
     fails, set **Install Command** to `npm install --prefix ../..`.
3. **Environment variable:**
   | Key | Value |
   | --- | ----- |
   | `NEXT_PUBLIC_API_URL` | your API URL, e.g. `https://siem-api-xxxx.vercel.app` |

   > This is **baked at build time**. If you change it later you must redeploy.
4. Deploy → you get `https://your-siem.vercel.app`.
5. Go back to the **API project → `WEB_ORIGIN`** = this web URL, and redeploy the
   API so CORS allows the browser.

---

## 4. Point Bedrock at production

In Bedrock’s prod environment (Vercel/host env vars):
```
SIEM_API_URL=https://siem-api-xxxx.vercel.app
SIEM_API_KEY=<the bedrock-360 app key from the prod seed>
```
No `NEXT_PUBLIC_` prefix — it stays server-only. Now real Bedrock logins flow to
the deployed SIEM.

---

## 5. Quick reference — env vars per service

| Var | Neon | API (Vercel) | Web (Vercel) | Bedrock |
| --- | ---- | ------------ | ------------ | ------- |
| `DATABASE_URL` | — | ✅ pooled | — | — |
| `DIRECT_URL` | — | ✅ direct | — | — |
| `JWT_SECRET` | — | ✅ | — | — |
| `JWT_EXPIRES_IN` | — | ✅ | — | — |
| `WEB_ORIGIN` | — | ✅ web URL | — | — |
| `NEXT_PUBLIC_API_URL` | — | — | ✅ API URL | — |
| `SIEM_API_URL` | — | — | — | ✅ API URL |
| `SIEM_API_KEY` | — | — | — | ✅ app key |

---

## 6. Alternative: API on Render

If you'd rather run the API as a normal long-running server (no serverless
entrypoint), Render works too — `src/main.ts` still listens on `PORT`.

- **Root Directory:** *(blank — repo root)*
- **Build:** `npm install && npm --workspace apps/api run build && npx prisma generate --schema=apps/api/prisma/schema.prisma`
- **Start:** `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/main`
- Same env vars as the Vercel API project above.
- **Sleep:** free tier sleeps after 15 min idle; **Starter ($7/mo)** stays always-on.

Everything else (Neon, Web, Bedrock, seeding) is identical — just swap the API
URL for the Render one.
