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
		<div className="bg-(--cards-bg) border border-(cards-border) rounded-md">
			<div className="flex items-center gap-2 flex-wrap p-3">
				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="border border-(--form-control-border) w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				<a
					target="_blank"
					rel="noreferrer noopener"
					href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093"
					className="min-h-[34px] ml-auto flex items-center gap-1 justify-center py-1 px-2 whitespace-nowrap text-xs rounded-md text-(--link-text) bg-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
				>
					<span>Methodology & biases</span>
					<Icon name="external-link" height={14} width={14} />
				</a>
				<CSVDownloadButton
					customText="Download .json"
					onClick={() => {
						window.open('https://api.llama.fi/raises')
					}}
					className="min-h-[34px]"
				/>
				<CSVDownloadButton onClick={downloadCsv} className="min-h-[34px]" />
			</div>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}
