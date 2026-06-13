# ADR 0003: Bun Package Manager And Current Runtime Launchers

## Status

Accepted

## Context

The app uses Bun for fast dependency installation and script launching. The checked-in Next.js dev/build/server launchers are currently validated on Node 24.

Running Next.js through Bun's runtime has previously caused Turbopack external-module resolution failures in local development. That is an implementation constraint of the current launcher setup, not a permanent product decision that prevents a future Bun runtime migration.

The deploy build also relies on TypeScript command Modules for metadata artifacts, dataset cache publication, artifact sync, notification, and post-start hooks. Those commands need stable TypeScript execution in local development, Docker build stages, and the standalone runtime hook.

## Decision

Use Bun as the package manager and script launcher. The current scripts use Node 24 for Next.js development, production builds, production server execution, and command implementations because that is the validated path today.

Do not run Next.js with `bun --bun next` in the current setup. Runtime policy tests own that forbidden invocation list so switching the launcher requires an explicit code review change.

Package scripts use cross-platform Node launchers for prepared `next dev` and `next build` runs. The launcher sets `NODE_ENV`, runs the TypeScript preparation command through Node, then invokes the documented `next` package binary so contributors keep using `bun run dev`, `bun run build`, and `bun run analyze` without dispatching Next through Bun's runtime.

Keep `jiti` for command TypeScript execution for now. Node 24 has TypeScript stripping support, but `jiti` is stable today for this codebase's command needs, including `~/*` alias resolution and JSX-capable TypeScript loading near Next configuration and script imports.

Keep application code portable unless it explicitly depends on a Next.js or Node API. A future switch to Bun runtime should update the launchers, Docker runtime, and policy tests; it should not require reshaping container/domain code.

Build log redaction is name-pattern based: values from secret-like env keys are redacted from command logs, but arbitrary secrets in env keys outside that policy still need to be named with secret-like keys.

## Consequences

Local contributors still use `bun run dev`, `bun run build:metadata`, and `bun run build`; those commands dispatch Next.js and command implementations through Node in the current setup.

Docker continues to install dependencies with Bun in install/build stages and run the standalone Next.js server on Node 24 in the final stage.

The final Docker runtime includes the small command execution dependencies needed by the post-start hook. Adopting `adapter-bun` or another Bun runtime path is a future launcher/runtime migration, not a contradiction of this ADR.
