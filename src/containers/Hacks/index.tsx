import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { ILineAndBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { prepareChartCsv } from '~/components/ECharts/utils'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { VirtualTable } from '~/components/Table/Table'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import Layout from '~/layout'
import { capitalizeFirstLetter, formattedNum, toNiceDayMonthAndYear } from '~/utils'
import { IHacksPageData } from './queries'

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

	const prepareCsv = React.useCallback(() => {
		try {
			let rows: Array<Array<string | number | boolean>> = [
				['Name', 'Date', 'Amount', 'Chains', 'Classification', 'Target', 'Technique', 'Bridge', 'Language', 'Link']
			]
			for (const { name, date, amount, chains, classification, target, technique, bridge, language, link } of data) {
				rows.push([name, date, amount, chains?.join(','), classification, target, technique, bridge, language, link])
			}
			return { filename: 'hacks.csv', rows }
		} catch (error) {
			console.error('Error generating CSV:', error)
		}
	}, [data])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-end gap-2 p-3">
				<label className="relative w-full sm:max-w-[280px]">
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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-0.5 pl-7 text-base text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={prepareCsv} />
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

const chartTypeList = ['Monthly Sum', 'Total Hacked by Technique']

const pageName = ['Hacks: Overview']

export const HacksContainer = ({
	data,
	monthlyHacksChartData,
	totalHacked,
	totalHackedDefi,
	totalRugs,
	pieChartData
}: IHacksPageData) => {
	const [chartType, setChartType] = React.useState('Monthly Sum')

	const prepareCsv = React.useCallback(() => {
		if (chartType === 'Monthly Sum') {
			return prepareChartCsv(
				{ 'Total Value Hacked': monthlyHacksChartData['Total Value Hacked'].data },
				`total-value-hacked.csv`
			)
		} else {
			let rows: Array<Array<string | number>> = [['Technique', 'Value']]
			for (const { name, value } of pieChartData) {
				rows.push([name, value])
			}
			return { filename: 'total-hacked-by-technique.csv', rows }
		}
	}, [monthlyHacksChartData, pieChartData, chartType])

	return (
		<Layout
			title={`Hacks - DefiLlama`}
			description={`Track hacks on all chains and DeFi protocols. View total value lost, breakdown by technique, and DeFi hacks on DefiLlama.`}
			keywords={`total value hacked, total value lost in hacks, blockchain hacks, hacks on DeFi protocols, DeFi hacks`}
			canonicalUrl={`/hacks`}
			pageName={pageName}
		>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalHacked}b</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in DeFi (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalHackedDefi}b</span>
					</p>
					<p className="flex flex-col">
						<span className="text-(--text-label)">Total Value Hacked in Bridges (USD)</span>
						<span className="font-jetbrains text-2xl font-semibold">{totalRugs}b</span>
					</p>
				</div>
				<div className="col-span-2 flex min-h-[412px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="m-2 flex flex-wrap items-center justify-between gap-2">
						<TagGroup setValue={setChartType} selectedValue={chartType} values={chartTypeList} />
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
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
				className="flex items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
				href={getValue() as string}
				target="_blank"
				rel="noopener noreferrer"
			>
				<Icon name="arrow-up-right" height={14} width={14} />
				<span className="sr-only">open in new tab</span>
			</a>
		)
	}
]
