import * as React from 'react'
import dynamic from 'next/dynamic'
import FormattedName from '~/components/FormattedName'
import {
	Name,
	ChartsWrapper,
	LazyChart,
	SectionHeader,
	StatsSection,
	DetailsWrapper,
	ChartWrapper
} from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { capitalizeFirstLetter, tokenIconUrl } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import styled from 'styled-components'
import { SelectLegendMultiple } from '~/components/ECharts/shared'
import { revalidate } from '~/api'
import { USER_METRICS_PROTOCOL_API } from '~/constants'
import { getProtocol } from '~/api/categories/protocols'
import { getColor } from '~/utils/getColor'
import { transparentize } from 'polished'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IChainData {
	[key: string]: string | number
}

export async function getStaticPaths() {
	const paths = []

	return { paths, fallback: 'blocking' }
}

export async function getStaticProps({
	params: {
		protocol: [protocol]
	}
}) {
	const [userMetrics, protocolData] = await Promise.all([
		fetch(`${USER_METRICS_PROTOCOL_API}/${protocol}`).then((res) => res.json()),
		getProtocol(protocol)
	])

	const backgroundColor = await getColor(protocol, protocolData.logo || tokenIconUrl(protocol))

	const { uniqueChains, uniqueColumns } = userMetrics?.reduce(
		(acc, curr) => {
			acc.uniqueChains.add(capitalizeFirstLetter(curr.chain))
			acc.uniqueColumns.add(curr.column_type)

			return acc
		},
		{ uniqueChains: new Set(), uniqueColumns: new Set() }
	)

	return {
		props: {
			data: userMetrics?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()),
			name: protocolData.name || protocol,
			logo: protocolData.logo || tokenIconUrl(protocol),
			uniqueChains: Array.from(uniqueChains),
			uniqueColumns: Array.from(uniqueColumns),
			backgroundColor,
			revalidate: revalidate()
		}
	}
}

export default function Protocol({ name, logo, backgroundColor, data, uniqueChains, uniqueColumns }) {
	const allTxsChart = React.useMemo(() => {
		const allTxsByDate = {}
		const txs = data?.filter((item) => item.column_type === 'all')

		txs.forEach((value) => {
			const day = new Date(value.day).getTime() / 1000

			// intialize object with date and column type props
			if (!allTxsByDate[day]) {
				allTxsByDate[day] = {
					'Daily Transactions': 0,
					'Unique Users': 0
				}
			}

			// sum all values of same category on same date
			allTxsByDate[day]['Daily Transactions'] += value.total_txs
			allTxsByDate[day]['Unique Users'] += value.unique_users
		})

		return Object.keys(allTxsByDate).map((date) => ({
			date,
			...allTxsByDate[date]
		}))
	}, [data])

	return (
		<Layout
			title={`${name}: User Metrics - DefiLlama`}
			defaultSEO
			backgroundColor={transparentize(0.6, backgroundColor)}
			style={{ gap: '36px' }}
		>
			<ProtocolsChainsSearch />

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>

					{/* <StatWrapper>
						<Stat>
							<span>Transactions</span>
							<span></span>
						</Stat>
					</StatWrapper> */}
				</DetailsWrapper>
				<ChartWrapper>
					<BarChart chartData={allTxsChart} stacks={{ 'Unique Users': 'stackA' }} title="" color={backgroundColor} />
				</ChartWrapper>
			</StatsSection>

			<Charts data={data} chains={uniqueChains} columns={uniqueColumns} />
		</Layout>
	)
}

const Charts = ({ data, chains, columns }) => {
	const [selectedChains, setSelectedChains] = React.useState(chains)

	const { uniqueUsersChart, uniqueUsersStack, dailyTxsStack, dailyTxsChart } = React.useMemo(() => {
		const uniqueUsersByDate = {}
		const dailyTxsByDate = {}
		const chartStacks = {}

		selectedChains?.forEach((selectedChain) => {
			const transactions = data?.filter((item) => item.chain === selectedChain.toLowerCase())

			transactions.forEach((value) => {
				const day = new Date(value.day).getTime() / 1000

				// check if date is present in data and initialize objects with date and column type props
				if (!uniqueUsersByDate[day]) {
					const keys =
						columns.length === 1 && columns.includes('all')
							? ['Unique Users', 'Daily Transactions']
							: [...columns.filter((c) => c !== 'all').map((c) => capitalizeFirstLetter(c)), 'Others']

					uniqueUsersByDate[day] = {}
					dailyTxsByDate[day] = {}

					keys.forEach((key) => {
						// set same stack key for all categories, so they render on top of each other
						chartStacks[key] = 'stackA'

						// initialize category on a day with 0
						uniqueUsersByDate[day][key] = 0
						dailyTxsByDate[day][key] = 0
					})
				}

				const columnType = capitalizeFirstLetter(value.column_type)

				// If theres only 1 column and its 'All' then you hover on charts, show the value other than 'All' or 'Others' //
				if (columnType === 'All' && columns.length === 1) {
					uniqueUsersByDate[day]['Unique Users'] += value.unique_users
					dailyTxsByDate[day]['Daily Transactions'] += value.total_txs
				} else if (columnType === 'All') {
					// store user metrics of column type 'all', so we can calculate remaining txs of the day after subtracting tx types like deposit, withdraw later //
					uniqueUsersByDate[day]['Others'] += value.unique_users
					dailyTxsByDate[day]['Others'] += value.total_txs
				} else {
					// subtract values of columns types like deposit/withdraw from column type 'all' to show under Remaining txs of the day
					uniqueUsersByDate[day]['Others'] -= value.unique_users
					dailyTxsByDate[day]['Others'] -= value.total_txs
				}

				// sum values of this category or column type under same date
				uniqueUsersByDate[day][columnType] += value.unique_users
				dailyTxsByDate[day][columnType] += value.total_txs
			})
		})

		const uniqueUsersChart: Array<IChainData> = Object.keys(uniqueUsersByDate).map((date) => ({
			date,
			...uniqueUsersByDate[date]
		}))

		const dailyTxsChart: Array<IChainData> = Object.keys(dailyTxsByDate).map((date) => ({
			date,
			...dailyTxsByDate[date]
		}))

		return {
			uniqueUsersChart,
			dailyTxsChart,
			uniqueUsersStack: columns.length === 1 && columns.includes('all') ? { 'Unique Users': 'a' } : chartStacks,
			dailyTxsStack: columns.length === 1 && columns.includes('all') ? { 'Daily Transactions': 'a' } : chartStacks
		}
	}, [data, selectedChains, columns])

	return (
		<>
			<SectionHeaderWrapper>
				<SectionHeader>Charts</SectionHeader>
				{chains.length > 1 && (
					<SelectLegendMultiple
						allOptions={chains}
						options={selectedChains}
						setOptions={setSelectedChains}
						title={selectedChains.length === 1 ? 'Chain' : 'Chains'}
					/>
				)}
			</SectionHeaderWrapper>

			<ChartsWrapper>
				<>
					<LazyChartWrapper>
						<BarChart chartData={dailyTxsChart} title="Daily Transactions" stacks={dailyTxsStack} height="400px" />
					</LazyChartWrapper>
					<LazyChartWrapper>
						<BarChart chartData={uniqueUsersChart} title="Unique Users" stacks={uniqueUsersStack} height="400px" />
					</LazyChartWrapper>
				</>
			</ChartsWrapper>
		</>
	)
}

const LazyChartWrapper = styled(LazyChart)`
	grid-column: 1 / -1;
	min-height: 400px;
`

const SectionHeaderWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24px;
	position: relative;
`
