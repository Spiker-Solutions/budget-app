#!/usr/bin/env bash
# Idempotent repository bootstrap for Cloud Agents.
# Installs PostgreSQL, prepares the local database, installs dependencies,
# applies migrations, and seeds demo data so the app is usable on boot.
set -euo pipefail

cd "$(dirname "$0")/.."

PG_VERSION=16
DB_NAME=budget_app

echo "==> Ensuring PostgreSQL is installed"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Configuring postgres role and database"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb "$DB_NAME"
fi

echo "==> Ensuring .env exists"
if [ ! -f .env ]; then
  SECRET="$(openssl rand -base64 32)"
  cat > .env <<EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${DB_NAME}?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/${DB_NAME}?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${SECRET}"
EOF
fi

echo "==> Installing npm dependencies"
npm ci

echo "==> Applying database migrations"
npx prisma migrate deploy

echo "==> Ensuring demo seed user exists"
# Written inside the repo so Node can resolve node_modules; removed afterwards.
SEED_USER_SCRIPT=".cursor/.create-seed-user.ts"
cat > "$SEED_USER_SCRIPT" <<'TS'
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "test@test.com";
  const password = await bcrypt.hash("password123", 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Test User", password },
  });
  console.log(`Ensured seed user: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
TS
npx tsx "$SEED_USER_SCRIPT"
rm -f "$SEED_USER_SCRIPT"

echo "==> Seeding demo data (idempotent)"
npm run db:seed || true

echo "==> Install complete"
