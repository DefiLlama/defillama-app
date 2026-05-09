import { flexRender, type Row, type RowData, type Table } from '@tanstack/react-table'
import { type VirtualItem, useWindowVirtualizer } from '@tanstack/react-virtual'
import clsx from 'clsx'
import { useRouter } from 'next/router'
import * as React from 'react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { SortIcon } from '~/components/Table/SortIcon'
import { Tooltip } from '~/components/Tooltip'
import { useMedia } from '~/hooks/useMedia'

interface ITableProps<T extends RowData = RowData> {
	instance: Table<T>
	skipVirtualization?: boolean
	rowSize?: number
	stripedBg?: boolean
	style?: React.CSSProperties
	className?: string
	compact?: boolean
	useStickyHeader?: boolean
	scrollMargin?: number
}

const isGroupingColumn = (columnId?: string) => typeof columnId === 'string' && columnId.startsWith('__group_')
const DEFAULT_VIRTUAL_ROW_SIZE = 50
const INITIAL_VIRTUAL_WINDOW_ROWS = 18

const getInitialVirtualizerHeight = (rowCount: number, rowHeight: number) =>
	Math.min(rowCount, INITIAL_VIRTUAL_WINDOW_ROWS) * rowHeight

interface StickyHeaderLayout {
	left: number
	width: number
	tableWidth: number
	headerHeight: number
	scrollLeft: number
}

