# syntax=docker/dockerfile:1.6

FROM oven/bun:1 AS base

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dotenvx (for loading env at runtime inside Docker)
RUN curl -fsS https://dotenvx.sh | sh
RUN dotenvx ext prebuild

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

ARG COOLIFY_BRANCH

RUN --mount=type=secret,id=LOGGER_API_KEY \
  --mount=type=secret,id=LOGGER_API_URL \
  --mount=type=secret,id=BUILD_STATUS_DASHBOARD \
  --mount=type=secret,id=BUILD_STATUS_WEBHOOK \
  bash ./scripts/docker-build-step.sh

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

CMD ["dotenvx", "run", "--", "sh", "-c", "./scripts/prestart.sh & bun run start"]
