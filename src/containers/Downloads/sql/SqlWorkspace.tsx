import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner, LocalLoader } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useRecentDownloads, useSavedDownloads } from '~/contexts/LocalStorage'
import type { ChartOptionsMap } from '../chart-datasets'
import { chartDatasets } from '../chart-datasets'
import { datasets } from '../datasets'
import { extractQueryConfig, generatePresetId, type QuerySavedConfig, type QueryTableRef } from '../savedDownloads'
import { SavePresetDialog } from '../SavePresetDialog'
import { decodeDownloadConfig } from '../urlState'
import type { ChartConfig } from './chartConfig'
import { extractTableRefs, matchTableRef } from './completions'
import { Editor, type EditorHandle } from './Editor'
import type { ExampleQuery } from './examples'
import { ExamplesPanel } from './ExamplesPanel'
import { Keycap, StatusDot } from './primitives'
import { QueryTabBar } from './QueryTabBar'
import { ResultsPanel } from './ResultsPanel'
import { SchemaDrawer } from './SchemaDrawer'
import { ShareQueryButton } from './ShareQueryButton'
import { TableChipRail } from './TableChipRail'
import { UpsellGate } from './UpsellGate'
import { useDuckDB } from './useDuckDB'
import { useSqlTabs, type LastRunMeta, type QueryTab } from './useSqlTabs'
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

	const [sectionTab, setSectionTab] = useState<SqlTab>('editor')
	const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false)
	const [savePresetOpen, setSavePresetOpen] = useState(false)
	const [chartPreferredTab, setChartPreferredTab] = useState<string | null>(null)

	const {
		tabs,
		activeTab,
		activeTabId,
		openTab,
		closeTab,
		focusTab,
		focusByIndex,
		focusDelta,
		duplicateTab,
		closeOthers,
		closeToRight,
		renameTab,
		updateTab,
		updateActiveTab,
		setActiveSql,
		setActiveChartConfig
	} = useSqlTabs()

	const editorRef = useRef<EditorHandle | null>(null)

	const savedQueries = useMemo(
		() => savedDownloads.filter((d): d is QuerySavedConfig => d.kind === 'query'),
		[savedDownloads]
	)

	const tableRefs = useMemo(
		() =>
			registry.tables.map((t) =>
				t.source.kind === 'dataset'
					? { kind: 'dataset' as const, slug: t.source.slug }
					: { kind: 'chart' as const, slug: t.source.slug, param: t.source.param, paramLabel: t.source.paramLabel }
			),
		[registry.tables]
	)

	const runSqlForTab = useCallback(
		async (tabId: string, rawSql: string) => {
			if (!duckdb.conn) return
			const trimmed = rawSql.trim()
			if (!trimmed) return
			updateTab(tabId, { running: true, runError: null, pendingTables: [] })
			const started = performance.now()
			try {
				const referenced = extractTableRefs(trimmed)
				const loadedNames = new Set(registry.tables.map((t) => t.name))
				const missingRefs = referenced.filter((r) => !loadedNames.has(r))

				const plan = buildAutoLoadPlan(missingRefs, chartOptionsMap)
				if (plan.length > 0) {
					updateTab(tabId, {
						pendingTables: plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' }))
					})
				}

				for (const step of plan) {
					updateTab(tabId, (t) => ({
						pendingTables: t.pendingTables.map((p) => (p.key === step.key ? { ...p, status: 'loading' } : p))
					}))
					const loaded = await registry.load(step.source)
					if (!loaded) {
						updateTab(tabId, (t) => ({
							pendingTables: t.pendingTables.map((p) => (p.key === step.key ? { ...p, status: 'failed' } : p))
						}))
						throw new Error(`Could not auto-load table "${step.name}" (${step.label}).`)
					}
					updateTab(tabId, (t) => ({
						pendingTables: t.pendingTables.filter((p) => p.key !== step.key)
					}))
				}

				const arrow = await runWithFreshLoadRetry(duckdb.conn, trimmed, plan.length > 0)
				const columns = arrow.schema.fields.map((f) => ({ name: f.name, type: String(f.type) }))
				const rows = arrow.toArray().map((r: any) => {
					const obj: Record<string, unknown> = {}
					for (const col of columns) obj[col.name] = r[col.name]
					return obj
				})
				const durationMs = Math.round(performance.now() - started)
				updateTab(tabId, {
					result: { columns, rows },
					lastRun: { durationMs, rows: rows.length, cols: columns.length, at: Date.now() },
					dirty: false
				})
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
				updateTab(tabId, {
					runError: err instanceof Error ? err.message : String(err),
					result: null
				})
				scheduleTabPendingClear(updateTab, tabId)
			} finally {
				updateTab(tabId, { running: false })
			}
		},
		[duckdb.conn, registry, recordRecent, chartOptionsMap, updateTab]
	)

	const runQuery = useCallback(
		() => runSqlForTab(activeTabId, activeTab.sql),
		[runSqlForTab, activeTabId, activeTab.sql]
	)

	const prepareAndRun = useCallback(
		async ({
			tabId,
			taskId,
			tables: nextTables,
			sql: nextSql
		}: {
			tabId: string
			taskId: string
			tables: TableSource[]
			sql: string
		}) => {
			updateTab(tabId, {
				busyTaskId: taskId,
				runError: null,
				result: null,
				pendingTables: [],
				sql: nextSql,
				dirty: true
			})
			setSectionTab('editor')
			try {
				const plan = nextTables
					.filter((t) => !registry.tables.some((r) => sameSource(r.source, t)))
					.map((t, index) => ({
						key: `apply-${taskId}-${index}`,
						source: t,
						name: tableNameFor(t),
						label: prettyLabelForSource(t)
					}))

				if (plan.length > 0) {
					updateTab(tabId, {
						pendingTables: plan.map((p) => ({ key: p.key, name: p.name, label: p.label, status: 'pending' }))
					})
				}

				for (const [index, step] of plan.entries()) {
					updateTab(tabId, (t) => ({
						pendingTables: t.pendingTables.map((p) => (p.key === step.key ? { ...p, status: 'loading' } : p))
					}))
					const stagePrefix =
						plan.length > 1 ? `Loading ${step.label} · ${index + 1}/${plan.length}` : `Loading ${step.label}`
					updateTab(tabId, { loadingStage: `${stagePrefix}…` })
					const loaded = await registry.load(step.source)
					if (!loaded) {
						updateTab(tabId, (t) => ({
							pendingTables: t.pendingTables.map((p) => (p.key === step.key ? { ...p, status: 'failed' } : p))
						}))
						throw new Error(`Could not load ${step.label}.`)
					}
					updateTab(tabId, (t) => ({
						pendingTables: t.pendingTables.filter((p) => p.key !== step.key)
					}))
				}
				updateTab(tabId, { loadingStage: null })
				await runSqlForTab(tabId, nextSql)
			} catch (err) {
				updateTab(tabId, {
					runError: err instanceof Error ? err.message : String(err),
					result: null
				})
				scheduleTabPendingClear(updateTab, tabId)
			} finally {
				updateTab(tabId, { loadingStage: null, busyTaskId: null })
			}
		},
		[registry, runSqlForTab, updateTab]
	)

	const onApplyExample = useCallback(
		(example: ExampleQuery) => {
			const newId = openTab({ sql: example.sql, title: example.title, focus: true })
			return prepareAndRun({
				tabId: newId,
				taskId: `example:${example.title}`,
				tables: example.tables,
				sql: example.sql
			})
		},
		[openTab, prepareAndRun]
	)

	const onLoadSavedQuery = useCallback(
		(preset: QuerySavedConfig) => {
			const existing = tabs.find((t) => t.sql === preset.sql)
			if (existing) {
				focusTab(existing.id)
				setSectionTab('editor')
				return
			}
			const newId = openTab({ sql: preset.sql, title: preset.name, focus: true })
			return prepareAndRun({ tabId: newId, taskId: `saved:${preset.id}`, tables: preset.tables, sql: preset.sql })
		},
		[tabs, focusTab, openTab, prepareAndRun]
	)

	const onReplaceSql = useCallback(
		(snippet: string) => {
			openTab({ sql: snippet, focus: true })
			setSectionTab('editor')
		},
		[openTab]
	)

	const onCookbookApply = useCallback(
		(snippet: string) => {
			const newId = openTab({ sql: snippet, focus: true })
			setSectionTab('editor')
			runSqlForTab(newId, snippet)
		},
		[openTab, runSqlForTab]
	)

	const onInsertAtCursor = useCallback((text: string) => {
		setSectionTab('editor')
		setTimeout(() => editorRef.current?.insertSnippet(text), 0)
	}, [])

	const onSavePreset = useCallback(
		(name: string) => {
			const trimmed = activeTab.sql.trim()
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
		[activeTab.sql, registry.tables, saveDownload]
	)

	const onApplyFix = useCallback(
		(oldId: string, newId: string) => {
			updateActiveTab((t) => ({ sql: replaceIdentifier(t.sql, oldId, newId), dirty: true }))
		},
		[updateActiveTab]
	)

	const router = useRouter()
	const hydratedRef = useRef(false)
	const hydrationCtxRef = useRef({ tabs, openTab, focusTab, updateTab, prepareAndRun, router })
	hydrationCtxRef.current = { tabs, openTab, focusTab, updateTab, prepareAndRun, router }
	useEffect(() => {
		if (hydratedRef.current) return
		if (!router.isReady) return
		if (!duckdb.conn) return
		const decoded = decodeDownloadConfig(router.query as Record<string, string | string[] | undefined>)
		if (!decoded || decoded.kind !== 'query') {
			hydratedRef.current = true
			return
		}
		hydratedRef.current = true
		const ctx = hydrationCtxRef.current
		const existing = ctx.tabs.find((t) => t.sql === decoded.sql)
		const tabId = existing ? existing.id : ctx.openTab({ sql: decoded.sql, focus: true })
		if (existing) ctx.focusTab(existing.id)
		if (decoded.chartConfig) {
			ctx.updateTab(tabId, { chartConfig: decoded.chartConfig })
			setChartPreferredTab(tabId)
		}
		setSectionTab('editor')
		ctx.prepareAndRun({
			tabId,
			taskId: `share:${Date.now()}`,
			tables: decoded.tables,
			sql: decoded.sql
		})
		ctx.router.replace({ pathname: ctx.router.pathname, query: { mode: 'sql' } }, undefined, { shallow: true })
	}, [router.isReady, router.query, duckdb.conn])

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null
			const mod = e.metaKey || e.ctrlKey
			if (!mod) return
			if (e.key === 't' || e.key === 'T') {
				if (e.shiftKey) return
				e.preventDefault()
				openTab({ focus: true })
				setSectionTab('editor')
				return
			}
			if (e.key === 'w' || e.key === 'W') {
				if (tabs.length > 1) {
					e.preventDefault()
					closeTab(activeTabId)
				}
				return
			}
			if (e.shiftKey && (e.key === ']' || e.code === 'BracketRight')) {
				e.preventDefault()
				focusDelta(1)
				return
			}
			if (e.shiftKey && (e.key === '[' || e.code === 'BracketLeft')) {
				e.preventDefault()
				focusDelta(-1)
				return
			}
			if (/^[1-9]$/.test(e.key)) {
				const editable =
					target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
				if (editable) return
				e.preventDefault()
				focusByIndex(Number(e.key) - 1)
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [openTab, closeTab, focusDelta, focusByIndex, tabs.length, activeTabId])

	return (
		<div className="flex flex-col gap-3">
			<StatusStrip
				duckdbStatus={duckdb.status}
				tableCount={registry.tables.length}
				lastRun={activeTab.lastRun}
				running={activeTab.running}
				loadingStage={activeTab.loadingStage}
				error={!!activeTab.runError}
				topRight={topRight}
			/>

			<TabNav tab={sectionTab} onChange={setSectionTab} savedCount={savedQueries.length} />

			{sectionTab === 'editor' ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
					<div className="flex min-w-0 flex-col gap-3">
						<QueryTabBar
							tabs={tabs}
							activeTabId={activeTabId}
							onFocus={focusTab}
							onClose={closeTab}
							onNewTab={() => openTab({ focus: true })}
							onRename={renameTab}
							onDuplicate={duplicateTab}
							onCloseOthers={closeOthers}
							onCloseToRight={closeToRight}
						/>
						<TableChipRail
							tables={registry.tables}
							onBrowseSchema={() => setSchemaDrawerOpen(true)}
							onRemove={registry.remove}
							pending={activeTab.pendingTables}
							totalSchemaCount={TOTAL_SCHEMA_COUNT}
						/>
						<Editor
							key={activeTabId}
							ref={editorRef}
							value={activeTab.sql}
							onChange={setActiveSql}
							onRun={runQuery}
							tables={registry.tables}
						/>
						<EditorRunBar
							running={activeTab.running || !!activeTab.loadingStage}
							canRun={!!duckdb.conn && !!activeTab.sql.trim()}
							onRun={runQuery}
							onSave={() => setSavePresetOpen(true)}
							sql={activeTab.sql}
							tables={tableRefs}
							chartConfig={activeTab.chartConfig}
						/>
						{activeTab.runError ? (
							<ErrorBanner
								error={activeTab.runError}
								loadedTables={registry.tables}
								onJump={(line, col) => editorRef.current?.revealLine(line, col)}
								onApplyFix={onApplyFix}
							/>
						) : null}
						<ResultsPanel
							result={activeTab.result}
							running={activeTab.running}
							busyLabel={activeTab.loadingStage}
							chartConfig={activeTab.chartConfig}
							onChartConfigChange={setActiveChartConfig}
							preferredView={chartPreferredTab === activeTabId ? 'chart' : undefined}
							onConsumePreferredView={() => setChartPreferredTab(null)}
						/>
					</div>
					<div className="lg:sticky lg:top-4 lg:self-start">
						<ExamplesPanel onApply={onApplyExample} busyTaskId={activeTab.busyTaskId} />
					</div>
				</div>
			) : (
				<SavedQueriesTab
					savedQueries={savedQueries}
					onOpen={onLoadSavedQuery}
					onDelete={deleteDownload}
					onRename={renameDownload}
					busyTaskId={activeTab.busyTaskId}
				/>
			)}

			{savePresetOpen ? (
				<SavePresetDialog
					suggestedName={firstNonEmptyLine(activeTab.sql).slice(0, 60) || 'Untitled query'}
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
				onApplyAndRun={onCookbookApply}
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
	onSave,
	sql,
	tables,
	chartConfig
}: {
	running: boolean
	canRun: boolean
	onRun: () => void
	onSave: () => void
	sql: string
	tables: QueryTableRef[]
	chartConfig: ChartConfig | undefined
}) {
	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<ShareQueryButton sql={sql} tables={tables} chartConfig={chartConfig} disabled={!canRun} />
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

type ErrorFamily = 'table' | 'column' | 'group_by' | 'parse' | 'type' | 'load' | 'other'

const FAMILY_LABEL: Record<ErrorFamily, string> = {
	table: 'Table not found',
	column: 'Column not found',
	group_by: 'GROUP BY required',
	parse: 'Parse error',
	type: 'Type mismatch',
	load: 'Load failed',
	other: 'Query error'
}

const FAMILY_HINTS: Record<ErrorFamily, string[]> = {
	table: [
		'Identifiers must match a known dataset exactly — auto-load only kicks in for recognized slugs.',
		'Browse the Schema tab for the right name, or pick a time-series param there (ts_<slug>_<param>).'
	],
	column: [
		'Unquoted column names are case-insensitive. Wrap camelCase identifiers in double quotes: "totalRevenue24h".',
		'Hover a table name in the editor to see its exact column list.'
	],
	group_by: [
		'Non-aggregated columns must appear in GROUP BY — or wrap them with any_value() / arg_max().',
		'DuckDB also allows GROUP BY positions: GROUP BY 1, 2.'
	],
	parse: [
		'Check trailing commas, missing parentheses, and unterminated strings around the reported line.',
		'⌘/ toggles a line comment — bisecting the query helps isolate parse errors.'
	],
	type: [
		'CSV inference can land numeric-looking columns as VARCHAR. Use TRY_CAST(x AS DOUBLE) to coerce safely.',
		'Unix-epoch date columns (raises, hacks) need to_timestamp(date) before date functions work.'
	],
	load: [
		'The CSV endpoint rejected the fetch. Confirm your subscription is active and retry.',
		'Check the network panel — a 401 means the session expired; a 5xx means retry after a moment.'
	],
	other: [
		'Scan the message below — DuckDB errors usually quote the offending identifier.',
		'For dialect specifics (QUALIFY, ASOF JOIN, PIVOT), the Shortcuts tab links the full reference.'
	]
}

interface ErrorAnalysis {
	family: ErrorFamily
	offendingIdentifier?: string
	suggestions: string[]
}

function ErrorBanner({
	error,
	loadedTables,
	onJump,
	onApplyFix
}: {
	error: string
	loadedTables: RegisteredTable[]
	onJump: (line: number, col?: number) => void
	onApplyFix: (oldIdentifier: string, newIdentifier: string) => void
}) {
	const location = parseErrorLocation(error)
	const [expanded, setExpanded] = useState(false)
	const analysis = useMemo(() => analyzeError(error, loadedTables), [error, loadedTables])
	const hints = FAMILY_HINTS[analysis.family]
	const familyLabel = FAMILY_LABEL[analysis.family]

	return (
		<div className="flex flex-col gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-red-700 dark:text-red-300">
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className="inline-flex items-center gap-1.5 font-semibold">
					<Icon name="alert-triangle" className="h-3.5 w-3.5" />
					{familyLabel}
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
				{analysis.offendingIdentifier ? (
					<>
						<span className="text-red-500/50">·</span>
						<code className="rounded-sm bg-red-500/10 px-1.5 py-px font-mono text-[11px] text-red-700 dark:text-red-300">
							{analysis.offendingIdentifier}
						</code>
					</>
				) : null}
			</div>

			{analysis.suggestions.length > 0 && analysis.offendingIdentifier ? (
				<div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
					<span className="text-red-600/90 dark:text-red-300/80">Did you mean</span>
					{analysis.suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onApplyFix(analysis.offendingIdentifier!, s)}
							className="inline-flex items-center gap-1 rounded-sm border border-red-500/30 bg-red-500/5 px-1.5 py-0.5 font-mono text-[11px] text-red-700 transition-colors hover:border-red-500/60 hover:bg-red-500/10 dark:text-red-200"
						>
							<Icon name="arrow-right" className="h-2.5 w-2.5" />
							{s}
						</button>
					))}
					<span className="text-red-600/70 dark:text-red-300/60">?</span>
				</div>
			) : null}

			<pre className="thin-scrollbar overflow-x-auto font-mono text-[11.5px] leading-snug whitespace-pre-wrap">
				{error}
			</pre>

			{hints.length > 0 ? (
				<div className="flex flex-col gap-1.5 border-t border-red-500/20 pt-2">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="inline-flex items-center gap-1.5 self-start text-[11px] font-medium text-red-700/80 transition-colors hover:text-red-700 dark:text-red-300/80 dark:hover:text-red-200"
					>
						<Icon
							name="chevron-right"
							className={`h-3 w-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
						/>
						Common causes
					</button>
					{expanded ? (
						<ul className="flex flex-col gap-1 pl-4 text-[11.5px] leading-relaxed text-red-700/90 dark:text-red-200/90">
							{hints.map((h, i) => (
								<li key={i} className="list-disc">
									{h}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	)
}

const KNOWN_DATASET_IDENTIFIERS = datasets.map((d) => identifierize(d.slug))

function analyzeError(error: string, loadedTables: RegisteredTable[]): ErrorAnalysis {
	if (/^Could not auto-load table|^Could not load /i.test(error)) {
		return { family: 'load', suggestions: [] }
	}

	const tableMatch =
		error.match(/(?:Catalog Error|Binder Error)[^\n]*?(?:Table with name|Referenced table)\s+"?([A-Za-z_][\w]*)"?/i) ??
		error.match(/Table with name\s+"?([A-Za-z_][\w]*)"?\s+does not exist/i) ??
		error.match(/Table\s+"([A-Za-z_][\w]*)"\s+does not exist/i)
	if (tableMatch) {
		const offending = tableMatch[1]!
		const pool = [...loadedTables.map((t) => t.name), ...KNOWN_DATASET_IDENTIFIERS]
		const unique = [...new Set(pool)]
		const suggestions = matchSorter(unique, offending)
			.filter((s) => s.toLowerCase() !== offending.toLowerCase())
			.slice(0, 3)
		return { family: 'table', offendingIdentifier: offending, suggestions }
	}

	const columnMatch =
		error.match(/Referenced column\s+"?([A-Za-z_][\w]*)"?\s+not found/i) ??
		error.match(/column\s+"?([A-Za-z_][\w]*)"?\s+not found/i)
	if (columnMatch) {
		const offending = columnMatch[1]!
		const cols = [...new Set(loadedTables.flatMap((t) => t.columns.map((c) => c.name)))]
		const suggestions = matchSorter(cols, offending)
			.filter((s) => s.toLowerCase() !== offending.toLowerCase())
			.slice(0, 3)
		return { family: 'column', offendingIdentifier: offending, suggestions }
	}

	if (/must appear in the GROUP BY/i.test(error)) {
		return { family: 'group_by', suggestions: [] }
	}

	if (/Parser Error/i.test(error)) {
		return { family: 'parse', suggestions: [] }
	}

	if (/Conversion Error|Invalid Input Error|Could not convert/i.test(error)) {
		return { family: 'type', suggestions: [] }
	}

	return { family: 'other', suggestions: [] }
}

function replaceIdentifier(sql: string, oldIdentifier: string, newIdentifier: string): string {
	const escaped = oldIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return sql.replace(new RegExp(`\\b${escaped}\\b`, 'g'), newIdentifier)
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

function scheduleTabPendingClear(
	updateTab: (id: string, patch: Partial<QueryTab> | ((t: QueryTab) => Partial<QueryTab>)) => void,
	tabId: string
) {
	window.setTimeout(() => updateTab(tabId, { pendingTables: [] }), 1400)
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

async function runWithFreshLoadRetry(
	conn: NonNullable<ReturnType<typeof useDuckDB>['conn']>,
	sql: string,
	justLoaded: boolean
): Promise<any> {
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

function parseErrorLocation(error: string): { line: number; column?: number } | null {
	const match = error.match(/line\s+(\d+)(?:[^0-9]+(\d+))?/i)
	if (!match) return null
	const line = Number.parseInt(match[1]!, 10)
	const column = match[2] ? Number.parseInt(match[2], 10) : undefined
	if (!Number.isFinite(line) || line <= 0) return null
	return { line, column }
}
