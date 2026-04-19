import { type Dispatch, type ReactNode, type SetStateAction, useCallback, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner, LocalLoader } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useRecentDownloads, useSavedDownloads } from '~/contexts/LocalStorage'
import type { ChartOptionsMap } from '../chart-datasets'
import { extractQueryConfig, generatePresetId, type QuerySavedConfig } from '../savedDownloads'
import { SavePresetDialog } from '../SavePresetDialog'
import { extractTableRefs, matchTableRef } from './completions'
import { Editor, type EditorHandle } from './Editor'
import type { ExampleQuery } from './examples'
import { ExamplesPanel } from './ExamplesPanel'
import { Keycap, StatusDot } from './primitives'
import { ResultsPanel } from './ResultsPanel'
import { SchemaDrawer } from './SchemaDrawer'
import { TableChipRail, type PendingTable } from './TableChipRail'
import { UpsellGate } from './UpsellGate'
import { useDuckDB } from './useDuckDB'
import { chartDatasets } from '../chart-datasets'
import { datasets } from '../datasets'
import {
	identifierize,
	prettyLabelForSource,
	tableNameFor,
	useTableRegistry,
	type RegisteredTable,
	type TableSource
} from './useTableRegistry'

const SQL_TABS = [
	{ id: 'editor', label: 'Editor' },
	{ id: 'saved', label: 'Saved' }
] as const
type SqlTab = (typeof SQL_TABS)[number]['id']

const TOTAL_SCHEMA_COUNT = datasets.length + chartDatasets.length

interface SqlWorkspaceProps {
	chartOptionsMap: ChartOptionsMap
	topRight?: ReactNode
}

