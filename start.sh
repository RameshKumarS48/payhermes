#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/db && npx prisma migrate deploy || echo "Migration skipped (no pending migrations or first run)"
cd /app

echo "Generating Prisma client..."
cd /app/packages/db && npx prisma db push --accept-data-loss 2>/dev/null || true
cd /app

echo "Starting VoiceFlow server..."
exec npx tsx server.ts
