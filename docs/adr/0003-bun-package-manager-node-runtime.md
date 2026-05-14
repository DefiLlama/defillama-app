# ADR 0003: Bun Package Manager And Node Runtime

## Status

Accepted

## Context

The app uses Bun for fast dependency installation and script launching, but Next.js builds and production runtime behavior are validated most directly on Node. Running Next.js through Bun's runtime has caused Turbopack external-module resolution failures in local development.

The deploy build also relies on TypeScript command Modules for metadata artifacts, dataset cache publication, artifact sync, notification, and post-start hooks. Those commands need stable TypeScript execution in local development, Docker build stages, and the standalone runtime hook.

## Decision

Use Bun as the package manager and script launcher. Use Node 24 as the runtime for Next.js development, production builds, production server execution, and command implementations.

Do not run Next.js with `bun --bun next`. Runtime policy tests own that forbidden invocation list so exceptions require an explicit code review change.

Package scripts use cross-platform Node launchers for prepared `next dev` and `next build` runs. The launcher sets `NODE_ENV`, runs the TypeScript preparation command through Node, then invokes the documented `next` package binary so contributors keep using `bun run dev`, `bun run build`, and `bun run analyze` without dispatching Next through Bun's runtime.

Keep `jiti` for command TypeScript execution for now. Node 24 has TypeScript stripping support, but `jiti` is stable today for this codebase's command needs, including `~/*` alias resolution and JSX-capable TypeScript loading near Next configuration and script imports.

Build log redaction is name-pattern based: values from secret-like env keys are redacted from command logs, but arbitrary secrets in env keys outside that policy still need to be named with secret-like keys.

## Consequences

Local contributors still use `bun run dev`, `bun run build:metadata`, and `bun run build`; those commands dispatch Next.js and command implementations through Node.

Docker continues to install dependencies with Bun in install/build stages and run the standalone Next.js server on Node 24 in the final stage.

The final Docker runtime includes the small command execution dependencies needed by the post-start hook rather than adopting `adapter-bun`.
