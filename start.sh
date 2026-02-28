#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/db && pnpm exec prisma migrate deploy || echo "Migration skipped (no pending migrations or first run)"
cd /app

echo "Syncing database schema..."
cd /app/packages/db && pnpm exec prisma db push --accept-data-loss 2>/dev/null || true
cd /app

echo "Starting VoiceFlow server..."
exec pnpm exec tsx server.ts
