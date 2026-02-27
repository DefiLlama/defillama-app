import {
	type ColumnFiltersState,
	type ColumnOrderState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IMultiSeriesChart2Props, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { RaisesFilters } from '~/containers/Raises/Filters'
import { slug } from '~/utils'
import { useRaisesData } from './hooks'
import { raisesColumnOrders, raisesColumns } from './Table'
import type { IRaise } from './types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const columnResizeMode = 'onChange'

const handleDownloadJson = () => {
	window.open('https://api.llama.fi/raises', '_blank', 'noopener,noreferrer')
}

function RaisesByInvestorTable({ raises }: { raises: IRaise[] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'date' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])

	const instance = useReactTable({
		data: raises,
		columns: raisesColumns,
		columnResizeMode,
		state: {
			columnFilters,
			columnOrder,
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnOrderChange: (updater) => React.startTransition(() => setColumnOrder(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({ instance, columnOrders: raisesColumnOrders })

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
						onInput={(e) => setProjectName(e.currentTarget.value)}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'raises' })} smol />
				<CSVDownloadButton onClick={handleDownloadJson} isLoading={false}>
					Download.json
				</CSVDownloadButton>
			</div>
			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</div>
	)
}

interface InvestorContainerProps {
	raises: IRaise[]
	investors: string[]
	rounds: string[]
	sectors: string[]
	chains: string[]
	investorName: string
}

export const InvestorContainer = ({
	raises,
	investors,
	rounds,
	sectors,
	chains,
	investorName
}: InvestorContainerProps) => {
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
	const deferredFundingRoundsByMonthChart = React.useDeferredValue(fundingRoundsByMonthChart)
	const deferredInvestmentByRounds = React.useDeferredValue(investmentByRounds)
	const deferredRaisesByCategory = React.useDeferredValue(raisesByCategory)

	return (
		<>
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
				pathname={`/raises/${slug(investorName)}`}
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
				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={deferredFundingRoundsByMonthChart.dataset}
							charts={deferredFundingRoundsByMonthChart.charts}
							groupBy="monthly"
							valueSymbol=""
							exportButtons={{
								png: true,
								csv: true,
								filename: `${investorName}-funding-rounds`,
								pngTitle: `${investorName} Funding Rounds`
							}}
						/>
					</React.Suspense>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1">
				<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={deferredInvestmentByRounds}
							title="Investment by Rounds"
							valueSymbol=""
							exportButtons={{
								png: true,
								csv: true,
								filename: `${investorName}-investment-by-rounds`,
								pngTitle: `${investorName} Investment by Rounds`
							}}
						/>
					</React.Suspense>
				</div>
				<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={deferredRaisesByCategory}
							title="Investments by Category"
							valueSymbol=""
							exportButtons={{
								png: true,
								csv: true,
								filename: `${investorName}-investments-by-category`,
								pngTitle: `${investorName} Investments by Category`
							}}
						/>
					</React.Suspense>
				</div>
			</div>
			<RaisesByInvestorTable raises={filteredRaisesList} />
		</>
	)
}
