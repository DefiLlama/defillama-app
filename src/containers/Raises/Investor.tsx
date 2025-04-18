import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnOrderState,
	ColumnFiltersState
} from '@tanstack/react-table'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { VirtualTable } from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import { Announcement } from '~/components/Announcement'
import { RaisesFilters } from '~/components/Filters/raises'
import { useRouter } from 'next/router'
import useWindowSize from '~/hooks/useWindowSize'
import { downloadCsv } from './download'
import { useRaisesData } from './hooks'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const columnResizeMode = 'onChange'

function RaisesTable({ raises, downloadCsv }) {
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
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="flex items-center justify-end gap-2 flex-wrap p-3">
				<div className="relative w-full sm:max-w-[280px] mr-auto">
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
						className="border border-black/10 dark:border-white/10 w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				<CSVDownloadButton onClick={downloadCsv} className="min-h-[34px]" />
				<CSVDownloadButton
					customText="Download .json"
					onClick={() => window.open('https://api.llama.fi/raises')}
					className="min-h-[34px]"
				/>
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

export const InvestorContainer = ({ raises, investors, rounds, sectors, chains, investorName }) => {
	const { pathname } = useRouter()

	const {
		filteredRaisesList,
		selectedInvestors,
		selectedRounds,
		selectedChains,
		selectedSectors,
		raisesByCategory,
		fundingRoundsByMonth,
		investmentByRounds
	} = useRaisesData({
		raises,
		investors,
		rounds,
		sectors,
		chains
	})

	return (
		<Layout title={`Raises - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					className="text-[var(--blue)] underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<RaisesFilters
				header={investorName ? `${investorName} raises` : 'Raises'}
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

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="font-semibold text-2xl">{investorName}</h1>

					<details className="group text-base">
						<summary>
							<Icon
								name="chevron-right"
								height={20}
								width={20}
								className="-ml-5 -mb-5 group-open:rotate-90 transition-transform duration-100"
							/>

							<span className="flex items-center justify-between gap-2 flex-wrap">
								<span className="text-[#545757] dark:text-[#cccccc]">Total Investments</span>
								<span className="font-jetbrains">{filteredRaisesList.length}</span>
							</span>
						</summary>

						{raisesByCategory.map(({ name, value }) => (
							<p className="flex items-center flex-wrap justify-between gap-2 my-1" key={'total' + name + value}>
								<span className="text-[#545757] dark:text-[#cccccc]">{name}</span>
								<span className="font-jetbrains">{value}</span>
							</p>
						))}
					</details>
				</div>
				<div className="bg-[var(--cards-bg)] rounded-md col-span-2 min-h-[360px]">
					<BarChart chartData={fundingRoundsByMonth} title="" isMonthly color="#1F67D2" valueSymbol="" />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1">
				<LazyChart className="relative col-span-full pt-3 min-h-[372px] bg-[var(--cards-bg)] rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
					<PieChart chartData={investmentByRounds} title="Investment by Rounds" usdFormat={false} />
				</LazyChart>
				<LazyChart className="relative col-span-full pt-3 min-h-[372px] bg-[var(--cards-bg)] rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
					<PieChart chartData={raisesByCategory} title="Investments by Category" usdFormat={false} />
				</LazyChart>
			</div>

			<RaisesTable raises={filteredRaisesList} downloadCsv={() => downloadCsv({ raises })} />
		</Layout>
	)
}
