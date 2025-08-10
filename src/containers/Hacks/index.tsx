import * as React from 'react'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ColumnFiltersState,
	getFilteredRowModel,
	ColumnDef
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import type { ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { TagGroup } from '~/components/TagGroup'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { downloadChart } from '~/components/ECharts/utils'
import { capitalizeFirstLetter, download, formattedNum, toNiceDayMonthAndYear } from '~/utils'
import { IHacksPageData } from './queries'
import { IconsRow } from '~/components/IconsRow'
import { Tooltip } from '~/components/Tooltip'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const columnResizeMode = 'onChange'

function HacksTable({ data }: { data: IHacksPageData['data'] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [projectName, setProjectName] = React.useState('')
	const instance = useReactTable({
		data: data,
		columns: hacksColumns,
		columnResizeMode,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')

		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
			<div className="p-3 flex items-center justify-end gap-2">
				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="border border-(--form-control-border) w-full p-1 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</label>
				<CSVDownloadButton
					onClick={() => {
						try {
							let rows: Array<Array<string | number | boolean>> = [
								[
									'Name',
									'Date',
									'Amount',
									'Chains',
									'Classification',
									'Target',
									'Technique',
									'Bridge',
									'Language',
									'Link'
								]
							]
							for (const {
								name,
								date,
								amount,
								chains,
								classification,
								target,
								technique,
								bridge,
								language,
								link
							} of data) {
								rows.push([
									name,
									date,
									amount,
									chains?.join(','),
									classification,
									target,
									technique,
									bridge,
									language,
									link
								])
							}
							download('hacks.csv', rows.map((r) => r.join(',')).join('\n'))
						} catch (error) {
							console.error('Error generating CSV:', error)
						}
					}}
					className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
				/>
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

const chartTypeList = ['Monthly Sum', 'Total Hacked by Technique']

export const HacksContainer = ({
	data,
	monthlyHacksChartData,
	totalHacked,
	totalHackedDefi,
	totalRugs,
	pieChartData
}: IHacksPageData) => {
	const [chartType, setChartType] = React.useState('Monthly Sum')

	return (
		<Layout title={`Hacks - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col col-span-2 min-h-[412px]">
					<div className="flex items-center justify-between flex-wrap gap-2 m-2">
						<TagGroup setValue={setChartType} selectedValue={chartType} values={chartTypeList} />
						<CSVDownloadButton
							onClick={() => {
								try {
									if (chartType === 'Monthly Sum') {
										downloadChart(
											{ 'Total Value Hacked': monthlyHacksChartData['Total Value Hacked'].data },
											`total-value-hacked.csv`
										)
									} else {
										let rows: Array<Array<string | number>> = [['Technique', 'Value']]
										for (const { name, value } of pieChartData) {
											rows.push([name, value])
										}
										download('total-hacked-by-technique.csv', rows.map((r) => r.join(',')).join('\n'))
									}
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							smol
							className="h-[30px] bg-transparent! border border-(--form-control-border) text-[#666]! dark:text-[#919296]! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)! ml-auto"
						/>
					</div>
					{chartType === 'Monthly Sum' ? (
						<React.Suspense fallback={<></>}>
							<LineAndBarChart charts={monthlyHacksChartData} groupBy="monthly" />
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<PieChart chartData={pieChartData} />
						</React.Suspense>
					)}
				</div>
			</div>
			<HacksTable data={data} />
		</Layout>
	)
}

export const hacksColumns: ColumnDef<IHacksPageData['data'][0]>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		size: 200
	},
	{
		cell: ({ getValue }) => <>{toNiceDayMonthAndYear(getValue())}</>,
		size: 120,
		header: 'Date',
		accessorKey: 'date'
	},
	{
		header: 'Amount lost',
		accessorKey: 'amount',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : ''}</>,
		size: 140
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		size: 60
	},
	...['classification', 'technique'].map((s) => ({
		header: capitalizeFirstLetter(s),
		accessorKey: s,
		enableSorting: false,
		size: s === 'classification' ? 140 : 200,
		...(s === 'classification' && {
			meta: {
				headerHelperText:
					'Classified based on whether the hack targeted a weakness in Infrastructure, Smart Contract Language, Protocol Logic or the interaction between multiple protocols (Ecosystem)'
			}
		}),
		cell: ({ getValue }) => {
			return (
				<Tooltip content={getValue() as string} className="inline text-ellipsis">
					{getValue() as string}
				</Tooltip>
			)
		}
	})),
	{
		header: 'Language',
		accessorKey: 'language',
		cell: ({ getValue }) => <>{(getValue() ?? null) as string | null}</>,
		size: 140
	},
	{
		header: 'Link',
		accessorKey: 'link',
		size: 40,
		enableSorting: false,
		cell: ({ getValue }) => (
			<a
				className="flex items-center justify-center gap-4 p-[6px] bg-(--btn2-bg) hover:bg-(--btn2-hover-bg) rounded-md"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
			</a>
		)
	}
]
