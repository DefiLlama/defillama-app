# AI Agent Type Safety Guidelines

This document contains rules and best practices for maintaining full type safety in the DefiLlama codebase. All AI agents must follow these guidelines.

## Core Principles

1. **Prefer inference over explicit types** when TypeScript can properly infer from context
2. **Add explicit types only when**:
   - Type inference fails or produces `any`
   - Types are too complex to read in hover tooltips
   - Function return types need to match a specific interface
   - Variable types are widened incorrectly (e.g., empty arrays)
3. **Never use `any`** - use `unknown` if type is truly unknown
4. **No re-exports** - always import from source

## Import/Export Rules

### ❌ NEVER Re-export
```typescript
// WRONG - api.ts
export { getAdapterChainMetrics } from './api'

// WRONG - queries.tsx
export { getAdapterChainMetrics } from './api'
```

### ✅ Always Import from Source
```typescript
// CORRECT - ChainsByCategory/queries.tsx
import { getAdapterChainMetrics } from '~/containers/DimensionAdapters/api'
```

## Type Inference vs Explicit Types

### ✅ When to Rely on Inference
```typescript
// ✅ TypeScript infers correctly from context
const childProtocols: IProtocol['childProtocols'] = p.childProtocols?.map((cp) => ({
  ...cp,
  pfOrPs: cp.mcap ? calculateRatio(cp.mcap, cp.total30d) : null
}))

// ✅ Generic functions infer types from parameters
function groupByParent<T extends { parentProtocol?: string }>(protocols: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  // ...
  return groups
}
```

### ✅ When to Add Explicit Types

#### 1. Complex Ternary Expressions
```typescript
// Without explicit type: inferred as (IProtocol | never)[]
const protocols =
  props.categories.length === 0
    ? props.protocols
    : selectedCategories.length === 0
      ? []  // TypeScript infers as any[] here!
      : props.protocols

// ✅ Add explicit type
const protocols: IProtocol[] =
  props.categories.length === 0
    ? props.protocols
    : selectedCategories.length === 0
      ? ([] as IProtocol[])
      : props.protocols
```

#### 2. Function Return Types
```typescript
// ✅ Add when returning interface-matching objects
const prepareCsv = (): { filename: string; rows: Array<Array<string | number | boolean>> } => {
  const visibleColumns = instance.getVisibleLeafColumns()
  // ...
  return { filename: `${type}-chains.csv`, rows }
}

// ✅ Add when function is passed as prop
const getProtocolsByCategory = (protocols: IProtocol[], categories: string[]): IProtocol[] => {
  const final: IProtocol[] = []
  // ...
  return final
}
```

#### 3. Variable Declarations with Empty Arrays
```typescript
// ❌ TypeScript infers as any[]
const final = []

// ✅ Explicit type annotation
const final: IProtocol[] = []
```

## Strict Null Checks

### ✅ Handle Nullable Properties
```typescript
// IProtocol chains can be null
interface IProtocol {
  chains: string[] | null
}

// ✅ Always check before accessing
{row.original.chains && (
  <Tooltip content={<ChainsComponent chains={row.original.chains} />}>
    {`${row.original.chains.length} chains`}
  </Tooltip>
)}
```

### ✅ Optional Chaining with Nullish Coalescing
```typescript
// ✅ Safe property access
total24h: (protocolData.total24h ?? 0) - (emissions?.emission24h ?? 0)
```

## Eliminating `any` Types

### Before/After Examples

#### Example 1: Function Parameters
```typescript
// ❌ Before
function findEmissions(protocolVersions: any[], emissionsData: any) {
  // ...
}

// ✅ After
type ProtocolVersion = {
  defillamaId: string
  parentProtocol?: string
  name: string
}

type EmissionsProtocol = {
  defillamaId: string
  name: string
  linked?: string[]
}

function findEmissions(
  protocolVersions: ProtocolVersion[],
  emissionsData: { protocols: EmissionsProtocol[] }
): EmissionsProtocol | undefined {
  // ...
}
```

#### Example 2: Generic Type Helpers
```typescript
// ❌ Before
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : any

// ✅ After  
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never
```

## Derived Types from API

### ✅ Use Pick/Omit from API Types
```typescript
type ApiProtocol = IAdapterChainMetrics['protocols'][0]

// ✅ Extract and make numeric fields nullable for UI
export type IProtocol = Pick<ApiProtocol, 'name' | 'slug' | 'logo' | 'chains'> & {
  category: ApiProtocol['category'] | null
  total24h: number | null
  total7d: number | null
  // ... other nullable fields
}
```

