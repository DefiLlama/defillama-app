import * as React from 'react'
import { Table, flexRender } from '@tanstack/react-table'
import { SortIcon } from '~/components/Table/SortIcon'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'

interface TableBodyProps {
	table: Table<IProtocolRow> | null
}

export function TableBody({ table }: TableBodyProps) {
	if (!table) {
		return (
			<div className="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-auto thin-scrollbar" style={{ height: '100%' }}>
				<div className="flex items-center justify-center h-32">
					<div className="text-[var(--text3)]">Loading table...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-auto thin-scrollbar" style={{ height: '100%' }}>
			<table className="min-w-full text-[var(--text1)] text-sm border-collapse">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<th key={header.id} colSpan={header.colSpan} className="bg-transparent font-medium px-2 py-2 border-b border-r border-[var(--divider)] last:border-r-0">
										{header.isPlaceholder ? null : (
											<a
												style={{ display: 'flex', gap: '4px' }}
												onClick={() => {
													header.column.toggleSorting()
												}}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
											</a>
										)}
									</th>
								)
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{table.getRowModel().rows.map((row) => (
						<tr key={row.id} className="hover:bg-[var(--bg3)] border-b border-[var(--divider)]">
							{row.getVisibleCells().map((cell) => (
								<td key={cell.id} className="px-2 py-2 whitespace-nowrap border-r border-[var(--divider)] last:border-r-0">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}