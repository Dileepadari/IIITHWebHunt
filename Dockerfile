# Multi-stage build for the Website Hunt platform.
FROM node:22-alpine AS base

# --- dependencies for building -------------------------------------------------
FROM base AS build-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- build the client bundle and the server bundle -----------------------------
FROM build-deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# --- runtime -------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# curl backs the healthcheck; netcat is what the entrypoint uses to wait for
# Postgres. Neither ships in the alpine base, so the old image's HEALTHCHECK and
# entrypoint could never have worked.
RUN apk add --no-cache curl netcat-openbsd

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs hunt

# The full dependency tree, not just production: the entrypoint runs
# `drizzle-kit push` and `tsx scripts/seed.ts` at container start, and both are
# devDependencies. Trimming them made the image smaller and the migration step
# impossible.
COPY --from=build-deps /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Sources the migration and seed steps read at runtime.
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER hunt
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# The entrypoint applies migrations (and optionally seeds) before handing off to
# the server; the previous image never referenced it, so a fresh database was
# left without tables.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
