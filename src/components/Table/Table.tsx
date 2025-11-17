import * as React from 'react'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { flexRender, RowData, Table } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { SortIcon } from '~/components/Table/SortIcon'
import { Tooltip } from '../Tooltip'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
	rowSize?: number
	columnResizeMode?: 'onChange' | 'onEnd'
	renderSubComponent?: ({ row }: { row: any }) => React.ReactNode
	stripedBg?: boolean
	style?: React.CSSProperties
	compact?: boolean
	useStickyHeader?: boolean
	scrollMargin?: number
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end' | 'center'
		headerHelperText?: string
		hidden?: boolean
	}
}

export function VirtualTable({
	instance,
	skipVirtualization,
	columnResizeMode,
	rowSize,
	renderSubComponent,
	stripedBg = false,
	compact = false,
	useStickyHeader = true,
	scrollMargin,
	...props
}: ITableProps) {
	const router = useRouter()
	const tableContainerRef = useRef<HTMLTableSectionElement>(null)
	const { rows } = instance.getRowModel()

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => rowSize || 50,
		overscan: 5,
		scrollMargin: scrollMargin ?? tableContainerRef.current?.offsetTop ?? 0
	})
	const virtualItems = rowVirtualizer.getVirtualItems()
	const tableHeaderRef = useRef<HTMLDivElement>(null)
	const stickyScrollbarRef = useRef<HTMLDivElement>(null)
	const stickyScrollbarContentRef = useRef<HTMLDivElement>(null)
	const firstColumn = instance.getVisibleLeafColumns()[0]
	const firstColumnId = firstColumn?.id
	//const firstColumnWidth = firstColumn?.getSize() || 240
	const totalTableWidth = instance.getTotalSize()
	const isChainPage =
		router.pathname === '/' || router.pathname.startsWith('/chain') || router.pathname.startsWith('/protocols')

	const isGroupingColumn = (columnId?: string) => typeof columnId === 'string' && columnId.startsWith('__group_')
	const visibleLeafColumns = instance.getVisibleLeafColumns().filter((column) => !isGroupingColumn(column.id))
	const gridTemplateColumns =
		visibleLeafColumns.map((column) => `minmax(${column.getSize() ?? 100}px, 1fr)`).join(' ') || '1fr'

	useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if (!skipVirtualization && (e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
				toast.error("Native browser search isn't well supported, please use search boxes / ctrl-k / cmd-k instead", {
					id: 'native-search-warn',
					icon: <Icon name="alert-triangle" color="red" height={16} width={16} style={{ flexShrink: 0 }} />
				})
			}
		}
		window.addEventListener('keydown', focusSearchBar)
		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [])

	const onScrollOrResize = React.useCallback(() => {
		if (!useStickyHeader) return

		const tableWrapperEl = document.getElementById('table-wrapper')
		const tableHeaderDuplicate = document.getElementById('table-header-dup')

		if (
			!skipVirtualization &&
			tableHeaderRef.current &&
			tableWrapperEl &&
			tableWrapperEl.getBoundingClientRect().top <= 20 &&
			tableHeaderDuplicate
		) {
			// Batch DOM writes
			const scrollLeft = tableWrapperEl.scrollLeft
			const offsetWidth = tableWrapperEl.offsetWidth
			const headerHeight = instance.getHeaderGroups().length * 45

			tableHeaderRef.current.style.position = 'fixed'
			tableHeaderRef.current.style.top = '0px'
			tableHeaderRef.current.style.width = `${offsetWidth}px`
			tableHeaderRef.current.style['overflow-x'] = 'overlay'
			tableHeaderDuplicate.style.height = `${headerHeight}px`
			tableHeaderRef.current.scrollLeft = scrollLeft
		} else if (tableHeaderRef.current) {
			const offsetWidth = tableWrapperEl?.offsetWidth || 0
			tableHeaderRef.current.style.position = 'relative'
			tableHeaderRef.current.style.width = `${offsetWidth}px`
			tableHeaderRef.current.style['overflow-x'] = 'initial'
			tableHeaderDuplicate.style.height = '0px'
		}
	}, [instance, skipVirtualization, useStickyHeader])

	// Consolidated scroll/resize handlers with RAF optimization
	useEffect(() => {
		const tableWrapperEl = document.getElementById('table-wrapper')
		if (!tableWrapperEl) return

		const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window
		const stickyScrollbar = stickyScrollbarRef.current // Capture ref value for cleanup
		let scrollRaf: number | null = null
		let resizeTimeout: ReturnType<typeof setTimeout>
		let windowScrollRaf: number | null = null

		// Handle table wrapper scroll (horizontal sync)
		const handleTableScroll = () => {
			if (scrollRaf) return // Already scheduled

			scrollRaf = requestAnimationFrame(() => {
				scrollRaf = null
				const scrollLeft = tableWrapperEl.scrollLeft

				// Sync header horizontal scroll
				if (tableHeaderRef.current) {
					if (!skipVirtualization) {
						tableHeaderRef.current.scrollLeft = scrollLeft
					} else {
						tableHeaderRef.current.scrollLeft = 0
					}
				}

				// Sync sticky scrollbar (desktop only)
				if (!isMobile && stickyScrollbarRef.current) {
					stickyScrollbarRef.current.scrollLeft = scrollLeft
				}
			})
		}

		// Handle window scroll (sticky header + sticky scrollbar visibility)
		const handleWindowScroll = () => {
			if (windowScrollRaf) return // Already scheduled

			windowScrollRaf = requestAnimationFrame(() => {
				windowScrollRaf = null

				// Update sticky header
				onScrollOrResize()

				// Update sticky scrollbar visibility (desktop only)
				if (!isMobile && stickyScrollbarRef.current && stickyScrollbarContentRef.current) {
					const tableRect = tableWrapperEl.getBoundingClientRect()
					const hasHorizontalScroll = tableWrapperEl.scrollWidth > tableWrapperEl.clientWidth
					const isTableAboveViewport = tableRect.bottom > window.innerHeight
					const isTableBelowViewport = tableRect.top > window.innerHeight

					if (hasHorizontalScroll && isTableAboveViewport && !isTableBelowViewport) {
						// Batch all DOM writes together
						stickyScrollbarRef.current.style.display = 'block'
						stickyScrollbarRef.current.style.width = `${tableWrapperEl.offsetWidth}px`
						stickyScrollbarRef.current.style.left = `${tableRect.left}px`
						stickyScrollbarContentRef.current.style.width = `${tableWrapperEl.scrollWidth}px`
					} else {
						stickyScrollbarRef.current.style.display = 'none'
					}
				}
			})
		}

		// Handle resize with debounce
		const handleResize = () => {
			clearTimeout(resizeTimeout)
			resizeTimeout = setTimeout(() => {
				onScrollOrResize()
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

		if (!isMobile && stickyScrollbar) {
			stickyScrollbar.addEventListener('scroll', handleStickyScroll, { passive: true })
			// Initial update for sticky scrollbar
			handleWindowScroll()
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
	}, [skipVirtualization, onScrollOrResize, totalTableWidth, rows.length])

	return (
		<div
			{...props}
			ref={tableContainerRef}
			id="table-wrapper"
			className="thin-scrollbar relative isolate w-full overflow-auto rounded-md bg-(--cards-bg)"
			style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}
		>
			<div ref={tableHeaderRef} id="table-header" style={{ display: 'flex', flexDirection: 'column', zIndex: 10 }}>
				{instance.getHeaderGroups().map((headerGroup) => {
					const headers = headerGroup.headers.filter((header) => !header.column.columnDef.meta?.hidden)
					if (!headers.length) {
						return null
					}
					return (
						<div
							key={headerGroup.id}
							style={{ display: 'grid', gridTemplateColumns, minWidth: `${totalTableWidth}px` }}
						>
							{headers.map((header) => {
								const meta = header.column.columnDef.meta
								const value = flexRender(header.column.columnDef.header, header.getContext())
								const isSticky = header.column.id === firstColumnId //first column is sticky

								return (
									<div
										key={header.id}
										data-chainpage={isChainPage}
										data-align={meta?.align ?? 'start'}
										style={{
											gridColumn: `span ${header.colSpan}`,
											position: isSticky ? 'sticky' : undefined,
											left: isSticky ? 0 : undefined,
											zIndex: isSticky ? 10 : undefined,
											background: 'var(--cards-bg)'
										}}
										className={`overflow-hidden border-t border-r border-(--divider) p-3 text-ellipsis whitespace-nowrap last:border-r-0 ${
											compact
												? 'flex min-h-[50px] items-center border-t-black/10 border-r-transparent px-5 dark:border-t-white/10'
												: ''
										}`}
									>
										<span
											className="relative flex w-full flex-nowrap items-center justify-start gap-1 font-medium *:whitespace-nowrap data-[align=center]:justify-center data-[align=end]:justify-end"
											data-align={
												meta?.align ??
												(headerGroup.depth === 0 && instance.getHeaderGroups().length > 1 ? 'center' : 'start')
											}
										>
											{header.isPlaceholder ? null : (
												<HeaderWithTooltip
													content={meta?.headerHelperText}
													onClick={header.column.getCanSort() ? () => header.column.toggleSorting() : null}
												>
													{value}
												</HeaderWithTooltip>
											)}
											{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
										</span>
									</div>
								)
							})}
						</div>
					)
				})}
			</div>

			<div id="table-header-dup"></div>

			<div
				style={
					skipVirtualization
						? undefined
						: { height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }
				}
			>
				{(skipVirtualization ? rows : virtualItems).map((row, i) => {
					const rowTorender = skipVirtualization ? row : rows[row.index]
					const trStyle: React.CSSProperties = {
						display: 'grid',
						gridTemplateColumns,
						minWidth: `${totalTableWidth}px`,
						...(skipVirtualization
							? { position: 'relative' }
							: {
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									height: `${row.size}px`,
									opacity: rowTorender.original.disabled ? 0.3 : 1,
									transform: `translateY(${row.start - rowVirtualizer.options.scrollMargin}px)`
								})
					}

					return (
						<React.Fragment key={rowTorender.id}>
							<div style={trStyle}>
								{rowTorender
									.getVisibleCells()
									.filter((cell) => !cell.column.columnDef.meta?.hidden)
									.map((cell) => {
										const textAlign = cell.column.columnDef.meta?.align ?? 'start'
										const isSticky = cell.column.id === firstColumnId
										return (
											<div
												key={cell.id}
												data-ligther={stripedBg && i % 2 === 0}
												data-chainpage={isChainPage}
												className={`overflow-hidden border-t border-r border-(--divider) p-3 text-ellipsis whitespace-nowrap ${
													compact
														? 'flex items-center border-t-black/10 border-r-transparent px-5 dark:border-t-white/10'
														: ''
												}`}
												style={{
													textAlign,
													justifyContent: compact
														? textAlign === 'center'
															? 'center'
															: textAlign === 'end'
																? 'flex-end'
																: 'flex-start'
														: undefined,
													position: isSticky ? 'sticky' : undefined,
													left: isSticky ? 0 : undefined,
													zIndex: isSticky ? 1 : undefined,
													background: isSticky ? 'var(--cards-bg)' : undefined
												}}
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</div>
										)
									})}
							</div>
							{renderSubComponent && rowTorender.getIsExpanded() && (
								<div>{renderSubComponent({ row: rowTorender })}</div>
							)}
						</React.Fragment>
					)
				})}
			</div>

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
	)
}

const HeaderWithTooltip = ({ children, content, onClick }) => {
	if (onClick) {
		if (!content) return <button onClick={onClick}>{children}</button>
		return (
			<Tooltip content={content} className="underline decoration-dotted" render={<button />} onClick={onClick}>
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
