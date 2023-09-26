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
import { ChartWrapper, ChartsWrapper, DetailsWrapper, LazyChart, Name } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { AccordionStat2, StatInARow } from '~/layout/Stats/Large'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import { RaisesFilters } from '~/components/Filters'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { DownloadIcon } from '~/components'
import useWindowSize from '~/hooks/useWindowSize'
import { SearchIcon, TableFiltersWithInput } from '~/components/Table/shared'
import { downloadCsv } from './download'
import { useRaisesData } from './hooks'
import { ChevronRight } from 'react-feather'

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

				<DownloadButton onClick={downloadCsv}>
					<DownloadIcon />
					<span>&nbsp;&nbsp;.csv</span>
				</DownloadButton>
				<Link href="https://api.llama.fi/raises" target="_blank">
					<DownloadButton>
						<DownloadIcon />
						<span>&nbsp;&nbsp;.json</span>
					</DownloadButton>
				</Link>
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
			<AnnouncementWrapper>
				<span>Are we missing any funding round?</span>{' '}
				<a
					href="https://airtable.com/shrON6sFMgyFGulaq"
					style={{ color: '#2f80ed' }}
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</AnnouncementWrapper>

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

			<StatsSection>
				<DetailsWrapper>
					<Name>{investorName}</Name>

					<AccordionStat2>
						<summary>
							<span data-arrowicon>
								<ChevronRight size={20} />
							</span>

							<span data-summaryheader>
								<span>Total Investments</span>
								<span>{filteredRaisesList.length}</span>
							</span>
						</summary>

						<span style={{ gap: '8px' }}>
							{raisesByCategory.map(({ name, value }) => (
								<StatInARow key={'total' + name + value}>
									<span>{name}</span>
									<span>{value}</span>
								</StatInARow>
							))}
						</span>
					</AccordionStat2>
				</DetailsWrapper>

				<ChartWrapper>
					<BarChart chartData={fundingRoundsByMonth} title="Monthly Investments" valueSymbol="" />
				</ChartWrapper>
			</StatsSection>

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
