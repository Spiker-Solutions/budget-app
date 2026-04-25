# Budget App - Agent Guidelines

This document provides guidelines for AI agents working on this codebase.

## Project Setup

### Initial Setup

1. **Install Dependencies**
  ```bash
   npm install
  ```
2. **Set Up Environment Variables**
  Copy the example environment file:
   Then configure the following variables in `.env`:

  | Variable               | Description                            | Where to Get It                                                                           |
  | ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
  | `DATABASE_URL`         | PostgreSQL connection string           | Neon: pooled URL. Local Docker: same as below.                                            |
  | `DIRECT_URL`           | Direct (non-pooled) URL for migrations | Required when using Neon pooler for `DATABASE_URL`. Local: same as `DATABASE_URL`.        |
  | `NEXTAUTH_URL`         | Your application URL                   | `http://localhost:3000` for local development                                             |
  | `NEXTAUTH_SECRET`      | Random secret for NextAuth.js          | Generate with: `openssl rand -base64 32`                                                  |
  | `GOOGLE_CLIENT_ID`     | Google OAuth client ID (optional)      | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials |
  | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional)  | Same as above                                                                             |


### Database Setup with Docker

The easiest way to run PostgreSQL locally is with Docker:

1. **Start PostgreSQL Container**
  ```bash
   docker run --name budget-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=budget_app -p 5432:5432 -d postgres:16-alpine
  ```
2. **Update .env with Connection String**
  ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/budget_app?schema=public"
  ```
3. **Run Database Migrations**
  ```bash
   npx prisma migrate dev
  ```
   This will:
  - Create the database schema
  - Generate the Prisma Client
  - Seed the database (if configured)
4. **View Database (Optional)**
  ```bash
   npx prisma studio
  ```
   This opens a visual database editor at `http://localhost:5555`

### Docker Container Management

**Stop the container:**

```bash
docker stop budget-postgres
```

**Start the container again:**

```bash
docker start budget-postgres
```

**Remove the container (deletes data):**

```bash
docker stop budget-postgres
docker rm budget-postgres
```

**View logs:**

```bash
docker logs budget-postgres
```

### Google OAuth Setup (Optional)

If you want to enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URI:
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://your-domain.com/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret** to your `.env` file

### Running the Application

1. **Development Server**
  ```bash
   npm run dev
  ```
   Opens at `http://localhost:3000`
2. **Production Build**
  ```bash
   npm run build
   npm start
  ```
3. **Type Checking**
  ```bash
   npx tsc --noEmit
  ```
4. **Linting**
  ```bash
   npm run lint
  ```

### Cloud Database Alternatives

Instead of Docker, you can use cloud PostgreSQL providers:

- **[Neon](https://neon.tech/)** - Serverless PostgreSQL (generous free tier)
- **[Supabase](https://supabase.com/)** - Open source Firebase alternative
- **[Railway](https://railway.app/)** - Simple infrastructure platform
- **[Vercel Postgres](https://vercel.com/storage/postgres)** - If deploying to Vercel

Simply copy the connection string from your provider and paste it as `DATABASE_URL` in `.env`.

### Troubleshooting

**"Port 5432 already in use"**

- Another PostgreSQL instance is running. Stop it or use a different port:
  ```bash
  docker run --name budget-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=budget_app -p 5433:5432 -d postgres:16-alpine
  ```
  Update `DATABASE_URL` to use port 5433.

**"Can't reach database server"**

- Ensure Docker container is running: `docker ps`
- Check connection string in `.env` matches your setup

**Prisma Client errors**

- Regenerate the client: `npx prisma generate`
- Check that migrations are up to date: `npx prisma migrate status`

---

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **UI Components**: Mantine v7
- **Styling**: Tailwind CSS (utilities only)
- **State Management**: Zustand
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Hosting**: Netlify

## Core Principles

### 1. Mantine First

- **ALWAYS** use Mantine components before building custom UI
- Check Mantine documentation for existing components before creating new ones
- Available components include: `Button`, `TextInput`, `NumberInput`, `PasswordInput`, `Select`, `Modal`, `Drawer`, `Table`, `Card`, `Tabs`, `Menu`, `Avatar`, `Badge`, `Progress`, `Skeleton`, `Notification`, `Alert`, `Paper`, `Stack`, `Group`, `SimpleGrid`, `Container`, `Title`, `Text`

### 2. State Management

- Use **Zustand** for all shared client-side state
- Do NOT use React Context for state management
- Local component state (useState) is fine for form inputs and UI-only state
- Stores are located in `src/stores/`

### 3. Styling Guidelines

- Tailwind is configured WITHOUT base styles (preflight disabled)
- Use Tailwind only for:
  - Spacing utilities (margin, padding)
  - Layout utilities (flex, grid)
  - Custom utilities not provided by Mantine
- Use Mantine's style props for component styling
- Do NOT use Tailwind for typography, colors, or base element styles

### 4. TypeScript

- Strict mode is enabled - no `any` types without justification
- All components must be typed
- Use types from `src/types/index.ts` for database models

### 5. Database

- All database queries go through Prisma (`src/lib/prisma.ts`)
- Use Decimal for money fields (12,2 precision)
- Normalize payee names (lowercase, trimmed) for case-insensitive matching

## Component Guidelines

### Forms

```tsx
import { useForm } from "@mantine/form";
import { TextInput, NumberInput, Button } from "@mantine/core";

// Use Mantine's useForm hook with validation
const form = useForm({
  initialValues: { name: "", amount: 0 },
  validate: {
    name: (value) => (value.length < 1 ? "Name is required" : null),
    amount: (value) => (value <= 0 ? "Amount must be positive" : null),
  },
});
```

### Date Handling

```tsx
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";

// Use Mantine DatePickerInput, dayjs for manipulation
```

### Icons

```tsx
import { IconWallet, IconPlus } from "@tabler/icons-react";

// Use @tabler/icons-react (Mantine's recommended icon set)
```

### Notifications

```tsx
import { notifications } from "@mantine/notifications";

notifications.show({
  title: "Success",
  message: "Budget created successfully",
  color: "green",
});
```

## API Patterns

### Route Handlers

```tsx
// src/app/api/budgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }
  
  const data = await prisma.budget.findMany({ ... });
  return NextResponse.json(successResponse(data));
}
```

### Response Format

Always return consistent response shapes:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

### Validation

Use Zod for request validation:

```tsx
import { z } from "zod";

const createBudgetSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
});
```

## File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API route handlers
├── components/            # React components
│   ├── budgets/          # Budget-related components
│   ├── envelopes/        # Envelope-related components
│   ├── expenses/         # Expense-related components
│   └── shared/           # Shared/reusable components
├── lib/                   # Utilities and configurations
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

## Authentication

- Use NextAuth.js for all auth operations
- Session is available via `getServerSession(authOptions)` in server components/API routes
- Session is available via `useSession()` in client components
- Protected routes should check session and redirect to login if not authenticated

## Role System

- **ADMIN**: Can modify settings, invite/remove members, full CRUD access
- **USER**: Can view and create expenses, limited editing
- Budget admins automatically have admin access to all envelopes in that budget

## Common Mistakes to Avoid

1. ❌ Creating custom UI when Mantine has a component
2. ❌ Using React Context for shared state instead of Zustand
3. ❌ Using Tailwind for base element styling
4. ❌ Using `any` types without documentation
5. ❌ Storing money as float instead of Decimal
6. ❌ Not checking authentication in API routes
7. ❌ Not using Zod for request validation

