import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { trackUmamiEvent } from '~/utils/analytics/umami'
import type { ChartOptionsMap } from '../chart-datasets'
import { datasets } from '../datasets'
import { extractTableRefs, matchTableRef } from './completions'
import type { PendingTable } from './TableChipRail'
import type { QueryResult } from './useSqlTabs'
import {
	identifierize,
	prettyLabelForSource,
	tableNameFor,
	type RegisteredTable,
	type TableSource
} from './useTableRegistry'

export interface ExecutorCtx {
	conn: AsyncDuckDBConnection | null
	loadedTables: RegisteredTable[]
	loadSource: (source: TableSource, signal?: AbortSignal) => Promise<RegisteredTable | null>
	chartOptionsMap: ChartOptionsMap
}

export interface ExecutorCallbacks {
	onPendingChange?: (pending: PendingTable[]) => void
	onLoadingStage?: (stage: string | null) => void
}

export type ExecutorResult =
	| { ok: true; result: QueryResult; durationMs: number; justLoaded: boolean }
	| { ok: false; error: string; cancelled?: boolean }

interface AutoLoadStep {
	key: string
	name: string
	label: string
	source: TableSource
}

const KNOWN_DATASET_IDENTIFIERS = new Set(datasets.map((d) => identifierize(d.slug)))

function buildAutoLoadPlan(
	missingRefs: string[],
	chartOptionsMap: ChartOptionsMap,
	extraKnown: ReadonlySet<string>
): AutoLoadStep[] {
	const steps: AutoLoadStep[] = []
	for (const ref of missingRefs) {
		if (extraKnown.has(ref)) continue
		const match = matchTableRef(ref)
		if (!match) continue
		if (match.kind === 'dataset') {
			steps.push({
				key: `auto-${ref}`,
				name: ref,
				label: match.definition.name,
				source: { kind: 'dataset', slug: match.slug }
			})
			continue
		}
		const options = chartOptionsMap[match.definition.slug] ?? []
		const resolvedOption = options.find((opt) => identifierize(opt.value) === match.paramIdentifier)
		if (!resolvedOption) {
			throw new Error(
				`Table "${ref}" — couldn't resolve ${match.definition.paramLabel.toLowerCase()} "${match.paramIdentifier}" for ${match.definition.name}. Use "add" to browse valid options.`
			)
		}
		steps.push({
			key: `auto-${ref}`,
			name: ref,
			label: `${match.definition.name} · ${resolvedOption.label}`,
			source: {
				kind: 'chart',
				slug: match.definition.slug,
				param: resolvedOption.value,
				paramLabel: resolvedOption.label
			}
		})
	}
	return steps
}

async function runWithFreshLoadRetry(conn: AsyncDuckDBConnection, sql: string, justLoaded: boolean): Promise<any> {
	try {
		return await conn.query(sql)
	} catch (err) {
		if (!justLoaded) throw err
		const msg = err instanceof Error ? err.message : String(err)
		const transient = /function signature mismatch/i.test(msg)
		if (!transient) throw err
		await new Promise((resolve) => setTimeout(resolve, 60))
		return await conn.query(sql)
	}
}

function cancelled(error = 'Cancelled'): ExecutorResult {
	return { ok: false, error, cancelled: true }
}

function isAbortError(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError'
}

/**
 * Shared SQL execution path used by query tabs and notebook cells.
 * - Extracts table refs from SQL
 * - Auto-loads missing datasets (skipping any names in `skipAutoLoad`)
 * - Executes the query and returns rows/columns
 * - Respects `signal` for cancellation: best-effort conn.cancelSent() on abort,
 *   and the returned result carries `cancelled: true` so callers can skip error UI.
 */
export async function runSql(
	ctx: ExecutorCtx,
	sql: string,
	callbacks: ExecutorCallbacks = {},
	skipAutoLoad: ReadonlySet<string> = new Set(),
	signal?: AbortSignal
): Promise<ExecutorResult> {
	if (!ctx.conn) return { ok: false, error: 'LlamaSQL connection not ready.' }
	if (signal?.aborted) return cancelled()
	const trimmed = sql.trim()
	if (!trimmed) return { ok: false, error: 'Empty query.' }

	trackUmamiEvent('sql-studio-run-query')

	const started = performance.now()
	try {
		const referenced = extractTableRefs(trimmed)
		const loadedNames = new Set(ctx.loadedTables.map((t) => t.name))
		const missingRefs = referenced.filter((r) => !loadedNames.has(r) && !skipAutoLoad.has(r))

		const plan = buildAutoLoadPlan(missingRefs, ctx.chartOptionsMap, skipAutoLoad)
		if (plan.length > 0) {
			callbacks.onPendingChange?.(plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' })))
		}

		let pending: PendingTable[] = plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' }))

		for (const [index, step] of plan.entries()) {
			if (signal?.aborted) {
				callbacks.onLoadingStage?.(null)
				return cancelled()
			}
			pending = pending.map((p) => (p.key === step.key ? { ...p, status: 'loading' } : p))
			callbacks.onPendingChange?.(pending)
			const stagePrefix =
				plan.length > 1 ? `Loading ${step.label} · ${index + 1}/${plan.length}` : `Loading ${step.label}`
			callbacks.onLoadingStage?.(`${stagePrefix}…`)

			const loaded = await ctx.loadSource(step.source, signal)
			if (signal?.aborted) {
				callbacks.onLoadingStage?.(null)
				return cancelled()
			}
			if (!loaded) {
				pending = pending.map((p) => (p.key === step.key ? { ...p, status: 'failed' } : p))
				callbacks.onPendingChange?.(pending)
				callbacks.onLoadingStage?.(null)
				return { ok: false, error: `Could not auto-load table "${step.name}" (${step.label}).` }
			}
			pending = pending.filter((p) => p.key !== step.key)
			callbacks.onPendingChange?.(pending)
		}
		callbacks.onLoadingStage?.(null)

		const conn = ctx.conn
		const queryPromise = runWithFreshLoadRetry(conn, trimmed, plan.length > 0)
		const arrow = signal
			? await new Promise<any>((resolve, reject) => {
					const onAbort = () => {
						conn.cancelSent().catch(() => undefined)
						reject(new DOMException('Cancelled', 'AbortError'))
					}
					signal.addEventListener('abort', onAbort, { once: true })
					queryPromise.then(
						(value) => {
							signal.removeEventListener('abort', onAbort)
							resolve(value)
						},
						(err) => {
							signal.removeEventListener('abort', onAbort)
							reject(err)
						}
					)
					if (signal.aborted) onAbort()
				})
			: await queryPromise

		const columns = arrow.schema.fields.map((f: any) => ({ name: f.name, type: String(f.type) }))
		const rows = arrow.toArray().map((r: any) => {
			const obj: Record<string, unknown> = {}
			for (const col of columns) obj[col.name] = r[col.name]
			return obj
		})
		const durationMs = Math.round(performance.now() - started)
		return {
			ok: true,
			result: { columns, rows },
			durationMs,
			justLoaded: plan.length > 0
		}
	} catch (err) {
		callbacks.onLoadingStage?.(null)
		if (isAbortError(err) || signal?.aborted) return cancelled()
		return { ok: false, error: err instanceof Error ? err.message : String(err) }
	}
}

export { buildAutoLoadPlan, tableNameFor, prettyLabelForSource, KNOWN_DATASET_IDENTIFIERS }
