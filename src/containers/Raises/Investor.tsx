import * as React from 'react'
import { useRouter } from 'next/router'
import {
	ColumnFiltersState,
	ColumnOrderState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { raisesColumnOrders, raisesColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { RaisesFilters } from '~/containers/Raises/Filters'
import useWindowSize from '~/hooks/useWindowSize'
import Layout from '~/layout'
import { prepareRaisesCsv } from './download'
import { useRaisesData } from './hooks'

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const columnResizeMode = 'onChange'

function RaisesTable({ raises, prepareCsv }) {
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
			? (raisesColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-[2px] pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={prepareCsv} />
				<CSVDownloadButton onClick={() => window.open('https://api.llama.fi/raises')} isLoading={false}>
					Download.json
				</CSVDownloadButton>
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

const pageName = ['Deals by Investor']

export const InvestorContainer = ({ raises, investors, rounds, sectors, chains, investorName }) => {
	const { pathname } = useRouter()

	const {
		filteredRaisesList,
		selectedInvestors,
		selectedRounds,
		selectedChains,
		selectedSectors,
		raisesByCategory,
		fundingRoundsByMonthChart,
		investmentByRounds
	} = useRaisesData({
		raises,
		investors,
		rounds,
		sectors,
		chains
	})

	const prepareCsv = React.useCallback(() => {
		return prepareRaisesCsv({ raises: filteredRaisesList })
	}, [filteredRaisesList])

	return (
		<Layout title={`Raises - DefiLlama`} pageName={pageName}>
			<Announcement notCancellable>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					className="font-medium text-(--blue) underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<RaisesFilters
				header={'Raises'}
				rounds={rounds}
				selectedRounds={selectedRounds}
				sectors={sectors}
				selectedSectors={selectedSectors}
				investors={investors}
				selectedInvestors={selectedInvestors}
				chains={chains}
				selectedChains={selectedChains}
				pathname={pathname}
			/>

			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="text-xl font-semibold">{investorName}</h1>

					<details className="group text-base">
						<summary>
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-mb-5 -ml-5 transition-transform duration-100 group-open:rotate-90"
							/>

							<span className="flex flex-wrap items-center justify-between gap-2">
								<span className="text-(--text-label)">Total Investments</span>
								<span className="font-jetbrains">{filteredRaisesList.length}</span>
							</span>
						</summary>

						{raisesByCategory.map(({ name, value }) => (
							<p className="my-1 flex flex-wrap items-center justify-between gap-2" key={'total' + name + value}>
								<span className="text-(--text-label)">{name}</span>
								<span className="font-jetbrains">{value}</span>
							</p>
						))}
					</details>
				</div>
				<div className="col-span-2 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<React.Suspense fallback={<></>}>
						<LineAndBarChart charts={fundingRoundsByMonthChart} groupBy="monthly" valueSymbol="" />
					</React.Suspense>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1">
				<LazyChart className="relative col-span-full flex min-h-[372px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-3 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<PieChart chartData={investmentByRounds} title="Investment by Rounds" usdFormat={false} />
					</React.Suspense>
				</LazyChart>
				<LazyChart className="relative col-span-full flex min-h-[372px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-3 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<PieChart chartData={raisesByCategory} title="Investments by Category" usdFormat={false} />
					</React.Suspense>
				</LazyChart>
			</div>

			<RaisesTable raises={filteredRaisesList} prepareCsv={prepareCsv} />
		</Layout>
	)
}
