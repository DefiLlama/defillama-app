# Agent Commands and Conventions

This document defines the commands and conventions that all AI agents (opencode) must follow when working on this project.

## Package Manager

- Use `pnpm` as the package manager. **NEVER** use npm, npx, yarn, or bun.

## Allowed Commands

- Linting: `pnpm run lint`
- TypeScript checking: `pnpm run ts`
- Formatting: `pnpm run format`

## Forbidden Commands

- **NEVER** run `pnpm run build` or any build commands. The build **WILL fail** due to API rate limits.
- **NEVER** use `npx tsc`, `npx eslint`, or any npx commands. Use `pnpm run` equivalents instead.
- **NEVER** run `npm run lint`, `npm run typecheck`, or any npm commands.

**Exception:** `npx tsc -p tsconfig.strict.json --skipLibCheck` is allowed for strict type checking during migration (no pnpm equivalent for project-specific configs).

## Verification Requirements

When completing any task, you MUST run the following commands to verify code correctness:

1. `pnpm run lint` - to check for linting errors
2. `pnpm run ts` - to check for TypeScript errors

Do NOT run `pnpm run build` as it will fail due to rate limits.

## Code Migration Rules

When moving or renaming types/functions across files:

1. **NEVER re-export** from the new location to maintain backwards compatibility
2. **ALWAYS update imports** in all files that use the moved type/function
3. Update imports to point directly to the new location (e.g., `from './api.types'` instead of `from './queries'`)
4. This ensures clear dependency chains and avoids circular dependencies

## Additional Guidelines

- Follow `.agents/CODING_STANDARDS.md` for code quality, type safety, React patterns, and API conventions.
- If any rule conflicts, `AGENTS.md` takes precedence.
