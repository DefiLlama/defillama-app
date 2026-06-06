# syntax=docker/dockerfile:1.6

FROM node:24-bookworm-slim AS node-base

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dotenvx (for loading env at runtime inside Docker)
RUN curl -fsS https://dotenvx.sh | sh
RUN dotenvx ext prebuild

FROM node-base AS bun-base

ENV BUN_INSTALL=/usr/local/bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends unzip \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://bun.sh/install | bash

FROM bun-base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM bun-base AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends rclone \
  && rm -rf /var/lib/apt/lists/*

COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ARG COOLIFY_BRANCH
ARG SOURCE_COMMIT
ARG BUILD_DEPLOYMENT_NAME
ARG COOLIFY_CONTAINER_NAME
ARG COOLIFY_RESOURCE_UUID
ARG COOLIFY_FQDN
ARG COOLIFY_URL
ARG VERCEL_GIT_COMMIT_SHA
ARG NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
ARG GITHUB_SHA
ARG LOGGER_API_KEY
ARG LOGGER_API_URL
ARG BUILD_STATUS_WEBHOOK
ARG BUILD_NOTIFY_USERS

RUN bash ./scripts/build.sh

FROM node-base AS runner

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
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/node_modules/@next/env ./node_modules/@next/env
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/node_modules/jiti ./node_modules/jiti

USER nextjs

EXPOSE 3000

CMD ["dotenvx", "run", "--", "sh", "./scripts/docker-entrypoint.sh", "server.js"]
