import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { SortIcon } from '~/components/Table/SortIcon'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { Tooltip } from '../Tooltip'
import { useEffect, useRef } from 'react'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
	rowSize?: number
	columnResizeMode?: 'onChange' | 'onEnd'
	renderSubComponent?: ({ row }: { row: any }) => JSX.Element
	stripedBg?: boolean
	style?: React.CSSProperties
	compact?: boolean
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
	...props
}: ITableProps) {
	const router = useRouter()
	const tableContainerRef = useRef<HTMLTableSectionElement>(null)
	// const [, forceUpdate] = React.useReducer((x) => x + 1, 0)
	const { rows } = instance.getRowModel()
	// React.useEffect(() => {
	// 	if (!tableContainerRef.current) return

	// 	// Handle window resize
	// 	const handleResize = () => {
	// 		forceUpdate()
	// 	}
	// 	window.addEventListener('resize', handleResize)

	// 	// Handle position changes
	// 	const resizeObserver = new ResizeObserver(handleResize)
	// 	const intersectionObserver = new IntersectionObserver(handleResize, { threshold: [0, 1] })

	// 	// Observe the table and its parent elements up to body
	// 	let element: HTMLElement | null = tableContainerRef.current
	// 	while (element && element !== document.body) {
	// 		resizeObserver.observe(element)
	// 		intersectionObserver.observe(element)
	// 		element = element.parentElement
	// 	}

	// 	return () => {
	// 		window.removeEventListener('resize', handleResize)
	// 		resizeObserver.disconnect()
	// 		intersectionObserver.disconnect()
	// 	}
	// }, [])
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
	const firstColumnWidth = firstColumn?.getSize() || 240
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

	useEffect(() => {
		const onScroll = () => {
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
				tableHeaderRef.current.style['overflow-x'] = 'initial'
				tableHeaderDuplicate.style.height = '0px'
			}
		}
		window.addEventListener('scroll', onScroll)
		return () => window.removeEventListener('scroll', onScroll)
	}, [skipVirtualization, instance])

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
										width: isSticky ? `${firstColumnWidth}px` : undefined,
										minWidth: isSticky ? `${firstColumnWidth}px` : undefined,
										zIndex: isSticky ? 10 : undefined,
										background: 'var(--cards-bg)'
									}}
									className={`p-3 whitespace-nowrap overflow-hidden text-ellipsis border-t border-r last:border-r-0 border-(--divider)
                    ${
											compact
												? 'flex items-center px-5 h-[64px] border-t-black/10 dark:border-t-white/10 border-r-transparent'
												: ''
										}`}
								>
									<span
										className="flex items-center justify-start data-[align=center]:justify-center data-[align=end]:justify-end flex-nowrap gap-1 relative font-medium *:whitespace-nowrap"
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
											className={`p-3 whitespace-nowrap overflow-hidden text-ellipsis border-t border-r border-(--divider)
                        ${
													compact
														? 'flex items-center px-5 border-t-black/10 dark:border-t-white/10 border-r-transparent'
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
												width: isSticky ? `${firstColumnWidth}px` : undefined,
												minWidth: isSticky ? `${firstColumnWidth}px` : undefined,
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
