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
| `DATABASE_URL` | PostgreSQL connection string |
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

Production builds run `npx prisma migrate deploy` before `npm run build` (see `netlify.toml`). Ensure **`DATABASE_URL`** is set for the **Production** context in Netlify.

Deploy previews and branch deploys use the default `npm run build` only. Point each preview at its own database (recommended: a **Neon branch** per preview) and either:

- Run `npx prisma migrate deploy` once against that branch’s connection string after creating it, or
- Add a `[context.deploy-preview]` (and optionally `[context.branch-deploy]`) `command` in `netlify.toml` that runs `prisma migrate deploy && npm run build` once you are comfortable auto-migrating preview databases.

### Branch deploy previews

1. In Netlify: **Site configuration → Build & deploy → Continuous deployment → Branches and deploy contexts**, enable **Deploy Previews** for pull requests and configure **Branch deploys** (e.g. allow all branches or a name pattern).
2. **Neon + previews**: Create a Neon **database branch** (or use the [Neon Netlify integration](https://neon.tech/docs/guides/netlify)) so each preview uses an isolated `DATABASE_URL`. Do not point previews at production data unless you accept the risk.
3. **NextAuth on previews**: OAuth callbacks need **`NEXTAUTH_URL`** to match the site origin. Production should use your primary domain. For deploy previews, either set **`NEXTAUTH_URL`** per preview (tedious) or use a build-time value: Netlify sets **`DEPLOY_PRIME_URL`** during builds (see [Netlify env vars](https://docs.netlify.com/configure-builds/environment-variables/)). Some teams add a small build script or plugin that writes `NEXTAUTH_URL` from `DEPLOY_PRIME_URL` for preview contexts only; others skip OAuth on previews and test with credentials providers only.

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
