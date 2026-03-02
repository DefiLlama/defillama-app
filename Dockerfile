# syntax=docker/dockerfile:1.6

FROM oven/bun:1 AS base

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dotenvx (for loading env at runtime inside Docker)
RUN curl -fsS https://dotenvx.sh | sh
RUN dotenvx ext prebuild

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS builder
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ARG COOLIFY_BRANCH

RUN --mount=type=secret,id=LOGGER_API_KEY \
  --mount=type=secret,id=LOGGER_API_URL \
  --mount=type=secret,id=BUILD_STATUS_DASHBOARD \
  --mount=type=secret,id=BUILD_STATUS_WEBHOOK \
  LOGGER_API_KEY="$(cat /run/secrets/LOGGER_API_KEY 2>/dev/null || true)" \
  LOGGER_API_URL="$(cat /run/secrets/LOGGER_API_URL 2>/dev/null || true)" \
  BUILD_STATUS_DASHBOARD="$(cat /run/secrets/BUILD_STATUS_DASHBOARD 2>/dev/null || true)" \
  BUILD_STATUS_WEBHOOK="$(cat /run/secrets/BUILD_STATUS_WEBHOOK 2>/dev/null || true)" \
  COOLIFY_BRANCH="${COOLIFY_BRANCH:-}" \
  bun run build

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

WORKDIR /usr/src/app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/scripts ./scripts

USER nextjs

EXPOSE 3000

CMD ["dotenvx", "run", "--", "sh", "-c", "./scripts/prestart.sh & node server.js"]
