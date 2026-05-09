# Agent Commands and Conventions

This file defines the commands and working conventions that all AI agents must follow in this repository.

## Package Manager

- Use `bun` for all package management and project commands.
- Use `bunx` instead of `npx` when you need to run a package binary.
- Do not use `npm`, `npx`, `yarn`, or `pnpm`

## Approved Commands

- Format code with `bun run format`
- Run tests with `bun run test`
- Run lint checks with `bun run lint`
- Run TypeScript checks with `bun run ts`

## Forbidden Commands

- Do not run `bun run build` or any other build command. Builds are expected to fail because of API rate limits.
- Do not use `bun test`. Use `bun run test` so tests run through the repo's Vitest script.
- Do not use `npx tsc`, `npx eslint`, or any other `npx` command. Use `bunx` instead when you need to run a package binary.
- Do not use `npm run lint`, `npm run typecheck`, or any other `npm` command.

## Required Verification

After completing a task that changes source code, tests, scripts, type declarations, or project/tooling configuration, run these commands in order:

1. `bun run format`
2. `bun run lint`
3. `bun run ts`
4. `bun run test:types`

`bun run format` must finish before the other checks because it writes files. After formatting completes, `bun run lint`, `bun run ts`, and `bun run test:types` may be run in parallel.

Do not run the full verification sequence for tasks that only inspect, explain, review, branch, commit, or run explicitly requested commands without making code changes.
Do not run the full verification sequence for documentation-only or instruction-only edits unless the user explicitly asks.
If the user asks to run specific commands, run only those commands unless code changes are needed to complete the request.

Do not run `bun run build` as part of verification.

## Next.js Requirement

Before starting any Next.js work, read the relevant documentation in `node_modules/next/dist/docs/`.

Treat those local docs as the source of truth.

## Local User Instructions

If `.codex/local-instructions.md` exists, read and follow it before making code changes. It contains local user preferences and skill routing, and is intentionally gitignored.
