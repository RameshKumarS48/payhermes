# ============ Build Stage ============
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./

# Copy package.json files for all packages
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY packages/ packages/
COPY apps/ apps/
COPY server.ts ./

# Generate Prisma client (dummy URL - generate doesn't connect to DB)
# Use pnpm exec to run project-local prisma v6, NOT npx which grabs v7
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd packages/db && pnpm exec prisma generate

# Build Next.js (standalone output, API calls go to same origin)
RUN cd apps/web && NEXT_PUBLIC_API_URL="" pnpm exec next build

# ============ Production Stage ============
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

# Install ALL dependencies (tsx needed at runtime)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and regenerate (dummy URL - generate doesn't connect to DB)
COPY packages/db/prisma packages/db/prisma
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN cd packages/db && pnpm exec prisma generate

# Copy source (tsx runs TypeScript directly at runtime)
COPY packages/shared/src packages/shared/src
COPY packages/db/src packages/db/src
COPY apps/api/src apps/api/src
COPY server.ts ./
COPY start.sh ./

# Copy built Next.js standalone + static assets
COPY --from=builder /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN chmod +x start.sh

EXPOSE 8080

# Run migrations + start server
CMD ["./start.sh"]
