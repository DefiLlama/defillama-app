import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import SortIcon from './SortIcon'
import QuestionHelper from '../QuestionHelper'
import { useRouter } from 'next/router'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
	rowSize?: number
	columnResizeMode?: 'onChange' | 'onEnd'
	renderSubComponent?: ({ row }: { row: any }) => JSX.Element
	cellStyles?: React.CSSProperties
	stripedBg?: boolean
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end'
		headerHelperText?: string
	}
}

export default function VirtualTable({
	instance,
	skipVirtualization,
	columnResizeMode,
	rowSize,
	renderSubComponent,
	cellStyles = {},
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
		if (!skipVirtualization) {
		}
	}, [skipVirtualization])

	React.useEffect(() => {
		function focusSearchBar(e: KeyboardEvent) {
			if (!skipVirtualization && (e.ctrlKey || e.metaKey) && e.code === 'KeyF') {
				e.preventDefault()
				window.alert("Native browser search isn't supported, please use search boxes instead")
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
	return (
		<Wrapper ref={tableContainerRef} {...props}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
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
								<Cell key={header.id} data-chainpage={isChainPage} style={{ minWidth: `${header.getSize() ?? 100}px` }}>
									<TableHeader
										align={
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
										{meta?.headerHelperText && <Helper text={meta?.headerHelperText} />}
										{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
									</TableHeader>
								</Cell>
							)
						})}
					</div>
				))}
			</div>
			<div
				style={
					skipVirtualization
						? { minWidth: `${minTableWidth}px` }
						: {
								height: `${rowVirtualizer.getTotalSize()}px`,
								width: '100%',
								position: 'relative'
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
										<Cell
											ligther={stripedBg && i % 2 === 0}
											key={cell.id}
											data-chainpage={isChainPage}
											style={{ minWidth: `${cell.column.getSize() ?? 100}px`, textAlign, ...(cellStyles || {}) }}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</Cell>
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
		</Wrapper>
	)
}

export const Wrapper = styled.div`
	position: relative;
	width: 100%;
	max-width: calc(100vw - 32px);
	color: ${({ theme }) => theme.text1};
	background-color: ${({ theme }) => theme.background};
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 12px;
	overflow-x: auto;
	margin: 0 auto;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		max-width: calc(100vw - 276px);
	}

	a:hover {
		text-decoration: underline;
	}
`

const Cell = styled.div<{ ligther?: boolean }>`
	flex: 1;
	flex-shrink: 0;
	padding: 12px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	background-color: ${({ theme, ligther }) => (ligther && theme.mode === 'dark' ? '#1c1d22' : theme.background)};
	border-bottom: 1px solid ${({ theme }) => theme.divider};
	border-right: 1px solid ${({ theme }) => theme.divider};
	&[data-chainpage='true'] {
		background-color: ${({ theme }) => theme.bg6};
	}
	&:first-child {
		position: sticky;
		left: 0;
		z-index: 1;
	}
`

interface ITableHeader {
	align: 'start' | 'end' | 'center'
}

const TableHeader = styled.span<ITableHeader>`
	display: flex;
	justify-content: ${({ align }) => (align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start')};
	align-items: center;
	flex-wrap: nowrap;
	gap: 4px;
	font-weight: 500;
	position: relative;

	& > * {
		white-space: nowrap;
	}

	svg {
		flex-shrink: 0;
	}

	button {
		padding: 0;
	}
`

const Helper = styled(QuestionHelper)`
	color: ${({ theme }) => theme.text1};
`
