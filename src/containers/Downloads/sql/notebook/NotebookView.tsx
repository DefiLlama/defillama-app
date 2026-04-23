import * as Ariakit from '@ariakit/react'
import { loader } from '@monaco-editor/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import type { ChartConfig } from '../chartConfig'
import type { CellVirtualTable, CompletionContext } from '../completions'
import { registerSqlCompletions, registerSqlHovers } from '../completions'
import type { NotebookCellType, QueryTab, ResultsView } from '../useSqlTabs'
import type { RegisteredTable } from '../useTableRegistry'
import type { ChartSourceOption } from './ChartCell'
import { NotebookCell } from './NotebookCell'
import type { SqlCellHandle } from './SqlCell'

interface NotebookViewProps {
	tab: QueryTab
	loadedTables: RegisteredTable[]
	canRun: boolean
	onCellSourceChange: (cellId: string, source: string) => void
	onCellFocus: (cellId: string) => void
	onCellChartConfig: (cellId: string, config: ChartConfig | null) => void
	onCellPreferredView: (cellId: string, view: ResultsView | undefined) => void
	onRunCell: (cellId: string) => Promise<void> | void
	onRunCellAndAdvance: (cellId: string) => Promise<void> | void
	onRunAbove: (cellId: string) => Promise<void> | void
	onRunBelow: (cellId: string) => Promise<void> | void
	onRunAll: () => Promise<void> | void
	onAddCell: (type: 'sql' | 'markdown' | 'chart', atIndex: number) => void
	onDeleteCell: (cellId: string) => void
	onMoveCell: (cellId: string, direction: 'up' | 'down') => void
	onReorderCell: (fromIdx: number, toIdx: number) => void
	onConvertCellType: (cellId: string, nextType: 'sql' | 'markdown' | 'chart') => void
	onDismissCellsDirty: () => void
}

