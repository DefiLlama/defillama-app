# Code Quality & Type Safety Guidelines

Rules for AI agents working on the DefiLlama codebase. These are derived from real mistakes found during migration — follow them strictly.

## Banned Patterns

### Never use `as` type assertions

The only allowed uses of `as` are:
- `as const` for literal types
- `as HTMLInputElement` (or similar) for DOM element access via `namedItem()`
- `as Record<string, unknown>` after a runtime `typeof x === 'object'` check (TypeScript limitation)
- `as [string, string]` for tuple literals like `['50%', '70%']`

Everything else must be replaced:

```typescript
// BANNED - casting to silence type errors
data as IMyType
getValue() as string
colors as Record<string, string>
{} as Record<string, number>
.filter(Boolean) as MyType[]

// CORRECT alternatives
// 1. Type the variable at declaration
const data: IMyType = fetchData()

// 2. Use getValue<T>() generic
const value = getValue<string>()

// 3. Type the source, not the usage
const colors: Record<string, string> = { ... }

// 4. Use a type predicate for .filter()
.filter((item): item is MyType => item != null)

// 5. For empty arrays, type the variable or use a typed constant
const items: MyType[] = []
// or
function emptyList(): MyType[] { return [] }
```

### Never use `any`

```typescript
// BANNED
function process(data: any) { ... }
const chart: any[] = []
(param as any)

// CORRECT
function process(data: unknown) { ... }   // then narrow with type guards
const chart: ChartRow[] = []
// fix the actual type mismatch instead of casting
```

### Never use `&&` for JSX conditional rendering

The `&&` operator can render `0`, `""`, or `NaN` to the DOM.

```tsx
// BANNED
{count && <Badge>{count}</Badge>}
{value && <Display value={value} />}

// CORRECT
{count ? <Badge>{count}</Badge> : null}
{value != null ? <Display value={value} /> : null}
```

### Never use `|| null` or `|| 0` with numeric values

The `||` operator treats `0` as falsy, which is almost always a bug with numbers.

```typescript
// BANNED - 0 is a valid value that gets swallowed
const total = baseValue || 0
const result = extra || null

// CORRECT
const total = baseValue ?? 0
const result = extra !== 0 ? extra : null
// or if you want null-only fallback:
const result = extra ?? null  // but this passes 0 through
```

### Never use `for...in` on arrays

`for...in` iterates over string keys and includes prototype properties.

```typescript
// BANNED
for (const idx in myArray) {
  doSomething(myArray[idx])
}

// CORRECT
for (const item of myArray) {
  doSomething(item)
}
```

### Never use `let` when `const` suffices

If a variable is assigned once and never reassigned, use `const`.

### Never duplicate code across files

Common patterns to extract:
- Helper functions used in 2+ files -> shared module
- Type definitions duplicated across files -> single source of truth
- React components duplicated across files -> shared component file
- JSON imports with type casts -> single re-export module (see definitions pattern below)

## Required Patterns

### Type JSON imports via a re-export module

When a JSON file is imported across multiple files and needs type widening:

```typescript
// definitions.ts - single source of truth
import dataJson from '~/public/data.json'

// Widen specific fields for dynamic key access
type WithLookupValues<T> = {
  [K in keyof T]: T[K] extends { values: Record<string, string> }
    ? Omit<T[K], 'values'> & { values: Record<string, string> }
    : T[K]
}

export const definitions: WithLookupValues<typeof dataJson> = dataJson
```

Then import from the module, never from the JSON directly:

```typescript
// CORRECT
import { definitions } from './definitions'

// BANNED
import definitions from '~/public/data.json'
```

### Use `?? 0` instead of `|| 0` for numeric fallbacks

```typescript
const total = value ?? 0        // only replaces null/undefined
const total = value || 0        // WRONG: also replaces 0, NaN, ""
```

### Use `!= null` instead of truthy checks for values that can be 0

```typescript
// BANNED - hides $0.00 values
if (value) { show(value) }

// CORRECT - only excludes null/undefined
if (value != null) { show(value) }
```

### Unexport internal-only items

If a function, type, or constant is only used within its own file, do not export it.

```typescript
// BANNED - only used in this file
export const INTERNAL_CONSTANT = 'foo'
export type InternalHelper = { ... }

// CORRECT
const INTERNAL_CONSTANT = 'foo'
type InternalHelper = { ... }
```

### Use type predicates for `.filter()` narrowing

```typescript
// BANNED
items.filter(Boolean) as NonNullable<T>[]

// CORRECT
items.filter((item): item is NonNullable<T> => item != null)
```

### Import from source, never re-export

```typescript
// BANNED - re-exporting from queries.tsx
export type { IRWAAssetData }  // when it's defined in api.types.ts

// CORRECT - import directly from source
import type { IRWAAssetData } from './api.types'
```

### Merge duplicate imports from the same module

```typescript
// BANNED
import { foo } from './utils'
import { bar } from './utils'

// CORRECT
import { foo, bar } from './utils'
```

## API Layer Conventions

### API fetch functions go in `api.ts`

All direct `fetch`/`fetchJson` calls must live in `api.ts`. Business logic in `queries.ts` imports from `api.ts`.

### URL constants stay private to `api.ts`

Do not export API URL constants. The `api.ts` file owns the URLs internally.

### Use `fetchJson<T>()` with generics

```typescript
export async function fetchData(): Promise<MyType[]> {
  return fetchJson<MyType[]>(`${SERVER_URL}/endpoint`)
}
```

### No module-level promise caching

```typescript
// BANNED
let promise: Promise<Data> | null = null
export function getData() {
  if (!promise) promise = fetch(...)
  return promise
}

// CORRECT - let the caller handle caching (SWR, React Query, etc.)
export async function getData(): Promise<Data> {
  return fetchJson<Data>(url)
}
```

## Verification

Always run all of these before considering work complete:

```bash
bun run ts                    # TypeScript errors
bun run lint                  # Linting errors

# Strict mode for specific folders:
npx tsc -p tsconfig.strict.json --skipLibCheck 2>&1 | grep "containers/FolderName"
```

Never run `bun run build` — it will fail due to API rate limits.
