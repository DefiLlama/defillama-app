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
	renderSubComponent?: ({ row }: { row: any }) => JSX.Element
	stripedBg?: boolean
	style?: React.CSSProperties
	compact?: boolean
	useStickyHeader?: boolean
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end' | 'center'
		headerHelperText?: string
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
	...props
}: ITableProps) {
	const router = useRouter()
	const tableContainerRef = useRef<HTMLTableSectionElement>(null)
	const { rows } = instance.getRowModel()

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => rowSize || 50,
		overscan: 5,
		scrollMargin: tableContainerRef.current?.offsetTop ?? 0
	})
	const virtualItems = rowVirtualizer.getVirtualItems()
	const tableHeaderRef = useRef<HTMLDivElement>(null)
	const firstColumn = instance.getVisibleLeafColumns()[0]
	const firstColumnId = firstColumn?.id
	//const firstColumnWidth = firstColumn?.getSize() || 240
	const totalTableWidth = instance.getTotalSize()
	const isChainPage =
		router.pathname === '/' || router.pathname.startsWith('/chain') || router.pathname.startsWith('/protocols')

	const gridTemplateColumns =
		instance
			.getHeaderGroups()
			.at(-1)
			?.headers.map((header) => `minmax(${header.getSize() ?? 100}px, 1fr)`) // force consistency
			.join(' ') || '1fr'

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
			tableHeaderRef.current.style.position = 'fixed'
			tableHeaderRef.current.style.top = '0px'
			tableHeaderRef.current.style.width = `${tableWrapperEl.offsetWidth}px`
			tableHeaderRef.current.style['overflow-x'] = 'overlay'
			tableHeaderDuplicate.style.height = `${instance.getHeaderGroups().length * 45}px`
			tableHeaderRef.current.scrollLeft = tableWrapperEl.scrollLeft
		} else if (tableHeaderRef.current) {
			tableHeaderRef.current.style.position = 'relative'
			tableHeaderRef.current.style.width = `${tableWrapperEl.offsetWidth}px`
			tableHeaderRef.current.style['overflow-x'] = 'initial'
			tableHeaderDuplicate.style.height = '0px'
		}
	}, [instance, skipVirtualization, useStickyHeader])

	useEffect(() => {
		let resizeTimeout: NodeJS.Timeout

		const handleResize = () => {
			clearTimeout(resizeTimeout)
			resizeTimeout = setTimeout(() => {
				onScrollOrResize()
			}, 50) // 50ms debounce
		}

		window.addEventListener('scroll', onScrollOrResize)
		window.addEventListener('resize', handleResize)
		return () => {
			clearTimeout(resizeTimeout)
			window.removeEventListener('scroll', onScrollOrResize)
			window.removeEventListener('resize', handleResize)
		}
	}, [onScrollOrResize])

	useEffect(() => {
		const tableWrapperEl = document.getElementById('table-wrapper')
		if (!tableWrapperEl) return
		const onScroll = () => {
			if (!skipVirtualization && tableHeaderRef.current && tableWrapperEl) {
				tableHeaderRef.current.scrollLeft = tableWrapperEl.scrollLeft
			} else if (tableHeaderRef.current) {
				tableHeaderRef.current.scrollLeft = 0
			}
		}
		tableWrapperEl.addEventListener('scroll', onScroll)
		return () => tableWrapperEl.removeEventListener('scroll', onScroll)
	}, [skipVirtualization])

	return (
		<div
			{...props}
			ref={tableContainerRef}
			id="table-wrapper"
			className="relative isolate w-full overflow-auto bg-(--cards-bg)"
			style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}
		>
			<div ref={tableHeaderRef} id="table-header" style={{ display: 'flex', flexDirection: 'column', zIndex: 10 }}>
				{instance.getHeaderGroups().map((headerGroup) => (
					<div key={headerGroup.id} style={{ display: 'grid', gridTemplateColumns, minWidth: `${totalTableWidth}px` }}>
						{headerGroup.headers.map((header) => {
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
				))}
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
								{rowTorender.getVisibleCells().map((cell) => {
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
