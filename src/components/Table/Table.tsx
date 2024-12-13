import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { SortIcon } from '~/components/Table/SortIcon'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
	rowSize?: number
	columnResizeMode?: 'onChange' | 'onEnd'
	renderSubComponent?: ({ row }: { row: any }) => JSX.Element
	stripedBg?: boolean
	style?: React.CSSProperties
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end'
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
	...props
}: ITableProps) {
	const router = useRouter()
	const [tableTop, setTableTop] = React.useState(0)
	const tableContainerRef = React.useRef<HTMLTableSectionElement>(null)

	const { rows } = instance.getRowModel()

	React.useEffect(() => {
		if (!skipVirtualization && tableContainerRef?.current) {
			setTableTop(tableContainerRef.current.offsetTop)
		}
	}, [skipVirtualization])

	React.useEffect(() => {
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

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => rowSize || 50,
		overscan: 5,
		scrollMargin: tableTop
	})

	const virtualItems = rowVirtualizer.getVirtualItems()
	const isChainPage =
		router.pathname === '/' || router.pathname.startsWith('/chain') || router.pathname.startsWith('/protocols')
	let minTableWidth = 0

	for (const headerGroup of instance.getHeaderGroups()) {
		for (const header of headerGroup.headers) {
			minTableWidth += header.getSize() ?? 0
		}
	}

	const tableHeaderRef = React.useRef<HTMLDivElement>()

	React.useEffect(() => {
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
			} else {
				tableHeaderRef.current.style.position = 'relative'
				tableHeaderRef.current.style['overflow-x'] = 'initial'
				tableHeaderDuplicate.style.height = '0px'
			}
		}

		window.addEventListener('scroll', onScroll)

		return () => window.removeEventListener('scroll', onScroll)
	}, [skipVirtualization, instance])

	React.useEffect(() => {
		const tableWrapperEl = document.getElementById('table-wrapper')

		const onScroll = () => {
			if (!skipVirtualization && tableHeaderRef.current) {
				tableHeaderRef.current.scrollLeft = tableWrapperEl.scrollLeft
			} else {
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
			className="isolate relative w-full max-w-[calc(100vw-32px)] rounded-md lg:max-w-[calc(100vw-276px)] overflow-x-auto mx-auto text-[var(--text1)] bg-[var(--bg8)] border border-[var(--bg3)]"
		>
			<div
				ref={tableHeaderRef}
				id="table-header"
				style={{
					display: 'flex',
					flexDirection: 'column',
					zIndex: 10,
					...(skipVirtualization ? { minWidth: `${minTableWidth}px` } : {})
				}}
			>
				{instance.getHeaderGroups().map((headerGroup) => (
					<div key={headerGroup.id} style={{ display: 'flex', position: 'relative' }}>
						{headerGroup.headers.map((header) => {
							// get header text alignment
							const meta = header.column.columnDef.meta
							const value = flexRender(header.column.columnDef.header, header.getContext())

							return (
								<div
									key={header.id}
									data-chainpage={isChainPage}
									style={{ minWidth: `${header.getSize() ?? 100}px` }}
									className="flex-1 flex-shrink-0 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] data-[chainpage=true]:bg-[var(--bg6)] first:sticky first:left-0 first:z-[1]"
								>
									<span
										className="flex items-center justify-start data-[align=center]:justify-center data-[align=end]:justify-end flex-nowrap gap-1 relative font-medium *:whitespace-nowrap"
										data-align={
											meta?.align ??
											(headerGroup.depth === 0 && instance.getHeaderGroups().length > 1 ? 'center' : 'start')
										}
									>
										{header.isPlaceholder ? null : (
											<>
												{header.column.getCanSort() ? (
													<button onClick={() => header.column.toggleSorting()}>{value}</button>
												) : (
													value
												)}
											</>
										)}
										{meta?.headerHelperText && <QuestionHelper text={meta?.headerHelperText} />}
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
						? { minWidth: `${minTableWidth}px` }
						: {
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: '100%',
								position: 'relative',
								...(instance.getHeaderGroups().length === 1 ? { minWidth: `${minTableWidth}px` } : {})
						  }
				}
			>
				{(skipVirtualization ? rows : virtualItems).map((row, i) => {
					const rowTorender = skipVirtualization ? row : rows[row.index]
					const trStyle: React.CSSProperties = skipVirtualization
						? {
								display: 'flex',
								position: 'relative'
						  }
						: {
								position: 'absolute',
								top: `${row.start - rowVirtualizer.options.scrollMargin}px`,
								left: 0,
								width: '100%',
								height: `${row.size}px`,
								opacity: rowTorender.original.disabled ? 0.3 : 1,
								display: 'flex'
						  }

					return (
						<React.Fragment key={rowTorender.id}>
							<div style={trStyle}>
								{rowTorender.getVisibleCells().map((cell) => {
									// get header text alignment
									const textAlign = cell.column.columnDef.meta?.align ?? 'start'

									return (
										<div
											key={cell.id}
											data-ligther={stripedBg && i % 2 === 0}
											data-chainpage={isChainPage}
											className="flex-1 flex-shrink-0 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[ligther=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] data-[chainpage=true]:bg-[var(--bg6)] first:sticky first:left-0 first:z-[1]"
											style={{ minWidth: `${cell.column.getSize() ?? 100}px`, textAlign }}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</div>
									)
								})}
							</div>
							{renderSubComponent && rowTorender.getIsExpanded() && (
								<>
									<div>{renderSubComponent({ row: rowTorender })}</div>
								</>
							)}
						</React.Fragment>
					)
				})}
			</div>
		</div>
	)
}
