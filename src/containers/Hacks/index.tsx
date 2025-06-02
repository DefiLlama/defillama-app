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
import { Icon } from '~/components/Icon'
import * as Ariakit from '@ariakit/react'
import { FormattedName } from '~/components/FormattedName'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

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
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="p-3 flex items-center justify-end">
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
						className="border border-[var(--form-control-border)] w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

const chartTypeList = ['Total Value Hacked', 'Pie']

const HacksContainer = ({ data, monthlyHacks, totalHacked, totalHackedDefi, totalRugs, pieChartData }) => {
	const [chartType, setChartType] = React.useState('Total Value Hacked')
	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[360px]">
					<div className="flex items-center p-3 -mb-12">
						<ChartSelector options={chartTypeList} selectedChart={chartType} onClick={setChartType} />
					</div>

					{chartType === 'Total Value Hacked' && monthlyHacks ? (
						<BarChart chartData={monthlyHacks} title="Monthly sum" groupBy="monthly" />
					) : (
						<PieChart chartData={pieChartData} />
					)}
				</div>
			</div>
			<HacksTable data={data} />
		</Layout>
	)
}

function ChartSelector({ options, selectedChart, onClick }) {
	const onItemClick = (chartType: string) => {
		onClick(chartType)
	}

	return (
		<Ariakit.SelectProvider value={selectedChart} setValue={onClick}>
			<Ariakit.Select className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium z-10">
				<FormattedName text={selectedChart} maxCharacters={20} fontSize={'16px'} fontWeight={600} />
				<Ariakit.SelectArrow />
			</Ariakit.Select>
			<Ariakit.SelectPopover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className="flex flex-col bg-[var(--bg1)] rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				{options.map((option) => (
					<Ariakit.SelectItem
						value={option}
						key={option}
						focusOnHover
						setValueOnClick={false}
						onClick={() => onItemClick(option)}
						className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer first-of-type:rounded-t-md last-of-type:rounded-b-md border-b border-[var(--form-control-border)]"
					>
						{option}
					</Ariakit.SelectItem>
				))}
			</Ariakit.SelectPopover>
		</Ariakit.SelectProvider>
	)
}

export default HacksContainer
