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
import { Wrapper } from '~/components/Table/Table'
import { protocolsByChainColumns } from './columns'
import { IProtocolRow } from './types'
import styled from 'styled-components'
import RowFilter from '~/components/Filters/common/RowFilter'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import SortIcon from '../../SortIcon'
import {
	ListHeader,
	ListOptions,
	TABLE_CATEGORIES,
	TABLE_PERIODS,
	defaultColumns,
	protocolsByChainTableColumns
} from '.'

const Footer = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`

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
		<Body>
			<ListHeader>{chain} Protocols</ListHeader>
			<ListOptions>
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
			</ListOptions>
			<PTable>
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
			</PTable>
			<Footer>
				<RowFilter
					selectedValue={null}
					setValue={(val) => (val === 'Next' ? table.nextPage() : table.previousPage())}
					values={['Previous', 'Next']}
				/>
				<div style={{ display: 'flex' }}>
					<div style={{ marginTop: '6px', marginRight: '8px' }}>Per page</div>
					<RowFilter
						style={{ alignSelf: 'flex-end' }}
						selectedValue={String(table.getState().pagination.pageSize)}
						values={['10', '30', '50']}
						setValue={(val) => table.setPageSize(Number(val))}
					/>
				</div>
			</Footer>
		</Body>
	)
}

const Body = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	height: 100%;
`

const PTable = styled(Wrapper)`
	margin-bottom: 8px;
	border: none;
	display: flex;
	background-color: transparent;
	table {
		table-layout: auto;
		max-width: 700px;
		width: 100%;
		margin: 0 auto;
	}

	th:first-child {
		min-width: 180px;
	}

	th > * {
		padding-left: 12px;
		padding: 12px;
	}
	td {
		padding: 12px;
	}

	thead > tr:first-child {
		th > * {
			width: fit-content;
			margin: 0 auto;
			padding-left: 0;
		}
	}

	@media (min-width: ${({ theme: { bpLg } }) => bpLg}) {
		th:first-child {
			min-width: 240px;
		}
	}
`
