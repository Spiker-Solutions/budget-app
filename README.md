# Budget App

A collaborative budget tracking application built with Next.js, Mantine, Prisma, and PostgreSQL.

## Local development

See [CLAUDE.md](./CLAUDE.md) for setup (Docker Postgres, env vars, Prisma, Netlify notes).

## PR previews: Neon + Netlify (official flow)

This repo follows **[Automate preview deployments with Netlify and Neon](https://neon.com/guides/preview-deploys-netlify)**:

1. **Netlify:** Site → Build & deploy → **Deploy previews: None** (Actions own previews).
2. **Netlify:** Environment variables for **Production** only: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, optional Google OAuth, **`AUTH_TRUST_HOST=true`** with **Functions** scope where needed.
3. **GitHub Actions secrets:** `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_DATABASE_NAME`, `NEON_DATABASE_USERNAME`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, **`NEXTAUTH_SECRET`** (same as production), **`NEXTAUTH_URL`** (see below).
4. **Preview `NEXTAUTH_URL`:** Store your Netlify site hostname **only** in secret **`NEXTAUTH_URL`** (e.g. `mrbudgets.netlify.app`, no `https://`). The workflow builds the real preview origin as **`https://pr-<PR#>--<NEXTAUTH_URL>`** (e.g. PR 1 → `https://pr-1--mrbudgets.netlify.app`) to match `netlify deploy --alias pr-<PR#>`, then writes that full URL into `.env` for NextAuth. It also appends **`NEXTAUTH_SECRET`** and **`AUTH_TRUST_HOST=true`** after `netlify env:list`, so previews do not rely on Netlify’s deploy-preview env for those.
5. **Optional:** `NEON_PREVIEW_PARENT_BRANCH` — Neon branch to fork preview DBs from (default `development`).

Workflows:

- `.github/workflows/deploy-preview.yml` — creates a Neon branch, runs `npm run generate-migrate`, then `netlify deploy --context=deploy-preview` with a `.env` built from `netlify env:list` plus per-PR `DATABASE_URL` / `DIRECT_URL` / preview `NEXTAUTH_*`.
- `.github/workflows/cleanup-preview.yml` — deletes the preview Neon branch when the PR closes.

**Scripts (per Neon guide):** `generate-migrate` = `prisma generate && prisma migrate deploy`; `build` = `prisma generate && next build`.

## Tech stack

- Next.js (App Router), TypeScript, Mantine v7, Zustand, Prisma, NextAuth.js, Netlify.
