import { useRouter } from 'next/router'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner, LocalLoader } from '~/components/Loaders'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'
import { useRecentDownloads, useSavedDownloads } from '~/contexts/LocalStorage'
import { getStorageJSON, setStorageJSON } from '~/contexts/localStorageStore'
import type { ChartOptionsMap } from '../chart-datasets'
import { chartDatasets } from '../chart-datasets'
import { datasets } from '../datasets'
import { extractQueryConfig, generatePresetId, type QuerySavedConfig, type QueryTableRef } from '../savedDownloads'
import { SavePresetDialog } from '../SavePresetDialog'
import { decodeDownloadConfig, decodeNotebookShare } from '../urlState'
import type { ChartConfig } from './chartConfig'
import { Editor, type EditorHandle } from './Editor'
import { ErrorBanner, replaceIdentifier } from './ErrorBanner'
import type { ExampleQuery } from './examples'
import { ExamplesPanel } from './ExamplesPanel'
import { runSql } from './executor'
import { NotebookView } from './notebook/NotebookView'
import { Keycap, StatusDot } from './primitives'
import { QueryTabBar } from './QueryTabBar'
import { ResultsPanel } from './ResultsPanel'
import { SchemaDrawer } from './SchemaDrawer'
import { ShareQueryButton } from './ShareQueryButton'
import { TableChipRail } from './TableChipRail'
import { UpsellGate } from './UpsellGate'
import { useDuckDB } from './useDuckDB'
import { useSqlTabs, type LastRunMeta, type NotebookCell, type QueryTab } from './useSqlTabs'
import {
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
const PLAYBOOK_COLLAPSED_KEY = 'sql-studio:playbook-collapsed:v1'

interface SqlWorkspaceProps {
	chartOptionsMap: ChartOptionsMap
}

export function SqlWorkspace({ chartOptionsMap }: SqlWorkspaceProps) {
	const { isAuthenticated, isTrial, loaders, authorizedFetch, user } = useAuthContext()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const isApiPlan = subscription?.type === 'api' && subscription?.status === 'active'
	const isLlama = !!user?.flags?.is_llama
	const allowed = isAuthenticated && (isApiPlan || isLlama)

	if (loaders.userLoading || (isAuthenticated && isSubscriptionLoading && !isLlama)) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	if (!allowed) {
		return <UpsellGate isAuthenticated={isAuthenticated} isTrial={isTrial} />
	}

	return <SqlWorkspaceInner chartOptionsMap={chartOptionsMap} authorizedFetch={authorizedFetch} />
}

function SqlWorkspaceInner({
	chartOptionsMap,
	authorizedFetch
}: {
	chartOptionsMap: ChartOptionsMap
	authorizedFetch: ReturnType<typeof useAuthContext>['authorizedFetch']
}) {
	const duckdb = useDuckDB()
	const registry = useTableRegistry({ conn: duckdb.conn ?? null, authorizedFetch })
	const { savedDownloads, saveDownload, deleteDownload, renameDownload } = useSavedDownloads()
	const { recordRecent } = useRecentDownloads()

	const [sectionTab, setSectionTab] = useState<SqlTab>('editor')
	const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false)
	const [savePresetOpen, setSavePresetOpen] = useState(false)
	const [chartPreferredTab, setChartPreferredTab] = useState<string | null>(null)
	const [playbookCollapsed, setPlaybookCollapsed] = useState<boolean>(() =>
		getStorageJSON<boolean>(PLAYBOOK_COLLAPSED_KEY, false)
	)
	const togglePlaybook = useCallback(() => {
		setPlaybookCollapsed((prev) => {
			const next = !prev
			setStorageJSON(PLAYBOOK_COLLAPSED_KEY, next)
			return next
		})
	}, [])

	const {
		tabs,
		activeTab,
		activeTabId,
		openTab,
		openNotebookTab,
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
		setActiveChartConfig,
		convertTabToNotebook,
		updateCell,
		addCell,
		removeCell,
		reorderCells,
		focusCell,
		setCellsDirty
	} = useSqlTabs()

	const editorRef = useRef<EditorHandle | null>(null)
	const runControllersRef = useRef(new Map<string, AbortController>())

	const beginRun = useCallback((key: string): AbortController => {
		const existing = runControllersRef.current.get(key)
		if (existing) existing.abort()
		const controller = new AbortController()
		runControllersRef.current.set(key, controller)
		return controller
	}, [])

	const endRun = useCallback((key: string, controller: AbortController) => {
		if (runControllersRef.current.get(key) === controller) runControllersRef.current.delete(key)
	}, [])

	const cancelRun = useCallback((key: string) => {
		const controller = runControllersRef.current.get(key)
		if (controller) controller.abort()
	}, [])

	useEffect(() => {
		const map = runControllersRef.current
		return () => {
			map.forEach((c) => c.abort())
			map.clear()
		}
	}, [])

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
			const controller = beginRun(`tab:${tabId}`)
			updateTab(tabId, { running: true, runError: null, pendingTables: [] })
			const res = await runSql(
				{
					conn: duckdb.conn,
					loadedTables: registry.tables,
					loadSource: registry.load,
					chartOptionsMap
				},
				trimmed,
				{
					onPendingChange: (pending) => updateTab(tabId, { pendingTables: pending }),
					onLoadingStage: (stage) => updateTab(tabId, { loadingStage: stage })
				},
				undefined,
				controller.signal
			)
			endRun(`tab:${tabId}`, controller)
			if (!res.ok) {
				const errRes = res as Extract<typeof res, { ok: false }>
				updateTab(tabId, {
					runError: errRes.cancelled ? null : errRes.error,
					result: null,
					running: false,
					loadingStage: null
				})
				scheduleTabPendingClear(updateTab, tabId)
				return
			}
			const okRes = res as Extract<typeof res, { ok: true }>
			updateTab(tabId, {
				result: okRes.result,
				lastRun: {
					durationMs: okRes.durationMs,
					rows: okRes.result.rows.length,
					cols: okRes.result.columns.length,
					at: Date.now()
				},
				dirty: false,
				runError: null,
				running: false,
				loadingStage: null
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
		},
		[duckdb.conn, registry, recordRecent, chartOptionsMap, updateTab, beginRun, endRun]
	)

	const runQuery = useCallback(() => {
		const selection = editorRef.current?.getSelection() ?? null
		const stmtAtCursor = selection ? null : (editorRef.current?.getStatementAtCursor() ?? null)
		const sqlToRun = selection ?? stmtAtCursor ?? activeTab.sql
		return runSqlForTab(activeTabId, sqlToRun)
	}, [runSqlForTab, activeTabId, activeTab.sql])

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

	// --- Notebook cell execution ---

	const cellViewNames = useCallback((cells: NotebookCell[]): Set<string> => {
		const set = new Set<string>()
		cells.forEach((_, i) => set.add(`cell_${i + 1}`))
		return set
	}, [])

	const runSqlForCell = useCallback(
		async (tabId: string, cellId: string): Promise<boolean> => {
			if (!duckdb.conn) return false
			const tab = tabs.find((t) => t.id === tabId)
			if (!tab || tab.mode !== 'notebook' || !tab.cells) return false
			const cellIdx = tab.cells.findIndex((c) => c.id === cellId)
			if (cellIdx === -1) return false
			const cell = tab.cells[cellIdx]
			if (cell.type !== 'sql') return false
			const trimmed = cell.source.trim()
			if (!trimmed) return false

			const cellName = `cell_${cellIdx + 1}`
			const skipSet = cellViewNames(tab.cells)
			const controller = beginRun(`cell:${cellId}`)

			updateCell(tabId, cellId, {
				running: true,
				runError: null,
				pendingTables: [],
				loadingStage: null
			})

			const res = await runSql(
				{
					conn: duckdb.conn,
					loadedTables: registry.tables,
					loadSource: registry.load,
					chartOptionsMap
				},
				trimmed,
				{
					onPendingChange: (pending) => updateCell(tabId, cellId, { pendingTables: pending }),
					onLoadingStage: (stage) => updateCell(tabId, cellId, { loadingStage: stage })
				},
				skipSet,
				controller.signal
			)
			endRun(`cell:${cellId}`, controller)

			if (res.ok) {
				const okRes = res as Extract<typeof res, { ok: true }>
				// Register output as a view for downstream cells.
				try {
					const viewSql = trimmed.replace(/;\s*$/g, '').trim()
					await duckdb.conn.query(`CREATE OR REPLACE VIEW "${cellName}" AS (${viewSql})`)
				} catch (viewErr) {
					console.warn(`Failed to create view ${cellName}:`, viewErr)
				}
				updateCell(tabId, cellId, {
					result: okRes.result,
					lastRun: {
						durationMs: okRes.durationMs,
						rows: okRes.result.rows.length,
						cols: okRes.result.columns.length,
						at: Date.now()
					},
					dirty: false,
					runError: null,
					running: false,
					loadingStage: null,
					pendingTables: []
				})
				return true
			}
			const errRes = res as Extract<typeof res, { ok: false }>
			updateCell(tabId, cellId, {
				result: null,
				runError: errRes.cancelled ? null : errRes.error,
				running: false,
				loadingStage: null
			})
			return false
		},
		[tabs, duckdb.conn, registry, chartOptionsMap, updateCell, cellViewNames, beginRun, endRun]
	)

	const runCellsSequential = useCallback(
		async (tabId: string, cellIds: string[]) => {
			for (const id of cellIds) {
				const ok = await runSqlForCell(tabId, id)
				if (!ok) break
			}
		},
		[runSqlForCell]
	)

	const runAllCellsInTab = useCallback(
		async (tabId: string) => {
			const tab = tabs.find((t) => t.id === tabId)
			if (!tab || tab.mode !== 'notebook' || !tab.cells) return
			const sqlCellIds = tab.cells.filter((c) => c.type === 'sql' && c.source.trim()).map((c) => c.id)
			if (sqlCellIds.length === 0) return
			// Clean up stale views so numbering is fresh.
			if (duckdb.conn) {
				const maxViews = Math.max(tab.cells.length + 4, 16)
				for (let i = 1; i <= maxViews; i++) {
					try {
						await duckdb.conn.query(`DROP VIEW IF EXISTS "cell_${i}"`)
					} catch {
						/* noop */
					}
				}
			}
			await runCellsSequential(tabId, sqlCellIds)
			setCellsDirty(tabId, false)
		},
		[tabs, duckdb.conn, runCellsSequential, setCellsDirty]
	)

	const runCellsAbove = useCallback(
		async (tabId: string, targetCellId: string) => {
			const tab = tabs.find((t) => t.id === tabId)
			if (!tab || tab.mode !== 'notebook' || !tab.cells) return
			const targetIdx = tab.cells.findIndex((c) => c.id === targetCellId)
			if (targetIdx <= 0) return
			const ids = tab.cells
				.slice(0, targetIdx)
				.filter((c) => c.type === 'sql' && c.source.trim())
				.map((c) => c.id)
			await runCellsSequential(tabId, ids)
		},
		[tabs, runCellsSequential]
	)

	const runCellsBelow = useCallback(
		async (tabId: string, targetCellId: string) => {
			const tab = tabs.find((t) => t.id === tabId)
			if (!tab || tab.mode !== 'notebook' || !tab.cells) return
			const targetIdx = tab.cells.findIndex((c) => c.id === targetCellId)
			if (targetIdx === -1 || targetIdx >= tab.cells.length - 1) return
			const ids = tab.cells
				.slice(targetIdx + 1)
				.filter((c) => c.type === 'sql' && c.source.trim())
				.map((c) => c.id)
			await runCellsSequential(tabId, ids)
		},
		[tabs, runCellsSequential]
	)

	const runCellAndAdvance = useCallback(
		async (tabId: string, cellId: string) => {
			const tab = tabs.find((t) => t.id === tabId)
			if (!tab || tab.mode !== 'notebook' || !tab.cells) return
			const idx = tab.cells.findIndex((c) => c.id === cellId)
			if (idx === -1) return
			await runSqlForCell(tabId, cellId)
			const nextCell = tab.cells[idx + 1]
			if (nextCell) {
				focusCell(tabId, nextCell.id)
			} else {
				const newId = addCell(tabId, 'sql', idx + 1, true)
				if (newId) focusCell(tabId, newId)
			}
		},
		[tabs, runSqlForCell, focusCell, addCell]
	)

	// Drop cell views when notebook tab unmounts or becomes inactive
	const activeTabRef = useRef(activeTabId)
	activeTabRef.current = activeTabId
	useEffect(() => {
		return () => {
			// Cleanup on workspace unmount — best-effort
			if (!duckdb.conn) return
			for (let i = 1; i <= 64; i++) {
				duckdb.conn.query(`DROP VIEW IF EXISTS "cell_${i}"`).catch(() => undefined)
			}
		}
	}, [duckdb.conn])

	// --- Examples / saved queries / cookbook ---

	const onApplyExample = useCallback(
		(example: ExampleQuery) => {
			if (activeTab.mode === 'notebook' && activeTab.cells) {
				const lastCell = activeTab.cells[activeTab.cells.length - 1]
				const needsFreshCell = !lastCell || lastCell.type !== 'sql' || lastCell.source.trim().length > 0
				const targetCellId: string | null = needsFreshCell
					? addCell(activeTab.id, 'sql', activeTab.cells.length, true)
					: lastCell!.id
				if (!targetCellId) return
				updateCell(activeTab.id, targetCellId, { source: example.sql, dirty: true })
				return runSqlForCell(activeTab.id, targetCellId)
			}
			const newId = openTab({ sql: example.sql, title: example.title, focus: true })
			return prepareAndRun({
				tabId: newId,
				taskId: `example:${example.title}`,
				tables: example.tables,
				sql: example.sql
			})
		},
		[activeTab, openTab, prepareAndRun, addCell, updateCell, runSqlForCell]
	)

	const onLoadSavedQuery = useCallback(
		(preset: QuerySavedConfig) => {
			const existing = tabs.find((t) => t.mode === 'query' && t.sql === preset.sql)
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
	const hydrationCtxRef = useRef({
		tabs,
		openTab,
		openNotebookTab,
		focusTab,
		updateTab,
		updateCell,
		prepareAndRun,
		runSqlForCell,
		router
	})
	hydrationCtxRef.current = {
		tabs,
		openTab,
		openNotebookTab,
		focusTab,
		updateTab,
		updateCell,
		prepareAndRun,
		runSqlForCell,
		router
	}
	useEffect(() => {
		if (hydratedRef.current) return
		if (!router.isReady) return
		if (!duckdb.conn) return
		const rawQuery = router.query as Record<string, string | string[] | undefined>
		const ctx = hydrationCtxRef.current

		const notebookDecoded = decodeNotebookShare(rawQuery)
		if (notebookDecoded) {
			hydratedRef.current = true
			const cells = notebookDecoded.cells.map((c) => buildCellFromShared(c))
			const newId = ctx.openNotebookTab({
				cells,
				title: notebookDecoded.title ?? 'Shared notebook',
				focus: true
			})
			setSectionTab('editor')
			void (async () => {
				for (const cell of cells) {
					if (cell.type === 'sql' && cell.source.trim()) {
						await ctx.runSqlForCell(newId, cell.id)
					}
				}
			})()
			ctx.router.replace({ pathname: ctx.router.pathname, query: { mode: 'sql' } }, undefined, { shallow: true })
			return
		}

		const decoded = decodeDownloadConfig(rawQuery)
		if (!decoded) {
			hydratedRef.current = true
			return
		}
		if (decoded.kind === 'query') {
			hydratedRef.current = true
			const existing = ctx.tabs.find((t) => t.mode === 'query' && t.sql === decoded.sql)
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
		}
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

	const notebookShareCells = useMemo(() => {
		if (activeTab.mode !== 'notebook' || !activeTab.cells) return []
		return activeTab.cells.map((c) => ({
			type: c.type,
			source: c.source,
			chartConfig: c.chartConfig
		}))
	}, [activeTab])

	return (
		<div className="flex flex-col gap-3">
			<StatusStrip
				duckdbStatus={duckdb.status}
				lastRun={activeTab.lastRun}
				running={activeTab.running || (activeTab.cells?.some((c) => c.running) ?? false)}
				loadingStage={activeTab.loadingStage}
				error={!!activeTab.runError || (activeTab.cells?.some((c) => !!c.runError) ?? false)}
			/>

			<TabNav tab={sectionTab} onChange={setSectionTab} savedCount={savedQueries.length} />

			{sectionTab === 'editor' ? (
				<div
					className={`grid grid-cols-1 gap-4 ${
						playbookCollapsed ? 'lg:grid-cols-[minmax(0,1fr)_44px]' : 'lg:grid-cols-[minmax(0,1fr)_320px]'
					}`}
				>
					<div className="flex min-w-0 flex-col gap-3">
						<QueryTabBar
							tabs={tabs}
							activeTabId={activeTabId}
							onFocus={focusTab}
							onClose={closeTab}
							onNewTab={() => openTab({ focus: true })}
							onNewNotebookTab={() => openNotebookTab({ focus: true })}
							onRename={renameTab}
							onDuplicate={duplicateTab}
							onCloseOthers={closeOthers}
							onCloseToRight={closeToRight}
							onConvertToNotebook={convertTabToNotebook}
						/>
						<TableChipRail
							tables={registry.tables}
							onBrowseSchema={() => setSchemaDrawerOpen(true)}
							onRemove={registry.remove}
							pending={
								activeTab.mode === 'notebook'
									? (activeTab.cells?.flatMap((c) => c.pendingTables) ?? [])
									: activeTab.pendingTables
							}
							totalSchemaCount={TOTAL_SCHEMA_COUNT}
						/>

						{activeTab.mode === 'notebook' ? (
							<NotebookView
								tab={activeTab}
								loadedTables={registry.tables}
								canRun={!!duckdb.conn}
								onCellSourceChange={(cellId, source) =>
									updateCell(activeTab.id, cellId, (c) => ({
										source,
										dirty: source !== c.source ? true : c.dirty
									}))
								}
								onCellFocus={(cellId) => focusCell(activeTab.id, cellId)}
								onCellChartConfig={(cellId, next) =>
									updateCell(activeTab.id, cellId, { chartConfig: next ?? undefined })
								}
								onCellPreferredView={(cellId, view) => updateCell(activeTab.id, cellId, { preferredView: view })}
								onRunCell={async (cellId) => {
									await runSqlForCell(activeTab.id, cellId)
								}}
								onCancelCell={(cellId) => cancelRun(`cell:${cellId}`)}
								onRunCellAndAdvance={(cellId) => runCellAndAdvance(activeTab.id, cellId)}
								onRunAbove={(cellId) => runCellsAbove(activeTab.id, cellId)}
								onRunBelow={(cellId) => runCellsBelow(activeTab.id, cellId)}
								onRunAll={() => runAllCellsInTab(activeTab.id)}
								onAddCell={(type, atIndex) => {
									addCell(activeTab.id, type, atIndex, true)
								}}
								onDeleteCell={(cellId) => removeCell(activeTab.id, cellId)}
								onMoveCell={(cellId, direction) => {
									const cells = activeTab.cells ?? []
									const idx = cells.findIndex((c) => c.id === cellId)
									if (idx === -1) return
									const toIdx = direction === 'up' ? idx - 1 : idx + 1
									if (toIdx < 0 || toIdx >= cells.length) return
									reorderCells(activeTab.id, idx, toIdx)
								}}
								onReorderCell={(fromIdx, toIdx) => reorderCells(activeTab.id, fromIdx, toIdx)}
								onConvertCellType={(cellId, nextType) =>
									updateCell(activeTab.id, cellId, { type: nextType, result: null, runError: null, lastRun: null })
								}
								onDismissCellsDirty={() => setCellsDirty(activeTab.id, false)}
							/>
						) : (
							<>
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
									onCancel={() => cancelRun(`tab:${activeTabId}`)}
									onSave={() => setSavePresetOpen(true)}
									sql={activeTab.sql}
									tables={tableRefs}
									chartConfig={activeTab.chartConfig}
									mode="query"
									notebookCells={[]}
									notebookTitle={activeTab.title}
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
									durationMs={activeTab.lastRun?.durationMs ?? null}
								/>
							</>
						)}

						{activeTab.mode === 'notebook' ? (
							<div className="flex flex-wrap items-center justify-end gap-2">
								<ShareQueryButton
									sql=""
									tables={tableRefs}
									chartConfig={undefined}
									disabled={!duckdb.conn}
									mode="notebook"
									notebookCells={notebookShareCells}
									notebookTitle={activeTab.title}
								/>
							</div>
						) : null}
					</div>
					<div className="lg:sticky lg:top-4 lg:self-start">
						<ExamplesPanel
							onApply={onApplyExample}
							busyTaskId={activeTab.busyTaskId}
							collapsed={playbookCollapsed}
							onToggleCollapsed={togglePlaybook}
						/>
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

function buildCellFromShared(c: {
	type: 'sql' | 'markdown' | 'chart'
	source: string
	chartConfig?: ChartConfig
}): NotebookCell {
	return {
		id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
		type: c.type,
		source: c.source,
		chartConfig: c.chartConfig,
		preferredView: undefined,
		result: null,
		running: false,
		runError: null,
		lastRun: null,
		loadingStage: null,
		pendingTables: [],
		dirty: c.source.trim().length > 0
	}
}

function StatusStrip({
	duckdbStatus,
	lastRun,
	running,
	loadingStage,
	error
}: {
	duckdbStatus: 'loading' | 'ready' | 'error'
	lastRun: LastRunMeta | null
	running: boolean
	loadingStage: string | null
	error: boolean
}) {
	const envTone = duckdbStatus === 'ready' ? 'ready' : duckdbStatus === 'error' ? 'error' : 'busy'
	const busy = running || !!loadingStage
	const runTone = error ? 'error' : busy ? 'busy' : lastRun ? 'ready' : 'muted'

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-2 text-xs text-(--text-secondary)">
			<span className="flex items-center gap-1.5">
				<StatusDot tone={envTone} />
				<span className="text-(--text-tertiary)">LlamaSQL</span>
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
	onCancel,
	onSave,
	sql,
	tables,
	chartConfig,
	mode,
	notebookCells,
	notebookTitle
}: {
	running: boolean
	canRun: boolean
	onRun: () => void
	onCancel: () => void
	onSave: () => void
	sql: string
	tables: QueryTableRef[]
	chartConfig: ChartConfig | undefined
	mode: 'query' | 'notebook'
	notebookCells: Array<{ type: 'sql' | 'markdown'; source: string; chartConfig?: ChartConfig }>
	notebookTitle: string
}) {
	return (
		<div className="flex flex-wrap items-center justify-end gap-2">
			<ShareQueryButton
				sql={sql}
				tables={tables}
				chartConfig={chartConfig}
				disabled={!canRun}
				mode={mode}
				notebookCells={notebookCells}
				notebookTitle={notebookTitle}
			/>
			<button
				type="button"
				onClick={onSave}
				disabled={!canRun}
				className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="bookmark" className="h-3.5 w-3.5" />
				Save
			</button>
			{running ? (
				<button
					type="button"
					onClick={onCancel}
					title="Cancel query"
					className="inline-flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-300"
				>
					<LoadingSpinner size={12} />
					<svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
						<rect x="6" y="6" width="12" height="12" rx="1" />
					</svg>
					Stop
				</button>
			) : (
				<button
					type="button"
					onClick={onRun}
					disabled={!canRun}
					className="inline-flex items-center gap-2 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
						<path d="M8 5v14l11-7z" />
					</svg>
					Run query
					<span aria-hidden className="flex items-center gap-0.5">
						<Keycap muted>⌘</Keycap>
						<Keycap muted>↵</Keycap>
					</span>
				</button>
			)}
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
	const [renamingId, setRenamingId] = useState<string | null>(null)

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
				const isRenaming = renamingId === q.id
				return (
					<li key={q.id} className={`group flex items-center justify-between gap-3 py-3 ${isDim ? 'opacity-40' : ''}`}>
						<button
							type="button"
							onClick={() => (isRenaming ? null : onOpen(q))}
							onDoubleClick={() => setRenamingId(q.id)}
							disabled={busy || isRenaming}
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
								{isRenaming ? (
									<InlineRenameInput
										initial={q.name}
										onCommit={(next) => {
											const trimmed = next.trim()
											if (trimmed && trimmed !== q.name) onRename(q.id, trimmed)
											setRenamingId(null)
										}}
										onCancel={() => setRenamingId(null)}
									/>
								) : (
									<span className="truncate text-sm font-semibold text-(--text-primary) transition-colors group-hover:text-(--primary)">
										{q.name}
									</span>
								)}
								<span className="truncate font-mono text-xs text-(--text-tertiary)">{firstNonEmptyLine(q.sql)}</span>
							</span>
						</button>
						<div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
							<button
								type="button"
								onClick={() => setRenamingId(q.id)}
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

function InlineRenameInput({
	initial,
	onCommit,
	onCancel
}: {
	initial: string
	onCommit: (value: string) => void
	onCancel: () => void
}) {
	const [value, setValue] = useState(initial)
	const inputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		inputRef.current?.focus()
		inputRef.current?.select()
	}, [])

	return (
		<input
			ref={inputRef}
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault()
					onCommit(value)
				} else if (e.key === 'Escape') {
					e.preventDefault()
					onCancel()
				}
				e.stopPropagation()
			}}
			onBlur={() => onCommit(value)}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			onMouseDown={(e) => e.stopPropagation()}
			className="min-w-0 rounded-sm bg-(--bg-primary) px-1 py-px text-sm font-semibold text-(--text-primary) ring-1 ring-(--primary) outline-none"
		/>
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
