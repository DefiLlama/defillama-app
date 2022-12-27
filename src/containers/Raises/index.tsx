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
import { Search } from 'react-feather'
import type { IBarChartProps } from '~/components/ECharts/types'
import { ChartWrapper, DetailsWrapper } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import VirtualTable from '~/components/Table/Table'
import { raisesColumns, raisesColumnOrders } from '~/components/Table/Defi/columns'
import { AnnouncementWrapper } from '~/components/Announcement'
import { RaisesFilters } from '~/components/Filters'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { DownloadIcon } from '~/components'
import { download, formattedNum, toNiceCsvDate } from '~/utils'
import useWindowSize from '~/hooks/useWindowSize'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

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
			<TableFilters>
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
			</TableFilters>

			<VirtualTable instance={instance} columnResizeMode={columnResizeMode} />
		</>
	)
}

const DownloadButton = styled.button`
	font-size: 0.875rem;
	display: flex;
	align-items: center;
	background: ${({ theme }) => theme.bg3};
	padding: 4px 6px;
	border-radius: 6px;
`

const RaisesContainer = ({ raises, investors, rounds, sectors, chains, investorName, monthlyInvestment }) => {
	const { pathname, query } = useRouter()

	const { investor, round, sector, chain, minRaised, maxRaised } = query

	const { filteredRaisesList, selectedInvestors, selectedRounds, selectedChains, selectedSectors } =
		React.useMemo(() => {
			let selectedInvestors = []
			let selectedRounds = []
			let selectedSectors = []
			let selectedChains = []

			if (investor) {
				if (typeof investor === 'string') {
					selectedInvestors = investor === 'All' ? [...investors] : investor === 'None' ? [] : [investor]
				} else {
					selectedInvestors = [...investor]
				}
			} else selectedInvestors = [...investors]

			if (round) {
				if (typeof round === 'string') {
					selectedRounds = round === 'All' ? [...rounds] : round === 'None' ? [] : [round]
				} else {
					selectedRounds = [...round]
				}
			} else selectedRounds = [...rounds]

			if (sector) {
				if (typeof sector === 'string') {
					selectedSectors = sector === 'All' ? [...sectors] : sector === 'None' ? [] : [sector]
				} else {
					selectedSectors = [...sector]
				}
			} else selectedSectors = [...sectors]

			if (chain) {
				if (typeof chain === 'string') {
					selectedChains = chain === 'All' ? [...chains] : chain === 'None' ? [] : [chain]
				} else {
					selectedChains = [...chain]
				}
			} else selectedChains = [...chains]

			const minimumAmountRaised =
				typeof minRaised === 'string' && !Number.isNaN(Number(minRaised)) ? Number(minRaised) : 0

			const maximumAmountRaised =
				typeof maxRaised === 'string' && !Number.isNaN(Number(maxRaised)) ? Number(maxRaised) : 0

			const isValidTvlRange = !!minimumAmountRaised || !!maximumAmountRaised

			const filteredRaisesList = raises.filter((raise) => {
				let toFilter = true

				if (selectedInvestors.length !== investors.length) {
					if (raise.leadInvestors.length === 0 && raise.otherInvestors.length === 0) {
						return false
					}

					let isAnInvestor = false

					raise.leadInvestors.forEach((lead) => {
						if (selectedInvestors.includes(lead)) {
							isAnInvestor = true
						}
					})

					raise.otherInvestors.forEach((otherInv) => {
						if (selectedInvestors.includes(otherInv)) {
							isAnInvestor = true
						}
					})

					// filter if investor is in either leadInvestors or otherInvestors
					if (!isAnInvestor) {
						toFilter = false
					}
				}

				if (selectedChains.length !== chains.length) {
					// filter raises with no chains
					if (raise.chains.length === 0) {
						toFilter = false
					} else {
						let raiseIncludesChain = false

						raise.chains.forEach((chain) => {
							if (selectedChains.includes(chain)) {
								raiseIncludesChain = true
							}
						})

						if (!raiseIncludesChain) {
							toFilter = false
						}
					}
				}

				if (selectedRounds.length !== rounds.length) {
					// filter raises with no round
					if (!raise.round || raise.round === '') {
						toFilter = false
					} else {
						if (!selectedRounds.includes(raise.round)) {
							toFilter = false
						}
					}
				}

				if (selectedSectors.length !== sectors.length) {
					// filter raises with no sector
					if (!raise.category || raise.category === '') {
						toFilter = false
					} else {
						if (!selectedSectors.includes(raise.category)) {
							toFilter = false
						}
					}
				}

				const raisedAmount = raise.amount ? Number(raise.amount) * 1_000_000 : 0

				const isInRange =
					(minimumAmountRaised ? raisedAmount >= minimumAmountRaised : true) &&
					(maximumAmountRaised ? raisedAmount <= maximumAmountRaised : true)

				if (isValidTvlRange && !isInRange) {
					toFilter = false
				}
				return toFilter
			})

			return { selectedInvestors, selectedChains, selectedRounds, selectedSectors, filteredRaisesList }
		}, [investor, investors, round, rounds, sector, sectors, chain, chains, raises, minRaised, maxRaised])

	// prepare csv data
	const downloadCsv = () => {
		const rows = [
			[
				'Name',
				'Timestamp',
				'Date',
				'Amount Raised',
				'Round',
				'Description',
				'Lead Investor',
				'Category',
				'Source',
				'Valuation',
				'Chains',
				'Other Investors'
			]
		]

		const removeJumps = (text: string | number) =>
			typeof text === 'string' ? '"' + text.replaceAll('\n', '').replaceAll('"', "'") + '"' : text
		raises
			.sort((a, b) => b.date - a.date)
			.forEach((item) => {
				rows.push(
					[
						item.name,
						item.date,
						toNiceCsvDate(item.date),
						item.amount === null ? '' : item.amount * 1_000_000,
						item.round ?? '',
						item.sector ?? '',
						item.leadInvestors?.join(' + ') ?? '',
						item.category ?? '',
						item.source ?? '',
						item.valuation ?? '',
						item.chains?.join(' + ') ?? '',
						item.otherInvestors?.join(' + ') ?? ''
					].map(removeJumps) as string[]
				)
			})

		download(`raises.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	const totalAmountRaised = monthlyInvestment.reduce((acc, curr) => (acc += curr[1]), 0)

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
					<Stat>
						<span>Total Funding Rounds</span>
						<span>{filteredRaisesList.length}</span>
					</Stat>
					<Stat>
						<span>Total Funding Amount</span>
						<span>${formattedNum(totalAmountRaised)}</span>
					</Stat>
				</DetailsWrapper>

				<ChartWrapper>
					<BarChart chartData={monthlyInvestment} title="Monthly sum" valueSymbol="$" />
				</ChartWrapper>
			</StatsSection>

			<RaisesTable raises={filteredRaisesList} downloadCsv={downloadCsv} />
		</Layout>
	)
}

const TableFilters = styled.div`
	display: flex;
	aling-items: center;
	gap: 8px;
	flex-wrap: wrap;
	margin: 0 0 -20px;
	position: relative;

	input {
		width: 100%;
		margin-right: auto;
		border-radius: 8px;
		padding: 8px;
		padding-left: 32px;
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};

		font-size: 0.875rem;
		border: none;
	}

	@media screen and (min-width: ${({ theme: { bpSm } }) => bpSm}) {
		input {
			max-width: 400px;
		}
	}
`

const SearchIcon = styled(Search)`
	position: absolute;
	top: 8px;
	left: 8px;
	color: ${({ theme }) => theme.text3};
`

export default RaisesContainer
