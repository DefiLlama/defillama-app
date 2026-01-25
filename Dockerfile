# syntax=docker/dockerfile:1.6

FROM oven/bun:1 AS base

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS builder
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ARG LOGGER_API_KEY
ARG LOGGER_API_URL
ARG BUILD_STATUS_DASHBOARD
ARG BUILD_STATUS_WEBHOOK
ARG BUILD_LLAMAS
ARG SOURCE_COMMIT
ARG COOLIFY_BRANCH
ARG COOLIFY_GIT_REPOSITORY
ARG COOLIFY_GIT_URL
ARG COOLIFY_GIT_COMMIT
ARG COOLIFY_GIT_COMMIT_SHA
ARG COOLIFY_COMMIT_SHA
ARG COOLIFY_GIT_COMMIT_MESSAGE
ARG COOLIFY_GIT_COMMIT_AUTHOR

RUN --mount=type=secret,id=LOGGER_API_KEY \
  --mount=type=secret,id=LOGGER_API_URL \
  --mount=type=secret,id=BUILD_STATUS_DASHBOARD \
  --mount=type=secret,id=BUILD_STATUS_WEBHOOK \
  bash -lc 'set -o pipefail; if [ -s /run/secrets/LOGGER_API_KEY ]; then LOGGER_API_KEY="$(cat /run/secrets/LOGGER_API_KEY)"; fi; if [ -s /run/secrets/LOGGER_API_URL ]; then LOGGER_API_URL="$(cat /run/secrets/LOGGER_API_URL)"; fi; if [ -s /run/secrets/BUILD_STATUS_DASHBOARD ]; then BUILD_STATUS_DASHBOARD="$(cat /run/secrets/BUILD_STATUS_DASHBOARD)"; fi; if [ -s /run/secrets/BUILD_STATUS_WEBHOOK ]; then BUILD_STATUS_WEBHOOK="$(cat /run/secrets/BUILD_STATUS_WEBHOOK)"; fi; export LOGGER_API_KEY LOGGER_API_URL BUILD_STATUS_DASHBOARD BUILD_STATUS_WEBHOOK BUILD_LLAMAS SOURCE_COMMIT COOLIFY_BRANCH COOLIFY_GIT_REPOSITORY COOLIFY_GIT_URL COOLIFY_GIT_COMMIT COOLIFY_GIT_COMMIT_SHA COOLIFY_COMMIT_SHA COOLIFY_GIT_COMMIT_MESSAGE COOLIFY_GIT_COMMIT_AUTHOR; START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ); START_TIME_TS=$(date -u +%s); bun run build 2>&1 | tee build.log; BUILD_STATUS=${PIPESTATUS[0]}; BUILD_TIME_SEC=$(( $(date -u +%s) - START_TIME_TS )); BUILD_TIME_MIN=$(( BUILD_TIME_SEC / 60 )); BUILD_TIME_STR=$(printf "%ss" $(( BUILD_TIME_SEC % 60 ))); if [ $BUILD_TIME_MIN -gt 0 ]; then BUILD_TIME_STR=$(printf "%sm %s" $BUILD_TIME_MIN $BUILD_TIME_STR); fi; BUILD_ID=$(find .next -name _buildManifest.js 2>/dev/null | sed 's/\/_buildManifest.js//g' | sed 's/\.next\/static\///g' || echo ''); COMMIT_SHA_ARG="${SOURCE_COMMIT:-${COOLIFY_GIT_COMMIT_SHA:-${COOLIFY_GIT_COMMIT:-${COOLIFY_COMMIT_SHA:-}}}}"; BRANCH_ARG="${COOLIFY_BRANCH:-}"; COMMIT_MSG_ARG="${COOLIFY_GIT_COMMIT_MESSAGE:-}"; COMMIT_AUTHOR_ARG="${COOLIFY_GIT_COMMIT_AUTHOR:-}"; bun run ./scripts/build-msg.js $BUILD_STATUS "$BUILD_TIME_STR" "$START_TIME" "$BUILD_ID" "$COMMIT_MSG_ARG" "$COMMIT_AUTHOR_ARG" "$COMMIT_SHA_ARG" "$BRANCH_ARG"; exit $BUILD_STATUS'

FROM base AS runner

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/bun.lock ./bun.lock
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY --from=builder /usr/src/app/scripts ./scripts

EXPOSE 3000

CMD ["sh", "-c", "./scripts/prestart.sh & bun run start"]