export function SqlWorkspace({ chartOptionsMap, topRight }: SqlWorkspaceProps) {
	const { isAuthenticated, hasActiveSubscription, isTrial, loaders, authorizedFetch } = useAuthContext()
	const allowed = isAuthenticated && hasActiveSubscription && !isTrial

	if (loaders.userLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (!allowed) {
		return <UpsellGate isAuthenticated={isAuthenticated} isTrial={isTrial} topRight={topRight} />
	}

	return <SqlWorkspaceInner chartOptionsMap={chartOptionsMap} authorizedFetch={authorizedFetch} topRight={topRight} />
}

interface QueryResult {
	columns: Array<{ name: string; type: string }>
	rows: Record<string, unknown>[]
}

interface LastRunMeta {
	durationMs: number
	rows: number
	cols: number
	at: number
}

function SqlWorkspaceInner({
	chartOptionsMap,
	authorizedFetch,
	topRight
}: {
	chartOptionsMap: ChartOptionsMap
	authorizedFetch: ReturnType<typeof useAuthContext>['authorizedFetch']
	topRight?: ReactNode
}) {
	const duckdb = useDuckDB()
	const registry = useTableRegistry({ conn: duckdb.conn ?? null, authorizedFetch })
	const { savedDownloads, saveDownload, deleteDownload, renameDownload } = useSavedDownloads()
	const { recordRecent } = useRecentDownloads()

	const [tab, setTab] = useState<SqlTab>('editor')
	const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false)
	const [sql, setSql] = useState<string>(
		`-- Lending vs DEX fees — daily series with 30-day moving averages.
-- CTE + FULL OUTER JOIN stitches two time-series, then a named WINDOW
-- smooths each one. Hit ⌘/Ctrl+Enter — missing tables auto-load and
-- the Chart tab will render four lines.
WITH joined AS (
  SELECT COALESCE(l.date, d.date) AS date,
         COALESCE(l.value, 0)     AS lending,
         COALESCE(d.value, 0)     AS dexs
  FROM ts_category_fees_chart_lending l
  FULL OUTER JOIN ts_category_fees_chart_dexs d
    ON l.date = d.date
)
SELECT date,
       lending,
       dexs,
       AVG(lending) OVER w AS lending_30d_avg,
       AVG(dexs)    OVER w AS dexs_30d_avg,
       lending / NULLIF(lending + dexs, 0) AS lending_share
FROM joined
WINDOW w AS (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
QUALIFY ROW_NUMBER() OVER (ORDER BY date DESC) <= 365
ORDER BY date DESC
`
	)
	const [result, setResult] = useState<QueryResult | null>(null)
	const [running, setRunning] = useState(false)
	const [runError, setRunError] = useState<string | null>(null)
	const [lastRun, setLastRun] = useState<LastRunMeta | null>(null)
	const [savePresetOpen, setSavePresetOpen] = useState(false)
	// Stage text surfaced in the status strip + results panel while we prep a query
	// (e.g. "Loading fees…"). null once the query actually starts running — at that
	// point `running` drives the UI.
	const [loadingStage, setLoadingStage] = useState<string | null>(null)
	// Title of whichever playbook / saved-query entry is currently being applied,
	// so those lists can show a spinner on the clicked row.
	const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
	// Ghost chips rendered in the TableChipRail while tables resolve. Each entry
	// flips pending → loading → (removed on success | failed on error). Failed
	// chips linger briefly before being cleared so the red flash is readable.
	const [pendingTables, setPendingTables] = useState<PendingTable[]>([])
	const editorRef = useRef<EditorHandle | null>(null)

	const savedQueries = useMemo(
		() => savedDownloads.filter((d): d is QuerySavedConfig => d.kind === 'query'),
		[savedDownloads]
	)

	const runSql = useCallback(
		async (rawSql: string) => {
			if (!duckdb.conn) return
			const trimmed = rawSql.trim()
			if (!trimmed) return
			setRunning(true)
			setRunError(null)
			setPendingTables([])
			const started = performance.now()
			try {
				const referenced = extractTableRefs(trimmed)
				const loadedNames = new Set(registry.tables.map((t) => t.name))
				const missingRefs = referenced.filter((r) => !loadedNames.has(r))

				const plan = buildAutoLoadPlan(missingRefs, chartOptionsMap)
				if (plan.length > 0) {
					setPendingTables(plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' })))
				}

				for (const step of plan) {
					setPendingTables((prev) => prev.map((p) => (p.key === step.key ? { ...p, status: 'loading' } : p)))
					const loaded = await registry.load(step.source)
					if (!loaded) {
						setPendingTables((prev) => prev.map((p) => (p.key === step.key ? { ...p, status: 'failed' } : p)))
						throw new Error(`Could not auto-load table "${step.name}" (${step.label}).`)
					}
					setPendingTables((prev) => prev.filter((p) => p.key !== step.key))
				}

				const arrow = await duckdb.conn.query(trimmed)
				const columns = arrow.schema.fields.map((f) => ({ name: f.name, type: String(f.type) }))
				const rows = arrow.toArray().map((r: any) => {
					const obj: Record<string, unknown> = {}
					for (const col of columns) obj[col.name] = r[col.name]
					return obj
				})
				const durationMs = Math.round(performance.now() - started)
				setResult({ columns, rows })
				setLastRun({ durationMs, rows: rows.length, cols: columns.length, at: Date.now() })
				const preset: QuerySavedConfig = {
					id: generatePresetId(),
					name: firstNonEmptyLine(trimmed).slice(0, 80),
					createdAt: Date.now(),
					lastRunAt: Date.now(),
					...extractQueryConfig({
						sql: trimmed,
						tables: registry.tables.map((t) =>
							t.source.kind === 'dataset'
								? { kind: 'dataset', slug: t.source.slug }
								: { kind: 'chart', slug: t.source.slug, param: t.source.param, paramLabel: t.source.paramLabel }
						)
					})
				}
				recordRecent(preset)
			} catch (err) {
				setRunError(err instanceof Error ? err.message : String(err))
				setResult(null)
				schedulePendingClear(setPendingTables)
			} finally {
				setRunning(false)
			}
		},
		[duckdb.conn, registry, recordRecent, chartOptionsMap]
	)

	const runQuery = useCallback(() => runSql(sql), [runSql, sql])

	const prepareAndRun = useCallback(
		async ({ taskId, tables, sql: nextSql }: { taskId: string; tables: TableSource[]; sql: string }) => {
			setBusyTaskId(taskId)
			setRunError(null)
			setResult(null)
			setPendingTables([])
			setSql(nextSql)
			setTab('editor')
			try {
				const plan = tables
					.filter((t) => !registry.tables.some((r) => sameSource(r.source, t)))
					.map((t, index) => ({
						key: `apply-${taskId}-${index}`,
						source: t,
						name: tableNameFor(t),
						label: prettyLabelForSource(t)
					}))

				if (plan.length > 0) {
					setPendingTables(plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' })))
				}

				for (const [index, step] of plan.entries()) {
					setPendingTables((prev) => prev.map((p) => (p.key === step.key ? { ...p, status: 'loading' } : p)))
					const stagePrefix =
						plan.length > 1 ? `Loading ${step.label} · ${index + 1}/${plan.length}` : `Loading ${step.label}`
					setLoadingStage(`${stagePrefix}…`)
					const loaded = await registry.load(step.source)
					if (!loaded) {
						setPendingTables((prev) => prev.map((p) => (p.key === step.key ? { ...p, status: 'failed' } : p)))
						throw new Error(`Could not load ${step.label}.`)
					}
					setPendingTables((prev) => prev.filter((p) => p.key !== step.key))
				}
				setLoadingStage(null)
				await runSql(nextSql)
			} catch (err) {
				setRunError(err instanceof Error ? err.message : String(err))
				setResult(null)
				schedulePendingClear(setPendingTables)
			} finally {
				setLoadingStage(null)
				setBusyTaskId(null)
			}
		},
		[registry, runSql]
	)

	const onApplyExample = useCallback(
		(example: ExampleQuery) =>
			prepareAndRun({ taskId: `example:${example.title}`, tables: example.tables, sql: example.sql }),
		[prepareAndRun]
	)

	const onLoadSavedQuery = useCallback(
		(preset: QuerySavedConfig) =>
			prepareAndRun({ taskId: `saved:${preset.id}`, tables: preset.tables, sql: preset.sql }),
		[prepareAndRun]
	)

	const onReplaceSql = useCallback((snippet: string) => {
		setTab('editor')
		setSql(snippet)
	}, [])

	const onInsertAtCursor = useCallback((text: string) => {
		setTab('editor')
		setTimeout(() => editorRef.current?.insertSnippet(text), 0)
	}, [])

	const onSavePreset = useCallback(
		(name: string) => {
			const trimmed = sql.trim()
			if (!trimmed) return
			const preset: QuerySavedConfig = {
				id: generatePresetId(),
				name,
				createdAt: Date.now(),
				...extractQueryConfig({
					sql: trimmed,
					tables: registry.tables.map((t) =>
						t.source.kind === 'dataset'
							? { kind: 'dataset', slug: t.source.slug }
							: { kind: 'chart', slug: t.source.slug, param: t.source.param, paramLabel: t.source.paramLabel }
					)
				})
			}
			saveDownload(preset, { replaceByName: true })
			setSavePresetOpen(false)
		},
		[sql, registry.tables, saveDownload]
	)

	return (
		<div className="flex flex-col gap-3">
			<StatusStrip
				duckdbStatus={duckdb.status}
				tableCount={registry.tables.length}
				lastRun={lastRun}
				running={running}
				loadingStage={loadingStage}
				error={!!runError}
				topRight={topRight}
			/>

			<TabNav tab={tab} onChange={setTab} savedCount={savedQueries.length} />

			{tab === 'editor' ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
					<div className="flex min-w-0 flex-col gap-3">
						<TableChipRail
							tables={registry.tables}
							onBrowseSchema={() => setSchemaDrawerOpen(true)}
							onRemove={registry.remove}
							pending={pendingTables}
							totalSchemaCount={TOTAL_SCHEMA_COUNT}
						/>
						<Editor ref={editorRef} value={sql} onChange={setSql} onRun={runQuery} tables={registry.tables} />
						<EditorRunBar
							running={running || !!loadingStage}
							canRun={!!duckdb.conn && !!sql.trim()}
							onRun={runQuery}
							onSave={() => setSavePresetOpen(true)}
						/>
						{runError ? (
							<ErrorBanner error={runError} onJump={(line, col) => editorRef.current?.revealLine(line, col)} />
						) : null}
						<ResultsPanel result={result} running={running} busyLabel={loadingStage} />
					</div>
					<div className="lg:sticky lg:top-4 lg:self-start">
						<ExamplesPanel onApply={onApplyExample} busyTaskId={busyTaskId} />
					</div>
				</div>
			) : (
				<SavedQueriesTab
					savedQueries={savedQueries}
					onOpen={onLoadSavedQuery}
					onDelete={deleteDownload}
					onRename={renameDownload}
					busyTaskId={busyTaskId}
				/>
			)}

			{savePresetOpen ? (
				<SavePresetDialog
					suggestedName={firstNonEmptyLine(sql).slice(0, 60) || 'Untitled query'}
					existingNames={savedDownloads.map((d) => d.name)}
					title="Save SQL query"
					description="Saved queries appear in the saved tab and in the main Saved list."
					submitLabel="Save"
					placeholder="Query name"
					onSave={onSavePreset}
					onClose={() => setSavePresetOpen(false)}
				/>
			) : null}

			<SchemaDrawer
				open={schemaDrawerOpen}
				onClose={() => setSchemaDrawerOpen(false)}
				chartOptionsMap={chartOptionsMap}
				loadedTables={registry.tables}
				onLoad={registry.load}
				onReplaceSql={onReplaceSql}
				onInsertAtCursor={onInsertAtCursor}
				loading={registry.loading}
				totalDatasetCount={TOTAL_SCHEMA_COUNT}
			/>
		</div>
	)
}

function StatusStrip({
	duckdbStatus,
	tableCount,
	lastRun,
	running,
	loadingStage,
	error,
	topRight
}: {
	duckdbStatus: 'loading' | 'ready' | 'error'
	tableCount: number
	lastRun: LastRunMeta | null
	running: boolean
	loadingStage: string | null
	error: boolean
	topRight?: ReactNode
}) {
	const envTone = duckdbStatus === 'ready' ? 'ready' : duckdbStatus === 'error' ? 'error' : 'busy'
	const busy = running || !!loadingStage
	const runTone = error ? 'error' : busy ? 'busy' : lastRun ? 'ready' : 'muted'

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-secondary)">
			<span className="flex items-center gap-1.5">
				<StatusDot tone={envTone} blink={envTone === 'busy'} />
				<span className="text-(--text-tertiary)">DuckDB</span>
				<span
					className={
						duckdbStatus === 'ready'
							? 'text-(--text-primary)'
							: duckdbStatus === 'error'
								? 'text-red-500'
								: 'text-pro-gold-300'
					}
				>
					{duckdbStatus === 'ready' ? 'ready' : duckdbStatus === 'error' ? 'failed' : 'loading'}
				</span>
			</span>

			<Divider />

			<span>
				<span className="text-(--text-tertiary)">Tables</span>{' '}
				<span className="text-(--text-primary) tabular-nums">{tableCount}</span>
			</span>

			<Divider />

			<span className="flex items-center gap-1.5">
				<StatusDot tone={runTone} blink={busy} />
				<span className="text-(--text-tertiary)">Last run</span>
				{loadingStage ? (
					<span className="text-pro-gold-300">{loadingStage}</span>
				) : running ? (
					<span className="text-pro-gold-300">running…</span>
				) : error ? (
					<span className="text-red-500">error</span>
				) : lastRun ? (
					<span className="text-(--text-primary)">
						<span className="tabular-nums">{formatDuration(lastRun.durationMs)}</span>
						<span className="px-1 text-(--text-tertiary)">·</span>
						<span className="tabular-nums">{lastRun.rows.toLocaleString()}</span>
						<span className="text-(--text-tertiary)"> rows</span>
					</span>
				) : (
					<span className="text-(--text-tertiary)/80">idle</span>
				)}
			</span>

			{topRight ? <span className="ml-auto flex items-center gap-2">{topRight}</span> : null}
		</div>
	)
}