### ✅ Define Intermediate Types
```typescript
// ✅ For aggregated/computed data
type AggregatedProtocol = Omit<ApiProtocol, 'total24h' | 'total7d' | 'total30d' | 'total1y' | 'totalAllTime'> & {
  total24h: number
  total7d: number
  total30d: number
  total1y: number
  totalAllTime: number
}
```

## Type Aliases vs Interfaces

### ✅ Use `type` for:
- Mapped types (Pick, Omit, Record)
- Union types
- Complex transformations

```typescript
export type IProtocol = {
  [K in keyof Pick<ApiProtocol, ...>]: ApiProtocol[K] | null
} & {
  mcap: number | null
}
```

### ✅ Use `interface` for:
- Object shapes that will be implemented
- When you need declaration merging (rare)
- Public API definitions

```typescript
export interface IAdapterChainOverview extends IAdapterChainMetrics {
  totalDataChart: IAdapterChart
}
```

## Constants and Enums

### ✅ Enums (already strictly typed)
```typescript
export enum ADAPTER_TYPES {
  DEXS = 'dexs',
  FEES = 'fees',
  // ...
}

export type AdapterType = `${ADAPTER_TYPES}`
```

### ✅ Objects with `as const`
```typescript
export const ADAPTER_DATA_TYPE_KEYS = {
  'dailyFees': 'df',
  'dailyRevenue': 'dr',
  // ...
} as const

export type AdapterDataTypeKey = keyof typeof ADAPTER_DATA_TYPE_KEYS
```

## Verification Commands

Always run these to verify type safety:

```bash
# Check TypeScript errors
bun run ts

# Check linting
bun run lint

# Check strict mode (optional, for deep verification)
npx tsc -p tsconfig.strict.json --skipLibCheck
```

## Common Issues and Solutions

### Issue: "Parameter 'x' implicitly has an 'any' type"
**Solution**: Add explicit type annotation to the parameter or ensure the array being mapped has a proper type.

### Issue: "Type 'X' is not assignable to type 'Y'"
**Solution**: Check if types need to be made nullable or if the interface definition needs updating.

### Issue: Hover tooltip shows `any`
**Solution**: Add explicit type annotation to help the IDE and TypeScript.

### Issue: "Cannot find name 'X'"
**Solution**: Check if type is imported properly. Do not re-export; import from source.

## Migration to Strict Type Safety

We use `tsconfig.strict.json` for gradual migration to full strict mode.

### How It Works

1. **Base config** (`tsconfig.json`) - Relaxed settings for development
2. **Strict config** (`tsconfig.strict.json`) - Full strict mode, includes specific folders only
3. **Add folders** to `include` array as they become ready
4. **Goal** - Eventually all code passes strict checks

### Adding a Folder

1. **Update `tsconfig.strict.json`**:
   ```json
   "include": [
     "src/containers/DimensionAdapters/**/*.ts",
     "src/containers/NewFolder/**/*.ts"
   ]
   ```

2. **Run strict check**:
   ```bash
   npx tsc -p tsconfig.strict.json --skipLibCheck
   ```

3. **Fix errors** using the principles above

4. **Verify**:
   ```bash
   bun run ts
   bun run lint
   ```

### Strict Mode Requirements

All code in strict folders must follow these rules (in addition to guidelines above):

1. **No implicit `any`** - All parameters must have explicit types or proper inference context
2. **No explicit `any`** - Replace with proper types or `unknown`
3. **Strict null checks** - Handle nullable values with `?.` or `if (x)` checks
4. **No unused variables/parameters** - Remove or prefix with `_` if intentionally unused
5. **All code paths return** - Ensure functions always return a value
6. **Proper inference** - IDE tooltips must show actual types, never `any`

### Migration Checklist

- [ ] Run `npx tsc -p tsconfig.strict.json --skipLibCheck` - should show 0 errors
- [ ] No `any` types in the folder
- [ ] IDE hover shows proper types everywhere
- [ ] `bun run ts` passes
- [ ] `bun run lint` passes

## Summary Checklist

- [ ] No `any` types (except in type utilities with proper constraints)
- [ ] No re-exports of functions/types
- [ ] `as const` on object constants that need literal types
- [ ] Proper null checks for nullable properties
- [ ] Return types on functions that match interface contracts
- [ ] Explicit types on variables initialized with empty arrays
- [ ] All imports go directly to source files
