# Budget App

A modern envelope budgeting application built with Next.js, Mantine, and Prisma.

## Features

- **Envelope Budgeting**: Allocate your money into virtual envelopes for different spending categories
- **Expense Tracking**: Log expenses and see exactly where your money goes
- **Team Collaboration**: Share budgets with family members or partners
- **Flexible Periods**: Weekly, bi-weekly, monthly, or custom budget periods
- **Modern UI**: Built with Mantine components for a beautiful, responsive experience

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Components**: Mantine v7
- **Styling**: Tailwind CSS (utilities only)
- **State Management**: Zustand
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Hosting**: Netlify

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd budget-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database connection string and other secrets:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/budget_app?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Netlify

### Environment Variables

Set these environment variables in your Netlify dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon: use the **pooled** URL for serverless) |
| `DIRECT_URL` | Same database, **direct** (non-pooled) URL — required for `prisma migrate` (local: can match `DATABASE_URL`) |
| `NEXTAUTH_URL` | Your production URL (e.g., `https://your-app.netlify.app`) |
| `NEXTAUTH_SECRET` | Random secret (generate with `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional) |

### Deploy

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Netlify will automatically detect the Next.js configuration
4. Set the environment variables in Netlify dashboard
5. Deploy!

### Database migrations on Netlify

**Production** and **branch deploys** (if enabled in Netlify) run `npx prisma migrate deploy && npm run build` (see `netlify.toml`).

Neon recommends a **separate Postgres branch per pull request**, with migrations run against that branch, then a preview deployed to Netlify. That flow is **not** a button in the Netlify UI; it is **GitHub Actions** + Neon’s API. Follow Neon’s guide (same flow as this repo’s workflows):

- **[Automate preview deployments with Netlify and Neon](https://neon.com/guides/preview-deploys-netlify)**

Summary of that approach:

1. In Netlify, set **Deploy previews** to **None** (so Netlify does not build PRs on its own). Production still builds from your main branch as usual.
2. Add GitHub **repository secrets** (`NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_DATABASE_NAME`, `NEON_DATABASE_USERNAME`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, **`NEXTAUTH_SECRET`**) as described in the guide. Previews need `NEXTAUTH_SECRET` during `netlify deploy --build` because NextAuth validates `NEXTAUTH_URL` at build time.

3. Optional **`NETLIFY_SITE_SLUG`** (subdomain only, e.g. `mrbudgets`): use an Actions **variable** or **secret** with that exact name. GitHub keeps **Variables** and **Secrets** separate — the workflow uses **`vars.NETLIFY_SITE_SLUG || secrets.NETLIFY_SITE_SLUG`**. If unset, it loads the site name from the Netlify API (`NETLIFY_SITE_ID` + token). Preview origin: **`https://pr-<PR#>--<site-name>.netlify.app`**.
4. On each PR, `.github/workflows/deploy-preview.yml` creates a **Neon branch**, runs **`npm run db:generate-migrate`** (migrations + generate), then **`netlify deploy --build`** with that branch’s pooled and direct URLs.
5. When the PR closes, `.github/workflows/cleanup-preview.yml` deletes the Neon preview branch.

This repo includes those workflows; enable them by adding the secrets. **Do not** point preview builds at your production `DATABASE_URL`.

**Preview Neon branches fork from `development`**, not production (see `parent` in `deploy-preview.yml`). A Neon branch named **`development`** must exist; keep it free of real customer data (empty DB, seed data, or periodic reset). Override the parent name with a GitHub **repository variable** `NEON_PREVIEW_PARENT_BRANCH` if you use a different Neon branch.

**Migrations and merging to `main`:** PR previews run `prisma migrate deploy` only on the **temporary preview** Neon branch. Merging the PR does **not** run those migrations on production by itself—production schema updates when a **production** deploy runs (e.g. Netlify build on `main`) with `migrate deploy` against your **production** Neon branch. Keep migration files in the PR as usual; after merge, deploy `main` so production applies the same migration history. Periodically refresh your **`development`** Neon branch (e.g. reset from `production` in Neon console, or re-run migrations) so it stays schema-aligned without carrying prod data you do not want copied.

### Prisma + Neon: `DATABASE_URL` and `DIRECT_URL`

`schema.prisma` uses **`directUrl`** for migrations. In Neon:

- **`DATABASE_URL`**: pooled connection string (for the app at runtime).
- **`DIRECT_URL`**: direct (non-pooled) connection string (for `prisma migrate`).

For **local Docker**, set **`DIRECT_URL`** to the same value as **`DATABASE_URL`**.

Set both in Netlify for **Production** (and any other context that runs migrations).

### NextAuth on previews

The **GitHub Action** writes `NEXTAUTH_URL` and `NEXTAUTH_SECRET` into `.env` before `netlify deploy --build` (see `deploy-preview.yml`), using `NETLIFY_SITE_SLUG` and the `NEXTAUTH_SECRET` secret. Add **`GOOGLE_CLIENT_ID`** / **`GOOGLE_CLIENT_SECRET`** to Netlify’s **Deploy previews** context if you need Google on previews, and add matching redirect URIs in Google Cloud (`https://pr-<PR#>--<slug>.netlify.app/api/auth/callback/google`). Many teams use email/password only on previews.

## Database Setup

For production, you can use:
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Railway](https://railway.app/) - Infrastructure platform
- [PlanetScale](https://planetscale.com/) - MySQL compatible (requires schema changes)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API route handlers
├── components/            # React components
├── lib/                   # Utilities and configurations
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines.

## License

MIT