function Divider() {
	return <span aria-hidden className="h-3 w-px bg-(--divider)" />
}

function TabNav({ tab, onChange, savedCount }: { tab: SqlTab; onChange: (next: SqlTab) => void; savedCount: number }) {
	return (
		<nav
			role="tablist"
			aria-label="SQL workspace section"
			className="flex items-center gap-5 border-b border-(--divider) text-sm"
		>
			{SQL_TABS.map((t) => {
				const active = tab === t.id
				const showCount = t.id === 'saved' && savedCount > 0
				return (
					<button
						key={t.id}
						role="tab"
						type="button"
						aria-selected={active}
						onClick={() => onChange(t.id)}
						className={`group relative flex items-center gap-1.5 pb-2 font-medium transition-colors ${
							active ? 'text-(--primary)' : 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						{t.label}
						{showCount ? (
							<span className="rounded-sm bg-(--link-hover-bg) px-1.5 py-px text-[10px] font-semibold text-(--text-tertiary) tabular-nums">
								{savedCount}
							</span>
						) : null}
						{active ? (
							<span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-(--primary)" />
						) : null}
					</button>
				)
			})}
		</nav>
	)
}

function EditorRunBar({
	running,
	canRun,
	onRun,
	onSave
}: {
	running: boolean
	canRun: boolean
	onRun: () => void
	onSave: () => void
}) {
	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<button
				type="button"
				onClick={onSave}
				disabled={!canRun}
				className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="bookmark" className="h-3.5 w-3.5" />
				Save
			</button>
			<button
				type="button"
				onClick={onRun}
				disabled={!canRun || running}
				className="inline-flex items-center gap-2 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{running ? (
					<LoadingSpinner size={12} />
				) : (
					<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
						<path d="M8 5v14l11-7z" />
					</svg>
				)}
				Run query
				<span aria-hidden className="flex items-center gap-0.5">
					<Keycap muted>⌘</Keycap>
					<Keycap muted>↵</Keycap>
				</span>
			</button>
		</div>
	)
}

function ErrorBanner({ error, onJump }: { error: string; onJump: (line: number, col?: number) => void }) {
	const location = parseErrorLocation(error)
	return (
		<div className="flex flex-col gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-red-700 dark:text-red-300">
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className="inline-flex items-center gap-1.5 font-semibold">
					<Icon name="alert-triangle" className="h-3.5 w-3.5" />
					Query error
				</span>
				{location ? (
					<>
						<span className="text-red-500/50">·</span>
						<button
							type="button"
							onClick={() => onJump(location.line, location.column)}
							className="font-medium underline-offset-2 hover:underline"
						>
							Jump to line {location.line}
							{location.column != null ? `:${location.column}` : ''}
						</button>
					</>
				) : null}
			</div>
			<pre className="overflow-x-auto font-mono text-[11.5px] leading-snug whitespace-pre-wrap">{error}</pre>
		</div>
	)
}

function SavedQueriesTab({
	savedQueries,
	onOpen,
	onDelete,
	onRename,
	busyTaskId
}: {
	savedQueries: QuerySavedConfig[]
	onOpen: (q: QuerySavedConfig) => void
	onDelete: (id: string) => void
	onRename: (id: string, name: string) => void
	busyTaskId: string | null
}) {
	if (savedQueries.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-6 py-12 text-center">
				<Icon name="bookmark" className="h-6 w-6 text-(--text-tertiary)" />
				<p className="text-sm text-(--text-secondary)">No saved queries yet.</p>
				<p className="max-w-sm text-xs text-(--text-tertiary)">
					Click Save in the editor to bookmark a query — saved queries survive across sessions.
				</p>
			</div>
		)
	}
	const busy = !!busyTaskId
	return (
		<ul className="flex flex-col divide-y divide-(--divider) border-y border-(--divider)">
			{savedQueries.map((q) => {
				const isBusy = busyTaskId === `saved:${q.id}`
				const isDim = busy && !isBusy
				return (
					<li key={q.id} className={`group flex items-center justify-between gap-3 py-3 ${isDim ? 'opacity-40' : ''}`}>
						<button
							type="button"
							onClick={() => onOpen(q)}
							disabled={busy}
							className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
						>
							{isBusy ? (
								<LoadingSpinner size={12} />
							) : (
								<Icon
									name="arrow-right"
									className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary) transition-colors group-hover:text-(--primary)"
								/>
							)}
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate text-sm font-semibold text-(--text-primary) transition-colors group-hover:text-(--primary)">
									{q.name}
								</span>
								<span className="truncate font-mono text-xs text-(--text-tertiary)">{firstNonEmptyLine(q.sql)}</span>
							</span>
						</button>
						<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
							<button
								type="button"
								onClick={() => {
									const next = window.prompt('Rename query', q.name)
									if (next && next !== q.name) onRename(q.id, next)
								}}
								aria-label={`Rename ${q.name}`}
								disabled={busy}
								className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
							>
								<Icon name="pencil" className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => onDelete(q.id)}
								aria-label={`Delete ${q.name}`}
								disabled={busy}
								className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
							>
								<Icon name="trash-2" className="h-3.5 w-3.5" />
							</button>
						</div>
					</li>
				)
			})}
		</ul>
	)
}

function sameSource(
	a: RegisteredTable['source'],
	b: { kind: 'dataset'; slug: string } | { kind: 'chart'; slug: string; param: string; paramLabel?: string }
): boolean {
	if (a.kind !== b.kind) return false
	if (a.kind === 'dataset' && b.kind === 'dataset') return a.slug === b.slug
	if (a.kind === 'chart' && b.kind === 'chart') return a.slug === b.slug && a.param === b.param
	return false
}

interface AutoLoadStep {
	key: string
	name: string
	label: string
	source: TableSource
}

function buildAutoLoadPlan(missingRefs: string[], chartOptionsMap: ChartOptionsMap): AutoLoadStep[] {
	const steps: AutoLoadStep[] = []
	for (const ref of missingRefs) {
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

// Linger on failed chips so the red flash is readable, then clear the whole pending list.
// The authoritative error story is already in `ErrorBanner` — the chips are just an echo.
function schedulePendingClear(setPending: Dispatch<SetStateAction<PendingTable[]>>) {
	window.setTimeout(() => setPending([]), 1400)
}

function firstNonEmptyLine(text: string): string {
	return (
		text
			.split('\n')
			.find((l) => l.trim())
			?.trim() ?? ''
	)
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
	return `${Math.round(ms / 1000)}s`
}

function parseErrorLocation(error: string): { line: number; column?: number } | null {
	const match = error.match(/line\s+(\d+)(?:[^0-9]+(\d+))?/i)
	if (!match) return null
	const line = Number.parseInt(match[1]!, 10)
	const column = match[2] ? Number.parseInt(match[2], 10) : undefined
	if (!Number.isFinite(line) || line <= 0) return null
	return { line, column }
}
