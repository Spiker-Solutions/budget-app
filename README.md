# Budget App

A collaborative budget tracking application built with Next.js, Mantine, Prisma, and PostgreSQL.

## Local development

See [CLAUDE.md](./CLAUDE.md) for setup (Docker Postgres, env vars, Prisma, Netlify notes).

## PR previews: Neon + Netlify (official flow)

This repo follows **[Automate preview deployments with Netlify and Neon](https://neon.com/guides/preview-deploys-netlify)**:

1. **Netlify:** Site → Build & deploy → **Deploy previews: None** (Actions own previews).
2. **Netlify:** Environment variables for **Production** only: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optional Google OAuth, **`AUTH_TRUST_HOST=true`** with **Functions** scope where needed.
3. **GitHub Actions secrets:** `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_DATABASE_NAME`, `NEON_DATABASE_USERNAME`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, **`NEXTAUTH_SECRET`** (same as production).
4. **Optional:** Repository variable `NETLIFY_SITE_SLUG` (subdomain only, e.g. `mrbudgets`) if the workflow cannot resolve the site name from the API.
5. **Optional:** `NEON_PREVIEW_PARENT_BRANCH` — Neon branch to fork preview DBs from (default `development`).

Workflows:

- `.github/workflows/deploy-preview.yml` — creates a Neon branch, runs `npm run generate-migrate`, then pushes per-PR `DATABASE_URL` / `DIRECT_URL` / `NEXTAUTH_*` / `AUTH_TRUST_HOST` to Netlify’s **deploy-preview** context with **builds** and **functions** scopes (so API routes can reach Postgres), builds from a merged `.env`, and runs `netlify deploy --context=deploy-preview`.
- `.github/workflows/cleanup-preview.yml` — deletes the preview Neon branch when the PR closes.

**Scripts (per Neon guide):** `generate-migrate` = `prisma generate && prisma migrate deploy`; `build` = `prisma generate && next build`.

## Tech stack

- Next.js (App Router), TypeScript, Mantine v7, Zustand, Prisma, NextAuth.js, Netlify.
