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
- Treat chart and dashboard SSE payloads as untrusted JSON at the boundary.
  Normalize them in `chartPayloads.ts`, then keep render components on domain
  types.
- Keep prompt mode wiring on `AgenticAnswerMode`. `quick` is the default;
  `fact_checked` and `research` are sent to `/agentic` as `mode`.
- Keep `utils/chartAdapter.ts` as the public chart adapter facade. Put
  chart-family behavior in `utils/chartAdapters/*`.
- Keep persisted/shared/API DTO conversion in `messageMappers.ts`; render
  modules should receive domain `Message` data.
- Keep fact-check references on the message/render path:
  `fact_check_citations` -> `factCheckReferences` ->
  `processFactCheckCitations` -> `fact-check-pill` -> `CitationPill`.
- Keep prompt deep links confirmation-gated through `DeepLinkPromptModal`.
  Do not auto-submit `/ai/chat?prompt=...` on page load.
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
- `chartPayloads` runtime normalization and public `adaptChartData` behavior for
  chart changes.
- `fetchAgenticResponse` and `streamCallbacks` for fact-check mode request
  bodies, status events, citation events, and subscription gating.
- Markdown helper/renderer tests when fact-check citations or sanitize allowlists
  change.
- Integration link helpers for Telegram and Slack state transitions.
- Alert schedule and API helpers for alert modal changes.

Avoid building shared test harnesses until at least two tests need the same
setup. Keep small helpers local to the test file first.

## Verification

For source changes, follow the repo root instructions:

1. `bun run format`
2. `bun run lint`
3. `bun run typecheck`
4. `bun run test:typecheck`

For docs-only changes, focused inspection is usually enough unless code examples
or generated snippets are edited.

## Common Gotchas

- A stream that closes without `done` is a temporary connectivity failure unless
  the request was aborted.
- `[REPORT_START]` handling belongs in `utils/reportMarkers.ts`.
- Dashboard chart data shape belongs to the backend contract; client code should
  normalize it at the boundary, then render or fail visibly instead of silently
  dropping entries.
- `FACT_CHECKED_REQUIRES_SUBSCRIPTION` is fact-check-specific. Preserve the
  feature-specific limit modal copy instead of folding it into research limits.
- `fact-check-pill` must stay in the markdown sanitize allowlist, or verified
  citation markers disappear.
- `/ai/chat?prompt=...` must ask for confirmation before submitting the prompt.
- Shared-session fork paths should use branded `ShareToken` and `SessionId`
  helpers at the boundary.
- Integration polling should stop when the derived state is linked or idle and
  continue while a pending token is active.
- Alert schedules intentionally block local hours that map to blocked UTC hours.
- Project chat requests must include `projectId` when scoped to a project.
