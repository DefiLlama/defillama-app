import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	flexRender
} from '@tanstack/react-table'
import { protocolsByChainColumns } from './columns'
import { IProtocolRow } from './types'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { SortIcon } from '~/components/Table/SortIcon'
import { TABLE_CATEGORIES, TABLE_PERIODS, defaultColumns, protocolsByChainTableColumns } from '.'

export function ProtocolsByChainTable({ chain = 'All' }: { chain: string }) {
	const { fullProtocolsList, parentProtocols } = useGetProtocolsList({ chain })
	const { data: chainProtocolsVolumes } = useGetProtocolsVolumeByChain(chain)

	const { data: chainProtocolsFees } = useGetProtocolsFeesAndRevenueByChain(chain)

	const finalProtocolsList = React.useMemo(() => {
		const list = fullProtocolsList
			? formatProtocolsList({
					extraTvlsEnabled: {},
					protocols: fullProtocolsList,
					parentProtocols,
					volumeData: chainProtocolsVolumes,
					feesData: chainProtocolsFees
			  })
			: []

		return list
	}, [fullProtocolsList, parentProtocols, chainProtocolsVolumes, chainProtocolsFees])
	const optionsKey = 'protocolsTableColumns'
	const valuesInStorage = JSON.parse(
		typeof window !== 'undefined' ? window.localStorage.getItem(optionsKey) ?? defaultColumns : defaultColumns
	)

	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [filterState, setFilterState] = React.useState(null)

	const table = useReactTable({
		data: finalProtocolsList,
		columns: protocolsByChainColumns,
		state: {
			sorting,
			expanded
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				return a - b
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocolRow) => row.subRows,
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const addOption = (newOptions, setLocalStorage = true) => {
		const ops = Object.fromEntries(
			table.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		if (setLocalStorage) window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		table.setColumnVisibility(ops)
	}
	const setFilter = (key) => (newState) => {
		const stateToSet = newState === filterState ? null : newState
		const newOptions = protocolsByChainTableColumns
			.filter((column) => (column[key] !== undefined && stateToSet !== null ? column[key] === newState : true))
			.map((op) => op.key)

		addOption(newOptions, false)
		setFilterState(stateToSet)
	}

	return (
		<div className="flex flex-col items-center h-full p-4">
			<div className="flex items-center justify-between flex-wrap gap-2 -mb-3">
				<h3 className="text-lg font-medium mr-auto">{chain} Protocols</h3>
				<RowFilter
					setValue={setFilter('category')}
					selectedValue={filterState}
					values={Object.values(TABLE_CATEGORIES) as Array<string>}
				/>
				<RowFilter
					setValue={setFilter('period')}
					selectedValue={filterState}
					values={Object.values(TABLE_PERIODS) as Array<string>}
				/>
			</div>
			<div className="isolate relative w-full max-w-[calc(100vw-32px)] rounded-md lg:max-w-[calc(100vw-276px)] overflow-x-auto mx-auto text-[var(--text1)] bg-[var(--bg8)] border border-[var(--bg3)]">
				<table>
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<th key={header.id} colSpan={header.colSpan}>
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
						{table.getRowModel().rows.map((row) => {
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
			</div>
			<div className="flex items-center justify-between w-full">
				<RowFilter
					selectedValue={null}
					setValue={(val) => (val === 'Next' ? table.nextPage() : table.previousPage())}
					values={['Previous', 'Next']}
				/>
				<div className="flex">
					<div className="mr-2 mt-[6px]">Per page</div>
					<RowFilter
						style={{ alignSelf: 'flex-end' }}
						selectedValue={String(table.getState().pagination.pageSize)}
						values={['10', '30', '50']}
						setValue={(val) => table.setPageSize(Number(val))}
					/>
				</div>
			</div>
		</div>
	)
}

// const PTable = styled(Wrapper)`
// 	margin-bottom: 8px;
// 	margin-top: 24px;

// 	border: none;
// 	display: flex;
// 	background-color: transparent;
// 	table {
// 		table-layout: auto;
// 		max-width: 700px;
// 		width: 100%;
// 		margin: 0 auto;
// 	}

// 	th:first-child {
// 		min-width: 180px;
// 	}

// 	th > * {
// 		padding-left: 12px;
// 		padding: 12px;
// 	}
// 	td {
// 		padding: 12px;
// 	}

// 	thead > tr:first-child {
// 		th > * {
// 			width: fit-content;
// 			margin: 0 auto;
// 			padding-left: 0;
// 		}
// 	}

// 	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
// 		th:first-child {
// 			min-width: 240px;
// 		}
// 	}
// `
