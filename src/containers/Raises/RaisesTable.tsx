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
import { VirtualTable } from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import useWindowSize from '~/hooks/useWindowSize'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ButtonDark } from '~/components/ButtonStyled'
import { Icon } from '~/components/Icon'

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
			<div className="flex items-center gap-4 flex-wrap -mb-6">
				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>

				<ButtonDark
					as="a"
					target="_blank"
					rel="noreferrer noopener"
					href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093"
					className="ml-auto flex items-center gap-1"
				>
					<span>Methodology & biases</span>
					<Icon name="external-link" height={14} width={14} />
				</ButtonDark>

				<CSVDownloadButton
					customText="Download .json"
					onClick={() => {
						window.open('https://api.llama.fi/raises')
					}}
				/>
			</div>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}
