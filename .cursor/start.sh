#!/usr/bin/env bash
# Per-boot reconciliation: start PostgreSQL and apply any pending migrations.
# Must be idempotent and tolerant of an already-running cluster.
set -euo pipefail

cd "$(dirname "$0")/.."

PG_VERSION=16

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Applying any pending migrations"
npx prisma migrate deploy

echo "==> Start reconciliation complete"
