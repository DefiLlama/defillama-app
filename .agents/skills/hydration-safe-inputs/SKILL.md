---
name: hydration-safe-inputs
description: Fix React hydration issues where user input typed before hydration gets wiped/cleared when React takes over. Use when (1) users report input fields clearing on page load, (2) working with SSR/SSG React apps (Next.js, Remix, Astro) that have controlled inputs, (3) auditing forms for hydration safety, or (4) building new forms in statically rendered React apps.
---

# Hydration-Safe Inputs

## The Problem

In SSR/SSG React apps, there's a window between when HTML renders and when React hydrates. If a user types into an input during this window, React's hydration will wipe their input because React initializes state to the default value (usually empty string).

```
Timeline:
1. HTML arrives → input rendered (empty)
2. User types "hello" → input shows "hello"  
3. React hydrates → useState("") runs → input wiped to ""
```

## The Fix

Initialize state by reading the DOM element's current value instead of a hardcoded default:

```tsx
function Input() {
  const [value, setValue] = useState(() => {
    if (typeof window !== "undefined") {
      const input = document.getElementById("my-input");
      if (input instanceof HTMLInputElement) {
        return input.value;
      }
    }
    return ""; // server fallback
  });

  return (
    <input
      id="my-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

## Key Requirements

1. **Element needs an `id`** - The initializer must find the element
2. **Use lazy initializer** - `useState(() => ...)` not `useState(...)`
3. **Guard for SSR** - Check `typeof window !== "undefined"`
4. **Type check the element** - Use `instanceof HTMLInputElement` (or `HTMLTextAreaElement`, `HTMLSelectElement`)

## Patterns by Input Type

### Text Input
```tsx
const [value, setValue] = useState(() => {
  if (typeof window !== "undefined") {
    const el = document.getElementById("my-input");
    if (el instanceof HTMLInputElement) return el.value;
  }
  return "";
});
```

### Checkbox
```tsx
const [checked, setChecked] = useState(() => {
  if (typeof window !== "undefined") {
    const el = document.getElementById("my-checkbox");
    if (el instanceof HTMLInputElement) return el.checked;
  }
  return false;
});
```

### Select
```tsx
const [value, setValue] = useState(() => {
  if (typeof window !== "undefined") {
    const el = document.getElementById("my-select");
    if (el instanceof HTMLSelectElement) return el.value;
  }
  return "default";
});
```

### Textarea
```tsx
const [value, setValue] = useState(() => {
  if (typeof window !== "undefined") {
    const el = document.getElementById("my-textarea");
    if (el instanceof HTMLTextAreaElement) return el.value;
  }
  return "";
});
```

## Identifying Vulnerable Components

Search for these patterns that indicate potential hydration wipe issues:

1. **Controlled inputs with hardcoded initial state:**
   ```tsx
   // VULNERABLE
   const [value, setValue] = useState("");
   return <input value={value} onChange={...} />;
   ```

2. **Form components in SSR/SSG pages** - Any `"use client"` component with controlled inputs in Next.js App Router, or any component in `pages/` directory

3. **Components without hydration-safe initialization** - Missing the `typeof window` guard pattern

## Refactoring Checklist

When fixing an existing component:

1. Add unique `id` to the input element
2. Replace `useState(defaultValue)` with `useState(() => { ... })`
3. Add window check and DOM query in initializer
4. Add appropriate `instanceof` type guard
5. Keep original default as SSR fallback

## Custom Hook (Optional)

For apps with many inputs, extract to a reusable hook:

```tsx
function useHydrationSafeValue<T>(
  id: string,
  defaultValue: T,
  extract: (el: Element) => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const el = document.getElementById(id);
      if (el) return extract(el);
    }
    return defaultValue;
  });
  return [value, setValue];
}

// Usage:
const [value, setValue] = useHydrationSafeValue(
  "my-input",
  "",
  (el) => (el as HTMLInputElement).value
);
```

## Testing

To verify the fix works:

1. Add artificial hydration delay (slow network or blocking script)
2. Type into the input before hydration completes
3. Confirm input value persists after hydration

Example delay script for testing:
```tsx
// Add to layout to simulate slow hydration
<script src="/api/slow-script" /> // endpoint that delays 2-3 seconds
```
