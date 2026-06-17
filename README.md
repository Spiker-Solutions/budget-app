# Budget App

A collaborative budget tracking application built with Next.js, Mantine, Prisma, and PostgreSQL.

## Local development

See [CLAUDE.md](./CLAUDE.md) for setup (Docker Postgres, env vars, Prisma, Netlify notes).

## Seeding demo data

After migrations are applied and you have a local user account, you can populate the database with sample budgets, envelopes, payees, and expenses:

```bash
npm run db:seed
```

**Requirements**

- The target user must already exist (register or log in once before seeding).
- By default, data is seeded for `test@test.com`. Override with `SEED_USER_EMAIL`.

**What gets created**

- `[Demo] Household Budget` — monthly budget with 8 envelopes and ~100 expenses over the last few months
- `[Demo] Vacation Fund` — biweekly savings budget with deposit history
- Extra test accounts for shared-budget testing:
  - `partner@test.com` — ADMIN on the household budget (password: `password123`)
  - `roommate@test.com` — USER on the household budget (password: `password123`)

Demo budgets are prefixed with `[Demo]` so they are easy to find and replace.

**Re-seeding**

If demo data already exists, the seed script skips unless you force a refresh (this removes existing `[Demo]` budgets for that user first):

```bash
# macOS / Linux
FORCE_SEED=1 npm run db:seed

# Windows PowerShell
$env:FORCE_SEED=1; npm run db:seed
```

Seed a different user:

```bash
# macOS / Linux
SEED_USER_EMAIL=other@example.com npm run db:seed

# Windows PowerShell
$env:SEED_USER_EMAIL="other@example.com"; npm run db:seed
```

The seed script lives at `prisma/seed.ts`.

## PR previews: Neon + Netlify (official flow)

This repo follows **[Automate preview deployments with Netlify and Neon](https://neon.com/guides/preview-deploys-netlify)**:

1. **Netlify:** Site → Build & deploy → **Deploy previews: None** (Actions own previews).
2. **Netlify:** Environment variables for **Production** only: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optional Google OAuth, **`AUTH_TRUST_HOST=true`** with **Functions** scope where needed.
3. **GitHub Actions secrets:** `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_DATABASE_NAME`, `NEON_DATABASE_USERNAME`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, **`NEXTAUTH_SECRET`** (same as production).
4. **Optional:** Repository variable `NETLIFY_SITE_SLUG` (subdomain only, e.g. `mrbudgets`) if the workflow cannot resolve the site name from the API.
5. **Optional:** `NEON_PREVIEW_PARENT_BRANCH` — Neon branch to fork preview DBs from (default `development`).

Workflows:

- `.github/workflows/deploy-preview.yml` — creates a Neon branch, runs `npm run generate-migrate`, then `netlify deploy --context=deploy-preview` with a `.env` built from `netlify env:list` plus per-PR `DATABASE_URL` / `DIRECT_URL` / preview `NEXTAUTH_*`.
- `.github/workflows/cleanup-preview.yml` — deletes the preview Neon branch when the PR closes.

**Scripts (per Neon guide):** `generate-migrate` = `prisma generate && prisma migrate deploy`; `build` = `prisma generate && next build`.

## Tech stack

- Next.js (App Router), TypeScript, Mantine v7, Zustand, Prisma, NextAuth.js, Netlify.
