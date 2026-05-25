# Maintaining LlamaAI

Read this before making non-trivial changes under `src/containers/LlamaAI`.
For the system map, see `ARCHITECTURE.md`.

## Editing Rules

- Route prompt, edit, resume, and replay work through `runAgenticRequest`.
- Do not call `fetchAgenticResponse` or `resumeAgenticStream` directly from new
  UI paths unless the request is still wrapped by the runner lifecycle.
- Add new SSE events in `fetchAgenticResponse.ts` and consume them through
  `streamCallbacks.ts` so stale request guards stay centralized.
- Keep `StreamAccumulator` as the commit source for assistant messages. Reducer
  state is the live UI snapshot.
- Treat chart and dashboard SSE payloads as typed backend contracts after parse;
  do not add row/config filtering in render code.
- Keep `utils/chartAdapter.ts` as the public chart adapter facade. Put
  chart-family behavior in `utils/chartAdapters/*`.
- Keep persisted/shared/API DTO conversion in `messageMappers.ts`; render
  modules should receive domain `Message` data.
- Reuse `llamaAIRequest` for authenticated JSON endpoints unless a stream or
  special response contract requires a dedicated transport.
- Keep project cache keys in `projects/queryKeys.ts` and update both global and
  project session caches when moving or replacing sessions.

## Test Defaults

Use fast stable-seam tests before broad component tests:

- `fetchAgenticResponse` for vertical `/agentic` request and SSE behavior.
- `runAgenticRequest` for lifecycle, error taxonomy, detach, and cleanup.
- `streamCallbacks` for stale-event guards and committed message behavior.
- `messageMappers` and `renderModel` for restored/shared/stream message
  rendering contracts.
- `chartPayloads` pass-through and public `adaptChartData` behavior for chart
  changes.
- Integration link helpers for Telegram and Slack state transitions.
- Alert schedule and API helpers for alert modal changes.

Avoid building shared test harnesses until at least two tests need the same
setup. Keep small helpers local to the test file first.

## Verification

For source changes, follow the repo root instructions:

1. `bun run format`
2. `bun run lint`
3. `bun run ts`
4. `bun run test:types`

For docs-only changes, focused inspection is usually enough unless code examples
or generated snippets are edited.

## Common Gotchas

- A stream that closes without `done` is a temporary connectivity failure unless
  the request was aborted.
- `[REPORT_START]` handling belongs in `utils/reportMarkers.ts`.
- Dashboard chart data shape belongs to the backend contract; client code should
  render or fail visibly instead of silently dropping entries.
- Shared-session fork paths should use branded `ShareToken` and `SessionId`
  helpers at the boundary.
- Integration polling should stop when the derived state is linked or idle and
  continue while a pending token is active.
- Alert schedules intentionally block local hours that map to blocked UTC hours.
- Project chat requests must include `projectId` when scoped to a project.