export function NotebookView({
	tab,
	loadedTables,
	canRun,
	onCellSourceChange,
	onCellFocus,
	onCellChartConfig,
	onCellPreferredView,
	onRunCell,
	onRunCellAndAdvance,
	onRunAbove,
	onRunBelow,
	onRunAll,
	onAddCell,
	onDeleteCell,
	onMoveCell,
	onReorderCell,
	onConvertCellType,
	onDismissCellsDirty
}: NotebookViewProps) {
	const cells = useMemo(() => tab.cells ?? [], [tab.cells])
	const activeCellId = tab.activeCellId

	const cellRefs = useRef(new Map<string, SqlCellHandle | null>())

	const cellTables = useMemo<CellVirtualTable[]>(() => {
		const out: CellVirtualTable[] = []
		;(tab.cells ?? []).forEach((cell, i) => {
			if (cell.type !== 'sql') return
			const name = `cell_${i + 1}`
			const cols = cell.result?.columns ?? []
			out.push({
				name,
				columns: cols.map((c) => ({ name: c.name, type: c.type as string | undefined })),
				rowCount: cell.result?.rows.length ?? 0,
				hasRun: !!cell.result
			})
		})
		return out
	}, [tab.cells])

	const contextRef = useRef<CompletionContext>({ tables: loadedTables, cellTables })
	useEffect(() => {
		contextRef.current = { tables: loadedTables, cellTables }
	}, [loadedTables, cellTables])

	useEffect(() => {
		let cancelled = false
		let completionsDisposable: { dispose: () => void } | null = null
		let hoversDisposable: { dispose: () => void } | null = null
		loader.init().then((monaco) => {
			if (cancelled) return
			completionsDisposable = registerSqlCompletions(monaco, contextRef)
			hoversDisposable = registerSqlHovers(monaco, contextRef)
		})
		return () => {
			cancelled = true
			completionsDisposable?.dispose()
			hoversDisposable?.dispose()
		}
	}, [])

	const runningAny = cells.some((c) => c.running)
	const runnableSqlCount = cells.filter((c) => c.type === 'sql' && c.source.trim().length > 0).length
	const chartCount = cells.filter((c) => c.type === 'chart').length
	const hasRunnableSql = runnableSqlCount > 0
	const hasRunAny = cells.some((c) => c.type === 'sql' && (c.result != null || c.lastRun != null))
	const promoteRunAll = hasRunnableSql && !hasRunAny
	const cellNames = useMemo(
		() =>
			cells.reduce<Record<string, string>>((acc, c, i) => {
				acc[c.id] = `cell_${i + 1}`
				return acc
			}, {}),
		[cells]
	)

	const chartSourcesByCellId = useMemo(() => {
		const out: Record<string, ChartSourceOption[]> = {}
		const allSources: ChartSourceOption[] = cells
			.map((c, i) => {
				if (c.type !== 'sql') return null
				return {
					name: `cell_${i + 1}`,
					cellId: c.id,
					hasRun: !!c.result,
					result: c.result
				}
			})
			.filter((s): s is ChartSourceOption => s !== null)
		for (const c of cells) {
			if (c.type === 'chart') {
				const selfIdx = cells.findIndex((x) => x.id === c.id)
				out[c.id] = allSources.filter((s) => cells.findIndex((x) => x.id === s.cellId) < selfIdx)
			} else {
				out[c.id] = []
			}
		}
		return out
	}, [cells])

	const upstreamDirtyByCellId = useMemo(() => {
		const out: Record<string, boolean> = {}
		let seenDirty = false
		for (const cell of cells) {
			out[cell.id] = cell.type === 'markdown' ? false : seenDirty
			if (cell.type === 'sql' && cell.dirty && cell.source.trim()) seenDirty = true
		}
		return out
	}, [cells])

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null
			const editable =
				target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
			if (!activeCellId) return

			// Alt+Up/Down: focus previous / next cell
			if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
				if (editable && !target?.closest('.monaco-editor')) return
				const idx = cells.findIndex((c) => c.id === activeCellId)
				if (idx === -1) return
				const nextIdx = e.key === 'ArrowDown' ? Math.min(idx + 1, cells.length - 1) : Math.max(idx - 1, 0)
				if (nextIdx === idx) return
				e.preventDefault()
				const nextCell = cells[nextIdx]
				onCellFocus(nextCell.id)
				requestAnimationFrame(() => {
					cellRefs.current.get(nextCell.id)?.focus()
				})
				return
			}

			// Cmd+Alt+Up/Down: reorder cell up/down
			if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
				const idx = cells.findIndex((c) => c.id === activeCellId)
				if (idx === -1) return
				if (e.key === 'ArrowUp' && idx === 0) return
				if (e.key === 'ArrowDown' && idx === cells.length - 1) return
				e.preventDefault()
				onMoveCell(activeCellId, e.key === 'ArrowUp' ? 'up' : 'down')
				return
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [activeCellId, cells, onCellFocus, onMoveCell])

	const setCellRef = useCallback(
		(cellId: string) => (handle: SqlCellHandle | null) => {
			if (handle) cellRefs.current.set(cellId, handle)
			else cellRefs.current.delete(cellId)
		},
		[]
	)

	const [dragState, setDragState] = useState<{ fromId: string; overId: string | null; before: boolean } | null>(null)

	const handleDragStart = useCallback(
		(cellId: string, cellEl: HTMLElement | null) => (e: React.DragEvent) => {
			e.dataTransfer.effectAllowed = 'move'
			e.dataTransfer.setData('text/plain', cellId)
			if (cellEl) {
				const rect = cellEl.getBoundingClientRect()
				e.dataTransfer.setDragImage(cellEl, Math.min(40, rect.width / 2), Math.min(20, rect.height / 2))
			}
			setDragState({ fromId: cellId, overId: null, before: false })
		},
		[]
	)

	const handleDragEnd = useCallback(() => setDragState(null), [])

	const handleDropOnCell = useCallback(
		(cellId: string) => (e: React.DragEvent) => {
			if (!dragState) return
			e.preventDefault()
			const fromIdx = cells.findIndex((c) => c.id === dragState.fromId)
			let toIdx = cells.findIndex((c) => c.id === cellId)
			if (fromIdx === -1 || toIdx === -1) {
				setDragState(null)
				return
			}
			if (!dragState.before) toIdx += 1
			if (toIdx > fromIdx) toIdx -= 1
			if (toIdx !== fromIdx) onReorderCell(fromIdx, toIdx)
			setDragState(null)
		},
		[cells, dragState, onReorderCell]
	)

	const handleDragOverCell = useCallback(
		(cellId: string) => (e: React.DragEvent) => {
			if (!dragState || dragState.fromId === cellId) return
			e.preventDefault()
			e.dataTransfer.dropEffect = 'move'
			const rect = e.currentTarget.getBoundingClientRect()
			const before = e.clientY < rect.top + rect.height / 2
			setDragState((prev) =>
				prev && (prev.overId !== cellId || prev.before !== before) ? { ...prev, overId: cellId, before } : prev
			)
		},
		[dragState]
	)

	const runAll = () => {
		toast.promise(Promise.resolve(onRunAll()), {
			loading: 'Running notebook…',
			success: 'Notebook done',
			error: 'Notebook stopped on error'
		})
	}

	const firstStaleIdx = useMemo(
		() => cells.findIndex((c) => upstreamDirtyByCellId[c.id]),
		[cells, upstreamDirtyByCellId]
	)
	const firstStaleName = firstStaleIdx >= 0 ? cellNames[cells[firstStaleIdx].id] : null

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-baseline gap-2">
					<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">{tab.title}</h3>
					<span className="text-[11px] text-(--text-tertiary) tabular-nums">
						{cells.length} cell{cells.length === 1 ? '' : 's'}
						{hasRunnableSql ? ` · ${runnableSqlCount} SQL` : ''}
						{chartCount > 0 ? ` · ${chartCount} chart${chartCount === 1 ? '' : 's'}` : ''}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{promoteRunAll && hasRunnableSql ? (
						<span className="hidden text-[11px] text-(--text-tertiary) sm:inline">
							Not yet run —{' '}
							<span className="tabular-nums text-(--text-secondary)">{runnableSqlCount}</span>{' '}
							{runnableSqlCount === 1 ? 'query' : 'queries'}
							{chartCount > 0 ? (
								<>
									, <span className="tabular-nums text-(--text-secondary)">{chartCount}</span>{' '}
									{chartCount === 1 ? 'chart' : 'charts'}
								</>
							) : null}
						</span>
					) : null}
					<button
						type="button"
						onClick={runAll}
						disabled={!canRun || runningAny || !hasRunnableSql}
						className={`inline-flex items-center gap-1.5 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
							promoteRunAll
								? 'bg-(--primary) px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90'
								: 'border border-(--divider) bg-(--cards-bg) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--primary)/40 hover:text-(--primary)'
						}`}
					>
						{runningAny ? (
							<LoadingSpinner size={promoteRunAll ? 13 : 12} />
						) : (
							<svg
								className={promoteRunAll ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5'}
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden
							>
								<path d="M8 5v14l11-7z" />
							</svg>
						)}
						{promoteRunAll ? 'Run notebook' : 'Run all'}
					</button>
				</div>
			</div>

			{tab.cellsDirty || firstStaleName ? (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-pro-gold-300/40 bg-pro-gold-300/5 px-3 py-1.5 text-[11.5px] text-pro-gold-300">
					<span className="inline-flex items-center gap-1.5">
						<Icon name="alert-triangle" className="h-3.5 w-3.5" />
						{tab.cellsDirty
							? 'Cell order changed — downstream results may be stale.'
							: firstStaleName
								? `Upstream edits — re-run from ${firstStaleName} to refresh downstream.`
								: null}
					</span>
					<div className="flex items-center gap-1">
						{firstStaleName && !tab.cellsDirty ? (
							<button
								type="button"
								onClick={runAll}
								disabled={!canRun || runningAny}
								className="rounded-md border border-pro-gold-300/40 px-2 py-0.5 text-[11px] font-medium text-pro-gold-300 hover:bg-pro-gold-300/10 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Re-run all
							</button>
						) : null}
						<button
							type="button"
							onClick={onDismissCellsDirty}
							aria-label="Dismiss"
							className="rounded-md px-1.5 py-0.5 hover:bg-pro-gold-300/20"
						>
							<Icon name="x" className="h-3 w-3" />
						</button>
					</div>
				</div>
			) : null}

			<div className="flex flex-col gap-0">
				{cells.map((cell, idx) => {
					const isDragSrc = dragState?.fromId === cell.id
					const isDropTarget = dragState?.overId === cell.id && dragState.fromId !== cell.id
					return (
						<div
							key={cell.id}
							onDragOver={handleDragOverCell(cell.id)}
							onDrop={handleDropOnCell(cell.id)}
							className={`relative flex flex-col gap-0 ${isDragSrc ? 'opacity-40' : ''}`}
						>
							{isDropTarget && dragState?.before ? <DropIndicator position="top" /> : null}
							<NotebookCell
								ref={setCellRef(cell.id)}
								cell={cell}
								index={idx}
								total={cells.length}
								focused={cell.id === activeCellId}
								cellName={cellNames[cell.id]}
								canRun={canRun}
								upstreamDirty={upstreamDirtyByCellId[cell.id]}
								availableChartSources={chartSourcesByCellId[cell.id] ?? []}
								onSourceChange={(next) => onCellSourceChange(cell.id, next)}
								onRun={() => onRunCell(cell.id)}
								onRunAndAdvance={() => onRunCellAndAdvance(cell.id)}
								onRunAbove={() => onRunAbove(cell.id)}
								onRunBelow={() => onRunBelow(cell.id)}
								onFocus={() => onCellFocus(cell.id)}
								onDelete={() => onDeleteCell(cell.id)}
								onMoveUp={() => onMoveCell(cell.id, 'up')}
								onMoveDown={() => onMoveCell(cell.id, 'down')}
								onConvertType={(nextType) => onConvertCellType(cell.id, nextType)}
								onChartConfigChange={(next) => onCellChartConfig(cell.id, next)}
								onPreferredViewChange={(view) => onCellPreferredView(cell.id, view)}
								onDragStart={handleDragStart}
								onDragEnd={handleDragEnd}
							/>
							{isDropTarget && !dragState?.before ? <DropIndicator position="bottom" /> : null}
							<AddCellBar
								onAdd={(type) => onAddCell(type, idx + 1)}
								variant={idx === cells.length - 1 ? 'end' : 'between'}
							/>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function DropIndicator({ position }: { position: 'top' | 'bottom' }) {
	return (
		<span
			aria-hidden
			className={`pointer-events-none absolute inset-x-0 z-10 flex h-0 items-center ${
				position === 'top' ? '-top-0.5' : '-bottom-0.5'
			}`}
		>
			<span className="h-0.5 w-full rounded-full bg-(--primary)" />
		</span>
	)
}

function AddCellBar({
	onAdd,
	variant = 'between'
}: {
	onAdd: (type: NotebookCellType) => void
	variant?: 'between' | 'end'
}) {
	if (variant === 'end') {
		return (
			<div className="flex items-center justify-center py-2">
				<AddMenu onAdd={onAdd} variant="end" />
			</div>
		)
	}
	return (
		<div className="group relative flex items-center justify-center py-1">
			<span
				aria-hidden
				className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-transparent transition-colors group-focus-within:bg-(--divider) group-hover:bg-(--divider)"
			/>
			<AddMenu onAdd={onAdd} variant="between" />
		</div>
	)
}

function AddMenu({ onAdd, variant }: { onAdd: (type: NotebookCellType) => void; variant: 'between' | 'end' }) {
	const triggerCls =
		variant === 'between'
			? 'relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-(--divider) bg-(--app-bg) text-(--text-tertiary) opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:border-(--primary)/50 hover:text-(--primary) aria-expanded:opacity-100 aria-expanded:border-(--primary)/50 aria-expanded:text-(--primary)'
			: 'inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-2.5 py-1 text-[11.5px] font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 hover:text-(--primary)'
	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton className={triggerCls} aria-label="Add cell">
				<Icon name="plus" className="h-3 w-3" />
				{variant === 'end' ? 'Add cell' : null}
			</Ariakit.MenuButton>
			<Ariakit.Menu
				gutter={4}
				unmountOnHide
				className="z-40 min-w-[160px] rounded-md border border-(--divider) bg-(--cards-bg) p-1 text-xs text-(--text-primary) shadow-lg"
			>
				<AddMenuItem onClick={() => onAdd('sql')} label="SQL" hint="Query" tone="primary" />
				<AddMenuItem onClick={() => onAdd('chart')} label="Chart" hint="Visualize" tone="gold" />
				<AddMenuItem onClick={() => onAdd('markdown')} label="Markdown" hint="Narrate" tone="purple" />
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}

function AddMenuItem({
	onClick,
	label,
	hint,
	tone
}: {
	onClick: () => void
	label: string
	hint: string
	tone: 'primary' | 'gold' | 'purple'
}) {
	const dot = tone === 'primary' ? 'bg-(--primary)' : tone === 'gold' ? 'bg-pro-gold-300' : 'bg-pro-purple-300'
	return (
		<Ariakit.MenuItem
			onClick={onClick}
			className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
		>
			<span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
			<span className="flex-1 font-medium">{label}</span>
			<span className="text-[10.5px] text-(--text-tertiary)">{hint}</span>
		</Ariakit.MenuItem>
	)
}
