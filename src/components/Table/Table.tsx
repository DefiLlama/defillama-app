import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { SortIcon } from '~/components/Table/SortIcon'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import { WindowVirtualizer } from 'virtua'
import { useIsClient } from '~/hooks'

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

	const tableContainerRef = React.useRef<HTMLTableSectionElement>(null)

	const { rows } = instance.getRowModel()

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if (!skipVirtualization && (e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
				toast.error("Native browser search isn't well supported, please use search boxes / ctrl-k / cmd-k instead", {
					id: 'native-search-warn',
					icon: <Icon name="alert-triangle" color="red" height={16} width={16} className="flex-shrink-0" />
				})
			}
		}

		window.addEventListener('keydown', focusSearchBar)

		return () => window.removeEventListener('keydown', focusSearchBar)
	}, [])

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

			if (tableHeaderRef.current && tableHeaderDuplicate) {
				if (!skipVirtualization && tableWrapperEl && tableWrapperEl.getBoundingClientRect().top <= 20) {
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
		}

		window.addEventListener('scroll', onScroll)

		return () => window.removeEventListener('scroll', onScroll)
	}, [skipVirtualization, instance])

	React.useEffect(() => {
		const tableWrapperEl = document.getElementById('table-wrapper')

		const onScroll = () => {
			if (tableHeaderRef.current) {
				if (!skipVirtualization) {
					tableHeaderRef.current.scrollLeft = tableWrapperEl.scrollLeft
				} else {
					tableHeaderRef.current.scrollLeft = 0
				}
			}
		}

		tableWrapperEl.addEventListener('scroll', onScroll)

		return () => tableWrapperEl.removeEventListener('scroll', onScroll)
	}, [skipVirtualization])

	const isClient = useIsClient()

	const skipVzn = isClient ? !skipVirtualization : true

	return (
		<div
			style={{ minHeight: `${(rowSize ?? 50) * rows.length}px` }}
			{...props}
			ref={tableContainerRef}
			id="table-wrapper"
			data-chainpage={isChainPage}
			className="isolate relative w-full max-w-[calc(100vw-32px)] rounded-md lg:max-w-[calc(100vw-276px)] overflow-x-auto mx-auto text-[var(--text1)] bg-[var(--bg8)] data-[chainpage=true]:bg-[var(--bg6)] border border-[var(--bg3)]"
		>
			<div ref={tableHeaderRef} id="table-header" className="flex flex-col z-10">
				{instance.getHeaderGroups().map((headerGroup) => (
					<div key={headerGroup.id} className="flex relative">
						{headerGroup.headers.map((header) => {
							// get header text alignment
							const meta = header.column.columnDef.meta
							const value = flexRender(header.column.columnDef.header, header.getContext())

							return (
								<div
									key={header.id}
									data-chainpage={isChainPage}
									style={{ minWidth: `${header.getSize() ?? 100}px` }}
									className="flex-1 flex-shrink-0 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[lighter=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] data-[chainpage=true]:bg-[var(--bg6)] first:sticky first:left-0 first:z-[1]"
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
			<TableBodyWrapper skipVirtualization={skipVzn}>
				{(isClient ? rows : rows.slice(0, 20)).map((row, i) => {
					return (
						<React.Fragment key={row.id}>
							<TableRow skipVirtualization={skipVzn}>
								{row.getVisibleCells().map((cell) => {
									// get header text alignment
									const textAlign = cell.column.columnDef.meta?.align ?? 'start'

									return (
										<div
											key={cell.id}
											data-lighter={stripedBg && i % 2 === 0}
											data-chainpage={isChainPage}
											className="flex-1 flex-shrink-0 p-3 whitespace-nowrap overflow-hidden text-ellipsis bg-[var(--bg8)] dark:data-[lighter=true]:bg-[#1c1d22] border-b border-r border-[var(--divider)] data-[chainpage=true]:bg-[var(--bg6)] first:sticky first:left-0 first:z-[1]"
											style={{ minWidth: `${cell.column.getSize() ?? 100}px`, textAlign }}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</div>
									)
								})}
							</TableRow>
							{renderSubComponent && row.getIsExpanded() && (
								<TableRow skipVirtualization={skipVzn}>{renderSubComponent({ row })}</TableRow>
							)}
						</React.Fragment>
					)
				})}
			</TableBodyWrapper>
		</div>
	)
}

const TableBodyWrapper = ({
	children,
	skipVirtualization
}: {
	children: React.ReactNode
	skipVirtualization: boolean
}) => {
	if (skipVirtualization) {
		return <>{children}</>
	}

	return (
		<div className="*:*:flex *:*:relative">
			<WindowVirtualizer>{children}</WindowVirtualizer>
		</div>
	)
}

const TableRow = ({ children, skipVirtualization }: { children: React.ReactNode; skipVirtualization: boolean }) => {
	if (skipVirtualization) {
		return <div className="flex relative">{children}</div>
	}

	return <>{children}</>
}