const areNumberArraysEqual = (a: Array<number>, b: Array<number>) => {
	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

const isSameStickyHeaderLayout = (a: StickyHeaderLayout | null, b: StickyHeaderLayout) =>
	Boolean(
		a &&
		a.left === b.left &&
		a.width === b.width &&
		a.tableWidth === b.tableWidth &&
		a.headerHeight === b.headerHeight &&
		a.scrollLeft === b.scrollLeft
	)

interface TableRowProps<T extends RowData = RowData> {
	row: Row<T>
	index: number
	virtualRow?: VirtualItem | null
	subRowOrdinalById: Map<string, number>
	firstColumnId: string | undefined
	stripedBg: boolean
	isChainPage: boolean
	compact: boolean
}

function TableRow<T extends RowData>({
	row: rowToRender,
	index: i,
	virtualRow,
	subRowOrdinalById,
	firstColumnId,
	stripedBg,
	isChainPage,
	compact
}: TableRowProps<T>) {
	return (
		<tr
			data-index={virtualRow?.index}
			style={{
				opacity: (rowToRender.original as Record<string, unknown>)?.disabled ? 0.3 : 1,
				...(rowToRender.depth > 0
					? {
							['--vf-subrow-index' as string]: `"${subRowOrdinalById.get(rowToRender.id) ?? rowToRender.index + 1}"`
						}
					: null)
			}}
			data-depth={rowToRender.depth}
			className="vf-row"
		>
			{rowToRender
				.getVisibleCells()
				.filter((cell) => !cell.column.columnDef.meta?.hidden)
				.map((cell) => {
					const textAlign = cell.column.columnDef.meta?.align ?? 'start'
					const isSticky = cell.column.id === firstColumnId
					return (
						<td
							key={cell.id}
							data-lighter={stripedBg && i % 2 === 0}
							data-chainpage={isChainPage}
							className={`overflow-hidden border-t border-r border-(--divider) p-3 text-ellipsis whitespace-nowrap ${
								compact ? 'border-r-0 border-t-black/10 px-5 dark:border-t-white/10' : ''
							}`}
							style={{
								textAlign,
								verticalAlign: compact ? 'middle' : undefined,
								position: isSticky ? 'sticky' : undefined,
								left: isSticky ? 0 : undefined,
								zIndex: isSticky ? 1 : undefined,
								background: isSticky ? 'var(--cards-bg)' : undefined,
								borderRightColor: isSticky ? 'transparent' : undefined,
								boxShadow: isSticky && !compact ? '-1px 0 0 var(--divider) inset' : undefined
							}}
						>
							{flexRender(cell.column.columnDef.cell, cell.getContext())}
						</td>
					)
				})}
		</tr>
	)
}

export function VirtualTable<T extends RowData>({
	instance,
	skipVirtualization,
	rowSize,
	stripedBg = false,
	compact = false,
	useStickyHeader = true,
	scrollMargin,
	className,
	style,
	...props
}: ITableProps<T>) {
	const router = useRouter()
	const isSmallScreen = useMedia('(max-width: 768px)')
	const tableContainerRef = useRef<HTMLDivElement>(null)
	const { rows } = instance.getRowModel()

	const subRowOrdinalById = React.useMemo(() => {
		const ordById = new Map<string, number>()
		const perParent = new Map<string, number>()

		for (const r of rows) {
			if (r.depth > 0) {
				const parentId =
					r.getParentRow?.()?.id ?? (typeof r.id === 'string' ? r.id.split('.').slice(0, -1).join('.') : String(r.id))
				const next = (perParent.get(parentId) ?? 0) + 1
				perParent.set(parentId, next)
				ordById.set(r.id, next)
			}
		}

		return ordById
	}, [rows])

	const [containerOffset, setContainerOffset] = useState(0)
	useEffect(() => {
		if (tableContainerRef.current) {
			setContainerOffset(tableContainerRef.current.offsetTop)
		}
	}, [])

	const estimatedRowSize = rowSize ?? DEFAULT_VIRTUAL_ROW_SIZE
	const initialVirtualizerRect = React.useMemo(
		() => ({ width: 0, height: getInitialVirtualizerHeight(rows.length, estimatedRowSize) }),
		[rows.length, estimatedRowSize]
	)
	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		// Virtual rows are fixed-height; keep rowSize aligned with rendered row CSS/content.
		estimateSize: () => estimatedRowSize,
		initialOffset: 0,
		initialRect: initialVirtualizerRect,
		overscan: 5,
		scrollMargin: scrollMargin ?? containerOffset
	})
	useEffect(() => {
		rowVirtualizer.measure()
	}, [rowVirtualizer, rows.length, containerOffset])
	const virtualItems = rowVirtualizer.getVirtualItems()
	const tableHeaderRef = useRef<HTMLTableSectionElement>(null)
	const stickyHeaderTableRef = useRef<HTMLTableElement>(null)
	const stickyScrollbarRef = useRef<HTMLDivElement>(null)
	const stickyScrollbarContentRef = useRef<HTMLDivElement>(null)
	const [stickyHeaderLayout, setStickyHeaderLayout] = useState<StickyHeaderLayout | null>(null)
	const [leafColumnWidths, setLeafColumnWidths] = useState<Array<number>>([])
	const visibleLeafColumns = instance
		.getVisibleLeafColumns()
		.filter((column) => !isGroupingColumn(column.id) && !column.columnDef.meta?.hidden)
	const firstColumn = visibleLeafColumns[0]
	const firstColumnId = firstColumn?.id
	const isChainPage =
		router.pathname === '/' || router.pathname.startsWith('/chain') || router.pathname.startsWith('/protocols')

	const headerGroups = instance.getHeaderGroups()
	const rowSpannedHeaderIds = new Set<string>()
	for (const headerGroup of headerGroups) {
		for (const header of headerGroup.headers) {
			if (header.isPlaceholder && header.subHeaders.length === 1 && header.subHeaders[0].colSpan === 1) {
				rowSpannedHeaderIds.add(header.subHeaders[0].id)
			}
		}
	}

	const hasNoVisibleColumns = visibleLeafColumns.length === 0

	// useEffectEvent for keyboard handler - reads skipVirtualization without re-subscribing
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if (!skipVirtualization && (e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
			toast.error("Native browser search isn't well supported, please use search boxes / ctrl-k / cmd-k instead", {
				id: 'native-search-warn',
				icon: <Icon name="alert-triangle" color="red" height={16} width={16} style={{ flexShrink: 0 }} />
			})
		}
	})

	useEffect(() => {
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const updateStickyHeader = useEffectEvent((tableWrapperEl: HTMLElement) => {
		const tableHeader = tableHeaderRef.current
		if (!useStickyHeader || skipVirtualization || !tableHeader) {
			setStickyHeaderLayout(null)
			return
		}

		const tableRect = tableWrapperEl.getBoundingClientRect()
		const headerRect = tableHeader.getBoundingClientRect()
		const shouldShowStickyHeader = tableRect.top <= 0 && tableRect.bottom > headerRect.height

		if (!shouldShowStickyHeader) {
			setStickyHeaderLayout(null)
			return
		}

		const widthsByColumnId = new Map<string, number>()
		const leafHeaderCells = tableHeader.querySelectorAll<HTMLTableCellElement>('th[data-leaf-column-id]')
		for (const cell of leafHeaderCells) {
			const columnId = cell.dataset.leafColumnId
			if (columnId) {
				widthsByColumnId.set(columnId, cell.getBoundingClientRect().width)
			}
		}

		const nextLeafColumnWidths: Array<number> = []
		for (const column of visibleLeafColumns) {
			nextLeafColumnWidths.push(widthsByColumnId.get(column.id) ?? 0)
		}

		setLeafColumnWidths((prev) => (areNumberArraysEqual(prev, nextLeafColumnWidths) ? prev : nextLeafColumnWidths))

		const nextLayout = {
			left: tableRect.left,
			width: tableWrapperEl.offsetWidth,
			tableWidth: tableWrapperEl.scrollWidth,
			headerHeight: headerRect.height,
			scrollLeft: tableWrapperEl.scrollLeft
		}

		setStickyHeaderLayout((prev) => (isSameStickyHeaderLayout(prev, nextLayout) ? prev : nextLayout))
	})

	// useEffectEvent for table scroll - reads skipVirtualization without re-subscribing
	const onTableScroll = useEffectEvent((tableWrapperEl: HTMLElement, isMobile: boolean) => {
		if (stickyHeaderTableRef.current) {
			stickyHeaderTableRef.current.style.setProperty('--vf-header-scroll-left', `${tableWrapperEl.scrollLeft}px`)
		}

		// Sync sticky scrollbar (desktop only)
		if (!isMobile && stickyScrollbarRef.current) {
			stickyScrollbarRef.current.scrollLeft = tableWrapperEl.scrollLeft
		}
	})

	// Consolidated scroll/resize handlers with RAF optimization
	useEffect(() => {
		const tableWrapperEl = tableContainerRef.current
		if (!tableWrapperEl) return

		const isMobile = isSmallScreen || 'ontouchstart' in window
		const stickyScrollbar = stickyScrollbarRef.current // Capture ref value for cleanup
		let scrollRaf: number | null = null
		let resizeTimeout: ReturnType<typeof setTimeout>
		let windowScrollRaf: number | null = null

		// Handle table wrapper scroll (horizontal sync)
		const handleTableScroll = () => {
			if (scrollRaf) return // Already scheduled

			scrollRaf = requestAnimationFrame(() => {
				scrollRaf = null
				onTableScroll(tableWrapperEl, isMobile)
			})
		}

		// Handle window scroll (sticky header + sticky scrollbar visibility)
		const handleWindowScroll = () => {
			if (windowScrollRaf) return // Already scheduled

			windowScrollRaf = requestAnimationFrame(() => {
				windowScrollRaf = null
				updateStickyHeader(tableWrapperEl)

				// Update sticky scrollbar visibility (desktop only)
				if (!isMobile && stickyScrollbarRef.current && stickyScrollbarContentRef.current) {
					const tableRect = tableWrapperEl.getBoundingClientRect()
					const hasHorizontalScroll = tableWrapperEl.scrollWidth > tableWrapperEl.clientWidth
					const isTableAboveViewport = tableRect.bottom > window.innerHeight
					const isTableBelowViewport = tableRect.top > window.innerHeight

					if (hasHorizontalScroll && isTableAboveViewport && !isTableBelowViewport) {
						// Batch DOM reads first
						const scrollbarWidth = tableWrapperEl.offsetWidth
						const scrollbarLeft = tableRect.left
						const contentWidth = tableWrapperEl.scrollWidth

						// Batch DOM writes using cssText for single reflow
						stickyScrollbarRef.current.style.cssText = `
							position: fixed;
							bottom: 0;
							height: 12px;
							overflow-x: auto;
							overflow-y: hidden;
							z-index: 999;
							background-color: var(--cards-bg);
							display: block;
							width: ${scrollbarWidth}px;
							left: ${scrollbarLeft}px;
						`
						stickyScrollbarContentRef.current.style.cssText = `height: 1px; width: ${contentWidth}px;`
					} else {
						stickyScrollbarRef.current.style.cssText = `
							position: fixed;
							bottom: 0;
							height: 12px;
							overflow-x: auto;
							overflow-y: hidden;
							z-index: 999;
							background-color: var(--cards-bg);
							display: none;
						`
					}
				}
			})
		}

		// Handle resize with debounce
		const handleResize = () => {
			clearTimeout(resizeTimeout)
			resizeTimeout = setTimeout(() => {
				handleWindowScroll() // Update sticky scrollbar on resize
			}, 100) // Increased to 100ms for better performance
		}

		// Handle sticky scrollbar scroll (desktop only)
		const handleStickyScroll = () => {
			if (!isMobile && stickyScrollbarRef.current) {
				tableWrapperEl.scrollLeft = stickyScrollbarRef.current.scrollLeft
			}
		}

		// Add event listeners with passive flag for better performance
		tableWrapperEl.addEventListener('scroll', handleTableScroll, { passive: true })
		window.addEventListener('scroll', handleWindowScroll, { passive: true })
		window.addEventListener('resize', handleResize, { passive: true })

		handleWindowScroll()

		if (!isMobile && stickyScrollbar) {
			stickyScrollbar.addEventListener('scroll', handleStickyScroll, { passive: true })
		}

		return () => {
			if (scrollRaf) cancelAnimationFrame(scrollRaf)
			if (windowScrollRaf) cancelAnimationFrame(windowScrollRaf)
			clearTimeout(resizeTimeout)

			tableWrapperEl.removeEventListener('scroll', handleTableScroll)
			window.removeEventListener('scroll', handleWindowScroll)
			window.removeEventListener('resize', handleResize)

			if (!isMobile && stickyScrollbar) {
				stickyScrollbar.removeEventListener('scroll', handleStickyScroll)
			}
		}
	}, [rows.length, isSmallScreen, headerGroups.length, visibleLeafColumns.length, skipVirtualization, useStickyHeader])

	if (hasNoVisibleColumns) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-md bg-(--cards-bg) p-8 text-center">
				<Icon name="eye-off" height={48} width={48} className="text-(--text-tertiary)" />
				<div className="flex flex-col gap-2">
					<h3 className="text-lg font-semibold text-(--text-primary)">No columns selected</h3>
					<p className="text-sm text-(--text-secondary)">
						Please select at least one column from the Columns menu to view the table data.
					</p>
				</div>
			</div>
		)
	}

	const rowScrollMargin = rowVirtualizer.options.scrollMargin
	const firstVirtualItem = virtualItems[0]
	const lastVirtualItem = virtualItems[virtualItems.length - 1]
	const topSpacerHeight =
		!skipVirtualization && firstVirtualItem ? Math.max(0, firstVirtualItem.start - rowScrollMargin) : 0
	const bottomSpacerHeight =
		!skipVirtualization && lastVirtualItem
			? Math.max(0, rowVirtualizer.getTotalSize() - (lastVirtualItem.end - rowScrollMargin))
			: 0

	const renderHeaderRows = ({ isStickyMirror = false }: { isStickyMirror?: boolean } = {}) =>
		headerGroups.map((headerGroup) => {
			const headers = headerGroup.headers.filter(
				(header) => !rowSpannedHeaderIds.has(header.id) && !header.column.columnDef.meta?.hidden
			)
			if (!headers.length) {
				return null
			}
			return (
				<tr key={headerGroup.id}>
					{headers.map((header) => {
						const rowSpannedHeader =
							header.isPlaceholder && header.subHeaders.length === 1 && header.subHeaders[0].colSpan === 1
								? header.subHeaders[0]
								: null
						const headerToRender = rowSpannedHeader ?? header
						const meta = headerToRender.column.columnDef.meta
						const value = flexRender(headerToRender.column.columnDef.header, headerToRender.getContext())
						const isSticky = headerToRender.column.id === firstColumnId
						const isRepeatedLeafHeader = header.isPlaceholder && !rowSpannedHeader && header.subHeaders.length === 0
						const isLastHeaderRow = headerGroup.depth === headerGroups.length - 1
						const isGroupedChildHeader = headerGroup.depth > 0 && !isRepeatedLeafHeader
						const isLeafHeader = headerToRender.subHeaders.length === 0
						const isTopGroupedHeader = headerGroup.depth === 0 && headerGroups.length > 1

						return (
							<th
								key={header.id}
								colSpan={rowSpannedHeader ? 1 : header.colSpan}
								rowSpan={rowSpannedHeader ? headerGroups.length - headerGroup.depth : undefined}
								data-chainpage={isChainPage}
								data-align={meta?.align ?? 'start'}
								data-leaf-column-id={isLeafHeader ? headerToRender.column.id : undefined}
								style={{
									position: isSticky ? 'sticky' : undefined,
									left: isSticky ? 0 : undefined,
									transform:
										isStickyMirror && !isSticky
											? 'translateX(calc(var(--vf-header-scroll-left, 0px) * -1))'
											: undefined,
									zIndex: isSticky ? 20 : undefined,
									background: 'var(--cards-bg)',
									borderRightColor: isSticky ? 'transparent' : undefined,
									boxShadow: isSticky && !compact ? '-1px 0 0 0 var(--divider) inset' : undefined
								}}
								className={`overflow-hidden border-r border-(--divider) p-3 text-ellipsis whitespace-nowrap last:border-r-0 ${
									rowSpannedHeader || headerGroup.depth === 0 || isGroupedChildHeader ? 'border-t' : ''
								} ${rowSpannedHeader || isLastHeaderRow ? 'border-b' : ''} ${
									compact ? 'h-[50px] border-r-0 border-t-black/10 px-5 dark:border-t-white/10' : ''
								} ${isRepeatedLeafHeader ? 'p-0' : ''} ${isLeafHeader ? (meta?.headerClassName ?? '') : ''}`}
							>
								{isRepeatedLeafHeader ? null : (
									<span
										className="relative flex w-full flex-nowrap items-center justify-start gap-1 font-medium *:whitespace-nowrap data-[align=center]:justify-center data-[align=end]:justify-end"
										data-align={meta?.align ?? (isTopGroupedHeader ? 'center' : 'start')}
									>
										<HeaderWithTooltip
											content={meta?.headerHelperText}
											onClick={
												!headerToRender.isPlaceholder && headerToRender.column.getCanSort()
													? () => React.startTransition(() => headerToRender.column.toggleSorting())
													: null
											}
											tabIndex={isStickyMirror ? -1 : undefined}
										>
											{headerToRender.isPlaceholder ? null : value}
											{!headerToRender.isPlaceholder && headerToRender.column.getCanSort() ? (
												<SortIcon dir={headerToRender.column.getIsSorted()} />
											) : null}
										</HeaderWithTooltip>
									</span>
								)}
							</th>
						)
					})}
				</tr>
			)
		})

	return (
		<>
			<div
				{...props}
				ref={tableContainerRef}
				className={clsx(
					'relative isolate thin-scrollbar w-full overflow-x-auto overflow-y-visible overscroll-x-contain rounded-md bg-(--cards-bg)',
					className
				)}
				style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch', ...style }}
			>
				<table
					style={{
						width: '100%',
						minWidth: '100%',
						tableLayout: 'fixed',
						borderCollapse: 'separate',
						borderSpacing: 0
					}}
				>
					<colgroup>
						{visibleLeafColumns.map((column) => (
							<col key={column.id} className={column.columnDef.meta?.headerClassName} />
						))}
					</colgroup>

					<thead ref={tableHeaderRef} style={{ display: 'table-header-group', zIndex: 10 }}>
						{renderHeaderRows()}
					</thead>

					<tbody
						className="vf-row-counter"
						style={{ ['--vf-row-offset' as string]: skipVirtualization ? '0' : `${virtualItems?.[0]?.index ?? 0}` }}
					>
						{skipVirtualization ? (
							rows.map((row, i) => (
								<TableRow
									key={row.id}
									row={row}
									index={i}
									subRowOrdinalById={subRowOrdinalById}
									firstColumnId={firstColumnId}
									stripedBg={stripedBg}
									isChainPage={isChainPage}
									compact={compact}
								/>
							))
						) : (
							<>
								{topSpacerHeight > 0 ? (
									<tr aria-hidden="true">
										<td
											colSpan={visibleLeafColumns.length}
											className="border-0 p-0"
											style={{ height: `${topSpacerHeight}px` }}
										/>
									</tr>
								) : null}
								{virtualItems.map((virtualRow) => (
									<TableRow
										key={rows[virtualRow.index].id}
										row={rows[virtualRow.index]}
										index={virtualRow.index}
										virtualRow={virtualRow}
										subRowOrdinalById={subRowOrdinalById}
										firstColumnId={firstColumnId}
										stripedBg={stripedBg}
										isChainPage={isChainPage}
										compact={compact}
									/>
								))}
								{bottomSpacerHeight > 0 ? (
									<tr aria-hidden="true">
										<td
											colSpan={visibleLeafColumns.length}
											className="border-0 p-0"
											style={{ height: `${bottomSpacerHeight}px` }}
										/>
									</tr>
								) : null}
							</>
						)}
					</tbody>
				</table>

				{stickyHeaderLayout ? (
					<div
						aria-hidden="true"
						className="overflow-hidden bg-(--cards-bg)"
						style={{
							position: 'fixed',
							top: 0,
							left: stickyHeaderLayout.left,
							width: stickyHeaderLayout.width,
							height: stickyHeaderLayout.headerHeight,
							zIndex: 998
						}}
					>
						<table
							ref={stickyHeaderTableRef}
							style={{
								width: `${stickyHeaderLayout.tableWidth}px`,
								minWidth: `${stickyHeaderLayout.tableWidth}px`,
								tableLayout: 'fixed',
								borderCollapse: 'separate',
								borderSpacing: 0,
								['--vf-header-scroll-left' as string]: `${stickyHeaderLayout.scrollLeft}px`
							}}
						>
							<colgroup>
								{visibleLeafColumns.map((column, index) => (
									<col
										key={column.id}
										className={column.columnDef.meta?.headerClassName}
										style={leafColumnWidths[index] ? { width: `${leafColumnWidths[index]}px` } : undefined}
									/>
								))}
							</colgroup>
							<thead style={{ display: 'table-header-group', zIndex: 10 }}>
								{renderHeaderRows({ isStickyMirror: true })}
							</thead>
						</table>
					</div>
				) : null}

				{/* Sticky horizontal scrollbar */}
				<div
					ref={stickyScrollbarRef}
					className="thin-scrollbar"
					style={{
						position: 'fixed',
						bottom: 0,
						height: '12px',
						overflowX: 'auto',
						overflowY: 'hidden',
						zIndex: 999,
						display: 'none',
						backgroundColor: 'var(--cards-bg)'
					}}
				>
					<div ref={stickyScrollbarContentRef} style={{ height: '1px' }} />
				</div>
			</div>
		</>
	)
}

const HeaderWithTooltip = ({
	children,
	content,
	onClick,
	tabIndex
}: {
	children: React.ReactNode
	content?: string
	onClick: (() => void) | null
	tabIndex?: number
}) => {
	if (onClick) {
		if (!content)
			return (
				<button type="button" tabIndex={tabIndex} onClick={onClick} className="flex items-center gap-1">
					{children}
				</button>
			)
		return (
			<Tooltip
				content={content}
				className="underline decoration-dotted"
				render={<button type="button" tabIndex={tabIndex} className="flex items-center gap-1" />}
				onClick={onClick}
			>
				{children}
			</Tooltip>
		)
	}
	if (!content) return children
	return (
		<Tooltip content={content} className="underline decoration-dotted">
			{children}
		</Tooltip>
	)
}
