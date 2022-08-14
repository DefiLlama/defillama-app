import * as React from 'react'
import { Table, flexRender } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import SortIcon from './SortIcon'
import styled from 'styled-components'

interface ITableProps {
	instance: Table<any>
}

export default function VirtualTable({ instance }: ITableProps) {
	const tableContainerRef = React.useRef<HTMLDivElement>(null)

	const { rows } = instance.getRowModel()

	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 50
	})

	const paddingTop = rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getVirtualItems()?.[0]?.start || 0 : 0

	return (
		<Wrapper ref={tableContainerRef} className="container">
			<table>
				<thead>
					{instance.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<th key={header.id} colSpan={header.colSpan} style={{ width: header.getSize() }}>
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
					{/* space for sticky headers */}
					{paddingTop > 0 && (
						<tr>
							<td style={{ height: `${paddingTop}px` }} />
						</tr>
					)}

					{rowVirtualizer.getVirtualItems().map((virtualRow) => {
						const row = rows[virtualRow.index]

						return (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => {
									return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
								})}
							</tr>
						)
					})}
				</tbody>
			</table>
		</Wrapper>
	)
}

const Wrapper = styled.div`
	background: #000;
	overflow: auto;

	th,
	td {
		padding: 12px;
	}

	td {
		white-space: nowrap;
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
