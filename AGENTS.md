# Agent Commands and Conventions

This file defines the commands and working conventions that all AI agents must follow in this repository.

## Package Manager

- Use `bun` for all package management and project commands.
- Do not use `npm`, `npx`, `yarn`, or `pnpm`, except for the single `npx tsc` exception listed below.

## Approved Commands

- Format code with `bun run format`
- Run lint checks with `bun run lint`
- Run TypeScript checks with `bun run ts`

## Forbidden Commands

- Do not run `bun run build` or any other build command. Builds are expected to fail because of API rate limits.
- Do not use `npx tsc`, `npx eslint`, or any other `npx` command unless it matches the exception below.
- Do not use `npm run lint`, `npm run typecheck`, or any other `npm` command.

Exception:

- `npx tsc -p tsconfig.strict.json --skipLibCheck` is allowed for strict type checking during migration, since there is no equivalent `bun` command for that project-specific config.

## Required Verification

After completing any task, run these commands in order:

1. `bun run format`
2. `bun run lint`
3. `bun run ts`

Do not run `bun run build` as part of verification.

## Code Migration Rules

When moving or renaming types or functions across files:

1. Never re-export from the new location for backwards compatibility.
2. Always update imports in every file that uses the moved item.
3. Point imports directly to the new file, for example `from './api.types'` instead of `from './queries'`.
4. This keeps dependency chains clear and helps avoid circular dependencies.

## Next.js Requirement

Before starting any Next.js work, read the relevant documentation in `node_modules/next/dist/docs/`.

Treat those local docs as the source of truth.
