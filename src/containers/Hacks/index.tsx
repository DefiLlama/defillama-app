import * as React from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnOrderState,
	ColumnFiltersState,
	getFilteredRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { hacksColumns, hacksColumnOrders } from '~/components/Table/Defi/columns'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import useWindowSize from '~/hooks/useWindowSize'
import { ChartSelector } from '~/containers/PeggedPage'
import { Icon } from '~/components/Icon'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const columnResizeMode = 'onChange'

function HacksTable({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [projectName, setProjectName] = React.useState('')
	const windowSize = useWindowSize()
	const instance = useReactTable({
		data: data,
		columns: hacksColumns,
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
			? hacksColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')

		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<>
			<div className="relative w-full sm:max-w-[280px] -mb-6 ml-auto">
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

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}

const chartTypeList = ['Total Value Hacked', 'Pie']

const HacksContainer = ({ data, monthlyHacks, totalHacked, totalHackedDefi, totalRugs, pieChartData }) => {
	const [chartType, setChartType] = React.useState('Total Value Hacked')
	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
				<div className="flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Value Hacked (USD)</span>
						<span className="font-semibold text-2xl font-jetbrains">{totalHacked}b</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Value Hacked in DeFi (USD)</span>
						<span className="font-semibold text-2xl font-jetbrains">{totalHackedDefi}b</span>
					</p>
					<p className="flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Value Hacked in Bridges (USD)</span>
						<span className="font-semibold text-2xl font-jetbrains">{totalRugs}b</span>
					</p>
				</div>
				<div className="flex flex-col gap-4 py-4 col-span-1 *:ml-4 last:*:ml-0 min-h-[444px]">
					<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />

					{chartType === 'Total Value Hacked' && monthlyHacks ? (
						<BarChart chartData={monthlyHacks} title="Monthly sum" isMonthly />
					) : (
						<PieChart chartData={pieChartData} />
					)}
				</div>
			</div>
			<HacksTable data={data} />
		</Layout>
	)
}

export default HacksContainer
