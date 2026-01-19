import {
	ColumnFiltersState,
	ColumnOrderState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { raisesColumnOrders, raisesColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { useDebounce } from '~/hooks/useDebounce'

const columnResizeMode = 'onChange'

export function RaisesTable({ raises, prepareCsv }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const width = useBreakpointWidth()
	const handleDownloadJson = React.useCallback(() => {
		window.open('https://api.llama.fi/raises')
	}, [])

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

		const order = raisesColumnOrders.find(([size]) => width >= size)?.[1] ?? defaultOrder

		instance.setColumnOrder(order)
	}, [width, instance])

	const [projectName, setProjectName] = React.useState('')
	const debouncedProjectName = useDebounce(projectName, 200)

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('name')?.setFilterValue(debouncedProjectName)
		})
	}, [debouncedProjectName, instance])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<a
					target="_blank"
					rel="noreferrer noopener"
					href="https://github.com/DefiLlama/DefiLlama-Adapters/discussions/7093"
					className="flex items-center gap-1"
				>
					<span className="whitespace-nowrap">Methodology & biases</span>
					<Icon name="external-link" height={12} width={12} />
				</a>
				<CSVDownloadButton onClick={handleDownloadJson} isLoading={false}>
					Download.json
				</CSVDownloadButton>
				<CSVDownloadButton prepareCsv={prepareCsv} />
			</div>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}
