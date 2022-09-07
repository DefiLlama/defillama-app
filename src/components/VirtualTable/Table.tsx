import * as React from 'react'
import { Table, flexRender } from '@tanstack/react-table'
import { defaultRangeExtractor, useWindowVirtualizer } from '@tanstack/react-virtual'
import SortIcon from './SortIcon'
import styled from 'styled-components'

interface ITableProps {
	instance: Table<any>
}

export default function VirtualTable({ instance }: ITableProps) {
	const tableContainerRef = React.useRef<HTMLDivElement>(null)

	const { rows } = instance.getRowModel()

	const rowVirtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => 40,
		rangeExtractor: React.useCallback((range) => {
			let startIndex = range.startIndex

			if (range.startIndex <= 5) {
				startIndex = 1
			}

			if (range.startIndex - 5 > 0) {
				startIndex = range.startIndex - 5
			}

			// console.log(defaultRangeExtractor(range))
			return defaultRangeExtractor({ ...range, startIndex })
		}, [])
	})

	const virtualItems = rowVirtualizer.getVirtualItems()

	const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0

	const paddingBottom =
		virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0

	return (
		<Wrapper ref={tableContainerRef}>
			<table>
				<thead>
					{instance.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<th
										key={header.id}
										colSpan={header.colSpan}
										style={{ width: header.getSize(), position: 'sticky', top: 0 }}
									>
										{header.isPlaceholder ? null : (
											<TableHeader
												canSort={header.column.getCanSort()}
												onClick={() => header.column.getToggleSortingHandler()}
											>
												<span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
												{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
											</TableHeader>
										)}
									</th>
								)
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{paddingTop > 0 && (
						<tr>
							<td style={{ height: `${paddingTop}px` }} />
						</tr>
					)}

					{virtualItems.map((virtualRow) => {
						const row = rows[virtualRow.index]

						return (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => {
									return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
								})}
							</tr>
						)
					})}

					{paddingBottom > 0 && (
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
	background: #000;
	border-radius: 12px;
	overflow: auto;

	table {
		border-collapse: collapse;
		border-spacing: 0;
		table-layout: fixed;
		width: 100%;
	}

	thead {
		margin: 0;
		position: sticky;
		top: 0;
		border-radius: 12px 12px 0 0;
	}

	th,
	td {
		padding: 12px;
	}

	th {
		background: orange;

		:first-of-type {
			border-radius: 12px 0 0 0;
		}

		:last-of-type {
			border-radius: 0 12px 0 0;
		}
	}

	td {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
`

interface ITableHeader {
	canSort: boolean
}

const TableHeader = styled.div<ITableHeader>`
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 4px;
	cursor: ${({ canSort }) => (canSort ? 'pointer' : 'default')};
	user-select: ${({ canSort }) => (canSort ? 'none' : 'initial')};

	& > * {
		white-space: nowrap;
	}
`
