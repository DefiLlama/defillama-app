import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnOrderState,
	ColumnFiltersState
} from '@tanstack/react-table'
import styled from 'styled-components'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import useWindowSize from '~/hooks/useWindowSize'
import { SearchIcon, TableFiltersWithInput } from '~/components/Table/shared'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ButtonDark } from '~/components/ButtonStyled'

const columnResizeMode = 'onChange'

export function RaisesTable({ raises, downloadCsv }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		columnResizeMode,
		state: {
			columnFilters,
			columnOrder,
			sorting
		},
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? raisesColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')

		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<>
			<TableFiltersWithInput>
				<SearchIcon size={16} />

				<input
					value={projectName}
					onChange={(e) => {
						setProjectName(e.target.value)
					}}
					placeholder="Search projects..."
				/>

				<ButtonDark
					as="a"
					target="_blank"
					rel="noreferrer noopener"
					href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093"
				>
					Methodology & biases
				</ButtonDark>

				<CSVDownloadButton
					customText="Download .json"
					onClick={() => {
						window.open('https://api.llama.fi/raises')
					}}
				/>
			</TableFiltersWithInput>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}

export const DownloadButton = styled.button`
	font-size: 0.875rem;
	display: flex;
	align-items: center;
	background: ${({ theme }) => theme.bg3};
	padding: 4px 6px;
	border-radius: 6px;
`
