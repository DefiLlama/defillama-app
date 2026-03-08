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
ARG LOGGER_API_KEY
ARG LOGGER_API_URL
ARG BUILD_STATUS_WEBHOOK
ARG BUILD_NOTIFY_USERS

RUN bash ./scripts/build.sh

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

WORKDIR /usr/src/app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/scripts ./scripts

USER nextjs

EXPOSE 3000

CMD ["dotenvx", "run", "--", "sh", "-c", "./scripts/prestart.sh & bun server.js"]
