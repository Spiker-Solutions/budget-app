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
