import * as React from 'react'
import { useRef } from 'react'
import type { Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SortIcon } from '~/components/Table/SortIcon'
import { Tooltip } from '~/components/Tooltip'
import type { NormalizedRow } from '../types'

interface UnifiedVirtualTableProps {
	table: Table<NormalizedRow>
	rowSize?: number
	stripedBg?: boolean
	compact?: boolean
}

export function UnifiedVirtualTable({
	table,
	rowSize = 50,
	stripedBg = false,
	compact = false
}: UnifiedVirtualTableProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const { rows } = table.getRowModel()

	const isGroupingColumn = (columnId?: string) => typeof columnId === 'string' && columnId.startsWith('__group_')
	const visibleLeafColumns = table.getVisibleLeafColumns().filter((column) => !isGroupingColumn(column.id))
	const gridTemplateColumns =
		visibleLeafColumns.map((column) => `minmax(${column.getSize() ?? 100}px, 1fr)`).join(' ') || '1fr'

	const firstColumn = visibleLeafColumns[0]
	const firstColumnId = firstColumn?.id
	const totalTableWidth = table.getTotalSize()

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => containerRef.current,
		estimateSize: () => rowSize,
		overscan: 5
	})

	const virtualItems = rowVirtualizer.getVirtualItems()

	return (
		<div
			ref={containerRef}
			className="thin-scrollbar relative isolate w-full overflow-auto rounded-md bg-(--cards-bg)"
			style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}
		>
			<div
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 10,
					display: 'flex',
					flexDirection: 'column',
					background: 'var(--cards-bg)'
				}}
			>
				{table.getHeaderGroups().map((headerGroup) => {
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
								const isSticky = header.column.id === firstColumnId

								return (
									<div
										key={header.id}
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
												(headerGroup.depth === 0 && table.getHeaderGroups().length > 1 ? 'center' : 'start')
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

			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					width: '100%',
					position: 'relative'
				}}
			>
				{virtualItems.map((virtualRow, i) => {
					const row = rows[virtualRow.index]
					const trStyle: React.CSSProperties = {
						display: 'grid',
						gridTemplateColumns,
						minWidth: `${totalTableWidth}px`,
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: `${virtualRow.size}px`,
						opacity: ((row.original as { disabled?: boolean } | undefined)?.disabled ? 0.3 : 1),
						transform: `translateY(${virtualRow.start}px)`
					}

					return (
						<div key={row.id} style={trStyle}>
							{row
								.getVisibleCells()
								.filter((cell) => !cell.column.columnDef.meta?.hidden)
								.map((cell) => {
									const textAlign = cell.column.columnDef.meta?.align ?? 'start'
									const isSticky = cell.column.id === firstColumnId
									return (
										<div
											key={cell.id}
											data-ligther={stripedBg && i % 2 === 0}
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
					)
				})}
			</div>
		</div>
	)
}

interface HeaderWithTooltipProps {
	children: React.ReactNode
	content?: string
	onClick?: () => void | null
}

const HeaderWithTooltip = ({ children, content, onClick }: HeaderWithTooltipProps) => {
	if (onClick) {
		if (!content) return <button onClick={onClick}>{children}</button>
		return (
			<Tooltip content={content} className="underline decoration-dotted" render={<button />} onClick={onClick}>
				{children}
			</Tooltip>
		)
	}
	if (!content) return <>{children}</>
	return (
		<Tooltip content={content} className="underline decoration-dotted">
			{children}
		</Tooltip>
	)
}
