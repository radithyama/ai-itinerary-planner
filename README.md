# Planit

AI travel itinerary planner. Pick a destination (or let it surprise you), your dates, group size, pace, budget and interests, and Planit builds a day-by-day itinerary with times, costs, map links and local tips.

Live: https://radithyama.site/planit

## Features

- Day-by-day itineraries generated with the Gemini API using JSON structured output
- Budget tracking per activity, per day and for the whole trip, in USD, IDR, EUR, SGD, JPY, AUD or GBP
- Regenerate a single day, with an optional request ("more food, less walking")
- My Trips dashboard, share links (private by default), print / save as PDF
- Clerk authentication, PostgreSQL via Drizzle ORM

## Stack

Next.js 14 (App Router, server actions) · TypeScript · Tailwind CSS + shadcn/ui · Clerk · Drizzle ORM + PostgreSQL (`pg`) · Gemini API · three.js globe

## Local development

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run db:migrate
npm run dev
```

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key (inlined at build time) |
| `CLERK_SECRET_KEY` | yes | Clerk secret key |
| `GEMINI_API_KEY` | yes | From Google AI Studio |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.8-flash` |
| `PLANIT_DAILY_LIMIT` | no | New plans per user per 24 hours, default 10 |
| `NEXT_PUBLIC_BASE_PATH` | no | Serve under a sub-path such as `/planit` (build time) |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (standalone output) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests for the itinerary logic (`node --test`, no extra dependencies) |
| `npm run db:migrate` | Apply SQL migrations in `migrations/` |

## Deployment

Every push to `master` runs `.github/workflows/ci-cd.yml`:

1. **Checks**: lint, typecheck, unit tests
2. **Build**: `next build` with `NEXT_PUBLIC_BASE_PATH=/planit`, packs the standalone server, boots it and checks `/api/health`
3. **Deploy** (master only):
   - runs database migrations through an SSH tunnel (Postgres only listens on the VM's localhost)
   - uploads the release to `portfolio-vm` over SSH and writes the environment file from GitHub secrets
   - switches the `current` symlink and restarts `planit.service`
   - waits for `/api/health?deep=1` to report the new version, and rolls back to the previous release if it doesn't
   - smoke-tests the public URL with `deploy/smoke.sh`

The VM only runs the prebuilt server (about 200 MB of memory). Building happens in CI, so the VM never has to fit a `next build` next to the live portfolio.

### Repository configuration

Secrets: `VM_SSH_KEY`, `VM_KNOWN_HOSTS`, `VM_HOST`, `VM_USER`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `GEMINI_API_KEY`
Variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (required), `GEMINI_MODEL`, `PLANIT_DAILY_LIMIT` (optional)

### VM layout

```
/opt/planit/releases/<sha>/   standalone server per release (last 3 kept)
/opt/planit/current           symlink to the active release
/opt/planit/shared/.env       written by CI on each deploy (mode 600)
/etc/systemd/system/planit.service      node server.js on localhost:3001, MemoryMax=512M
/etc/nginx/snippets/planit*.conf        /planit locations, included in the portfolio's HTTPS server block
PostgreSQL 15, database `planit`         localhost only, tuned for the e2-small
/var/backups/planit/                    nightly pg_dump at 03:15, 7 days kept
```

`deploy/setup-vm.sh` and `deploy/setup-postgres.sh` are the one-time, idempotent bootstrap scripts for those pieces.

Useful commands on the VM:

```bash
sudo systemctl status planit
sudo journalctl -u planit -f
sudo -u postgres psql planit
sudo -u postgres pg_restore -d planit --clean /var/backups/planit/planit-YYYY-MM-DD.dump
```
