import * as React from 'react'
import { Table, flexRender, RowData } from '@tanstack/react-table'
import { defaultRangeExtractor, useWindowVirtualizer } from '@tanstack/react-virtual'
import styled from 'styled-components'
import SortIcon from './SortIcon'
import QuestionHelper from '../QuestionHelper'

interface ITableProps {
	instance: Table<any>
	skipVirtualization?: boolean
}

declare module '@tanstack/table-core' {
	interface ColumnMeta<TData extends RowData, TValue> {
		align?: 'start' | 'end'
		headerHelperText?: string
	}
}

export default function VirtualTable({ instance, skipVirtualization, ...props }: ITableProps) {
	const [tableTop, setTableTop] = React.useState(0)
	const tableContainerRef = React.useRef<HTMLTableSectionElement>(null)

	const { rows } = instance.getRowModel()

	React.useEffect(() => {
		if (tableContainerRef?.current) {
			setTableTop(tableContainerRef.current.offsetTop)
		}
	}, [])

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => 50,
		overscan: 20,
		rangeExtractor: React.useCallback(
			(range) => {
				if (!tableTop) {
					return defaultRangeExtractor(range)
				}

				const cutoff = tableTop / 40

				let startIndex = range.startIndex

				if (range.startIndex <= cutoff) {
					startIndex = 1
				}

				if (range.startIndex - cutoff > 0) {
					startIndex = range.startIndex - Math.round(cutoff)
				}

				return defaultRangeExtractor({ ...range, startIndex })
			},
			[tableTop]
		)
	})

	const virtualItems = rowVirtualizer.getVirtualItems()

	const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0

	const paddingBottom =
		virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0

	return (
		<Wrapper ref={tableContainerRef} {...props}>
			<table>
				<thead>
					{instance.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								// get header text alignment
								const meta = header.column.columnDef.meta
								const value = flexRender(header.column.columnDef.header, header.getContext())

								return (
									<th key={header.id} colSpan={header.colSpan} style={{ width: header.getSize() }}>
										<TableHeader align={meta?.align ?? 'start'}>
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
									</th>
								)
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{paddingTop > 0 && !skipVirtualization && (
						<tr>
							<td style={{ height: `${paddingTop}px` }} />
						</tr>
					)}

					{(skipVirtualization ? rows : virtualItems).map((virtualRow) => {
						const row = rows[virtualRow.index]
						const trStyle: React.CSSProperties = row.original.disabled ? { opacity: 0.3 } : undefined

						return (
							<tr key={row.id} style={trStyle}>
								{row.getVisibleCells().map((cell) => {
									// get header text alignment
									const textAlign = cell.column.columnDef.meta?.align ?? 'start'

									return (
										<td key={cell.id} style={{ width: cell.column.getSize(), textAlign }}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									)
								})}
							</tr>
						)
					})}

					{paddingBottom > 0 && !skipVirtualization && (
						<tr>
							<td style={{ height: `${paddingBottom}px` }} />
						</tr>
					)}
				</tbody>
			</table>
		</Wrapper>
	)
}

const Wrapper = styled.div`
	position: relative;
	width: 100%;
	max-width: calc(100vw - 32px);
	color: ${({ theme }) => theme.text1};
	background-color: ${({ theme }) => theme.background};
	border: 1px solid ${({ theme }) => theme.bg3};
	box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.05);
	border-radius: 12px;
	overflow-x: auto;

	table {
		table-layout: fixed;
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		position: sticky;
		top: 0;
		margin: 0;

		th {
			z-index: 1;

			:first-of-type {
				border-radius: 12px 0 0 0;
			}

			:last-of-type {
				border-radius: 0 12px 0 0;
			}
		}
	}

	tr {
		border-bottom: 1px solid ${({ theme }) => theme.divider};
	}

	th,
	td {
		padding: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		background-color: ${({ theme }) => theme.background};
	}

	tr > *:first-child {
		position: sticky;
		left: 0;
		z-index: 1;
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		max-width: calc(100vw - 276px);
	}
`

interface ITableHeader {
	align: 'start' | 'end'
}

const TableHeader = styled.span<ITableHeader>`
	display: flex;
	justify-content: ${({ align }) => (align === 'end' ? 'flex-end' : 'flex-start')};
	align-items: center;
	flex-wrap: nowrap;
	gap: 4px;
	font-weight: 500;

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
