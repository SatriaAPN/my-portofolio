# syntax=docker/dockerfile:1

# ---- deps stage: install node_modules from the lockfile --------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build stage: produce the standalone server ---------------------------
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime stage: minimal image running server.js -----------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Bind all interfaces so the reverse proxy can reach the container.
    HOSTNAME=0.0.0.0

RUN addgroup -g 10001 nodejs && adduser -D -u 10001 -G nodejs nextjs

# `output: "standalone"` emits a minimal server plus a trimmed node_modules;
# public/ and .next/static must be copied in alongside it (Next does not).
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
