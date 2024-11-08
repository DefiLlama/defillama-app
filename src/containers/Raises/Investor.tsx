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
import styled from 'styled-components'
import type { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { ChartWrapper, ChartsWrapper, LazyChart } from '~/layout/ProtocolAndPool'
import { VirtualTable } from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import { Announcement } from '~/components/Announcement'
import { RaisesFilters } from '~/components/Filters/raises'
import { useRouter } from 'next/router'
import useWindowSize from '~/hooks/useWindowSize'
import { SearchIcon, TableFiltersWithInput } from '~/components/Table/shared'
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
		<>
			<TableFiltersWithInput>
				<SearchIcon size={16} />

				<input
					value={projectName}
					onChange={(e) => {
						setProjectName(e.target.value)
					}}
					placeholder="Search projects..."
				/>

				<CSVDownloadButton onClick={downloadCsv} />
				<CSVDownloadButton customText="Download .json" onClick={() => window.open('https://api.llama.fi/raises')} />
			</TableFiltersWithInput>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}

export const DownloadButton = styled.button`
	font-size: 0.875rem;
	display: flex;
	align-items: center;
	background: ${({ theme }) => theme.bg3};
	padding: 4px 6px;
	border-radius: 6px;
`

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

			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
				<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
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

				<ChartWrapper>
					<BarChart chartData={fundingRoundsByMonth} title="Monthly Investments" valueSymbol="" />
				</ChartWrapper>
			</div>

			<ChartsWrapper style={{ marginTop: '-16px' }}>
				<LazyChart>
					<PieChart chartData={investmentByRounds} title="Investment by Rounds" usdFormat={false} />
				</LazyChart>
				<LazyChart>
					<PieChart chartData={raisesByCategory} title="Investments by Category" usdFormat={false} />
				</LazyChart>
			</ChartsWrapper>

			<RaisesTable raises={filteredRaisesList} downloadCsv={() => downloadCsv({ raises })} />
		</Layout>
	)
}
