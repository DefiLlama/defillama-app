import * as Ariakit from '@ariakit/react'
import { forwardRef, useCallback, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import type { ChartConfig } from '../chartConfig'
import { Keycap } from '../primitives'
import type { NotebookCell as NotebookCellType, NotebookCellType as CellType, ResultsView } from '../useSqlTabs'
import { ChartCell, type ChartSourceOption } from './ChartCell'
import { MarkdownCell } from './MarkdownCell'
import { SqlCell, type SqlCellHandle } from './SqlCell'

interface NotebookCellProps {
	cell: NotebookCellType
	index: number
	total: number
	focused: boolean
	cellName: string
	availableChartSources: ChartSourceOption[]
	onSourceChange: (next: string) => void
	onRun: () => void
	onRunAndAdvance: () => void
	onRunAbove: () => void
	onRunBelow: () => void
	onFocus: () => void
	onDelete: () => void
	onMoveUp: () => void
	onMoveDown: () => void
	onConvertType: (nextType: CellType) => void
	onChartConfigChange: (next: ChartConfig | null) => void
	onPreferredViewChange: (view: ResultsView | undefined) => void
	onDragStart?: (cellId: string, cellEl: HTMLElement | null) => (e: React.DragEvent) => void
	onDragEnd?: () => void
	canRun: boolean
	upstreamDirty: boolean
}

export const NotebookCell = forwardRef<SqlCellHandle, NotebookCellProps>(function NotebookCell(
	{
		cell,
		index,
		total,
		focused,
		cellName,
		availableChartSources,
		onSourceChange,
		onRun,
		onRunAndAdvance,
		onRunAbove,
		onRunBelow,
		onFocus,
		onDelete,
		onMoveUp,
		onMoveDown,
		onConvertType,
		onChartConfigChange,
		onPreferredViewChange,
		onDragStart,
		onDragEnd,
		canRun,
		upstreamDirty
	},
	ref
) {
	const isFirst = index === 0
	const isLast = index === total - 1

	const handleCellFocus = useCallback(() => {
		if (!focused) onFocus()
	}, [focused, onFocus])

	const isMarkdown = cell.type === 'markdown'
	const staleGutter = upstreamDirty && !isMarkdown

	const outerRef = useRef<HTMLDivElement | null>(null)
	const [draggable, setDraggable] = useState(false)

	return (
		<div
			ref={outerRef}
			onFocus={handleCellFocus}
			onClick={handleCellFocus}
			draggable={draggable}
			onDragStart={
				onDragStart
					? (e) => {
							onDragStart(cell.id, outerRef.current)(e)
						}
					: undefined
			}
			onDragEnd={() => {
				setDraggable(false)
				onDragEnd?.()
			}}
			className={`group relative flex flex-col gap-2 rounded-md border px-3 py-2 transition-colors ${
				focused
					? 'border-(--primary)/50 bg-(--cards-bg) shadow-[0_0_0_1px_var(--primary)]/20'
					: 'border-(--divider) bg-(--cards-bg)/60 hover:border-(--divider) hover:bg-(--cards-bg)'
			}`}
		>
			{staleGutter ? (
				<span
					aria-hidden
					title="Upstream cell was edited — re-run to refresh"
					className="pointer-events-none absolute inset-y-1 left-0 w-0.5 rounded-full bg-pro-gold-300/70"
				/>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				{onDragStart && total > 1 ? (
					<button
						type="button"
						aria-label="Drag to reorder"
						title="Drag to reorder"
						onMouseDown={() => setDraggable(true)}
						onMouseUp={() => setDraggable(false)}
						onMouseLeave={() => setDraggable(false)}
						className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
					>
						<Icon name="menu" className="h-3 w-3" />
					</button>
				) : null}
				<span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-(--text-tertiary)">
					<span className="text-(--text-secondary)">{cellName}</span>
					<CellTypeBadge type={cell.type} />
				</span>
				{cell.running && cell.loadingStage ? (
					<span className="inline-flex items-center gap-1 text-[11px] text-pro-gold-300">
						<LoadingSpinner size={10} />
						{cell.loadingStage}
					</span>
				) : cell.runError ? (
					<span className="inline-flex items-center gap-1 text-[11px] text-red-500">
						<Icon name="alert-triangle" className="h-3 w-3" />
						error
					</span>
				) : null}

				<div className="ml-auto flex items-center gap-1">
					{cell.type === 'sql' ? (
						<button
							type="button"
							onClick={onRun}
							disabled={!canRun || cell.running || !cell.source.trim()}
							className="inline-flex items-center gap-1.5 rounded-md bg-(--primary) px-2 py-1 text-[11px] font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{cell.running ? (
								<LoadingSpinner size={10} />
							) : (
								<svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
									<path d="M8 5v14l11-7z" />
								</svg>
							)}
							Run
							<span aria-hidden className="flex items-center gap-0.5">
								<Keycap muted>⌘</Keycap>
								<Keycap muted>↵</Keycap>
							</span>
						</button>
					) : null}

					<CellMenu
						cellType={cell.type}
						isFirst={isFirst}
						isLast={isLast}
						canDelete={total > 1}
						onRunAbove={onRunAbove}
						onRunBelow={onRunBelow}
						onMoveUp={onMoveUp}
						onMoveDown={onMoveDown}
						onDelete={onDelete}
						onConvertType={onConvertType}
					/>
				</div>
			</div>

			{cell.type === 'sql' ? (
				<SqlCell
					ref={ref}
					cell={cell}
					onSourceChange={onSourceChange}
					onRun={onRun}
					onRunAndAdvance={onRunAndAdvance}
					onFocus={onFocus}
					onChartConfigChange={onChartConfigChange}
					onPreferredViewChange={onPreferredViewChange}
				/>
			) : cell.type === 'chart' ? (
				<ChartCell
					cell={cell}
					availableSources={availableChartSources}
					onSourceChange={onSourceChange}
					onChartConfigChange={onChartConfigChange}
				/>
			) : (
				<MarkdownCell source={cell.source} onChange={onSourceChange} focused={focused} onFocus={onFocus} />
			)}
		</div>
	)
})

function CellTypeBadge({ type }: { type: CellType }) {
	const label = type === 'sql' ? 'SQL' : type === 'markdown' ? 'MD' : 'CHART'
	const tone =
		type === 'sql'
			? 'bg-(--primary)/15 text-(--primary)'
			: type === 'markdown'
				? 'bg-pro-purple-300/15 text-pro-purple-300'
				: 'bg-pro-gold-300/15 text-pro-gold-300'
	return (
		<span className={`inline-flex h-[14px] items-center rounded-[3px] px-1 font-mono text-[9px] leading-none ${tone}`}>
			{label}
		</span>
	)
}

function CellMenu({
	cellType,
	isFirst,
	isLast,
	canDelete,
	onRunAbove,
	onRunBelow,
	onMoveUp,
	onMoveDown,
	onDelete,
	onConvertType
}: {
	cellType: CellType
	isFirst: boolean
	isLast: boolean
	canDelete: boolean
	onRunAbove: () => void
	onRunBelow: () => void
	onMoveUp: () => void
	onMoveDown: () => void
	onDelete: () => void
	onConvertType: (next: CellType) => void
}) {
	const otherTypes: CellType[] = (['sql', 'markdown', 'chart'] as CellType[]).filter((t) => t !== cellType)
	return (
		<Ariakit.MenuProvider>
			<Ariakit.MenuButton
				className="flex h-6 w-6 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
				aria-label="Cell actions"
			>
				<Icon name="ellipsis" className="h-3.5 w-3.5" />
			</Ariakit.MenuButton>
			<Ariakit.Menu
				gutter={4}
				className="z-40 min-w-[180px] rounded-md border border-(--divider) bg-(--cards-bg) p-1 text-xs text-(--text-primary) shadow-lg"
			>
				{cellType === 'sql' ? (
					<>
						<Ariakit.MenuItem
							disabled={isFirst}
							onClick={onRunAbove}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
						>
							<Icon name="chevron-up" className="h-3 w-3 text-(--text-tertiary)" />
							Run cells above
						</Ariakit.MenuItem>
						<Ariakit.MenuItem
							disabled={isLast}
							onClick={onRunBelow}
							className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
						>
							<Icon name="chevron-down" className="h-3 w-3 text-(--text-tertiary)" />
							Run cells below
						</Ariakit.MenuItem>
						<div className="my-1 h-px bg-(--divider)" />
					</>
				) : null}
				<Ariakit.MenuItem
					disabled={isFirst}
					onClick={onMoveUp}
					className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Icon name="arrow-up" className="h-3 w-3 text-(--text-tertiary)" />
					Move up
				</Ariakit.MenuItem>
				<Ariakit.MenuItem
					disabled={isLast}
					onClick={onMoveDown}
					className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Icon name="arrow-down" className="h-3 w-3 text-(--text-tertiary)" />
					Move down
				</Ariakit.MenuItem>
				<div className="my-1 h-px bg-(--divider)" />
				{otherTypes.map((t) => (
					<Ariakit.MenuItem
						key={t}
						onClick={() => onConvertType(t)}
						className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-(--link-hover-bg)"
					>
						<Icon name="repeat" className="h-3 w-3 text-(--text-tertiary)" />
						Convert to {t === 'sql' ? 'SQL' : t === 'markdown' ? 'Markdown' : 'Chart'}
					</Ariakit.MenuItem>
				))}
				<div className="my-1 h-px bg-(--divider)" />
				<Ariakit.MenuItem
					disabled={!canDelete}
					onClick={onDelete}
					className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Icon name="trash-2" className="h-3 w-3" />
					Delete cell
				</Ariakit.MenuItem>
			</Ariakit.Menu>
		</Ariakit.MenuProvider>
	)
}
