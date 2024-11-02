import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { transparentize } from 'polished'
import Layout from '~/layout'
import { Wrapper, ChartWrapper, TableHeader, Fallback } from '~/layout/Chain'
import { StatsWrapper, Stat } from '~/layout/Stats/Large'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/Filters/common/RowLinksWithDropdown'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IUsersByChainsProps {
	chart: Array<{
		day: string
		total_txs: number
		new_users: number
		unique_users: number
	}>
	backgroundColor?: string
	logo?: string
	name: string
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<string>
}

export function UsersByChain({ chart, backgroundColor, name, chains, chain }: IUsersByChainsProps) {
	const allTxsChart = React.useMemo(() => {
		const allTxsByDate = {}

		chart.forEach((value) => {
			const day = new Date(value.day).getTime() / 1000

			// intialize object with date and column type props
			if (!allTxsByDate[day]) {
				allTxsByDate[day] = {
					'New Users': 0,
					'Unique Users': 0,
					'Daily Transactions': 0
				}
			}

			// sum all values of same category on same date
			allTxsByDate[day]['New Users'] += value.new_users
			allTxsByDate[day]['Unique Users'] += value.unique_users
			allTxsByDate[day]['Daily Transactions'] += value.total_txs
		})

		return Object.keys(allTxsByDate).map((date) => ({
			date,
			...allTxsByDate[date]
		}))
	}, [chart])

	const recentMetrics = allTxsChart[allTxsChart.length - 1]

	return (
		<Layout
			title={`${name ? name + ': ' : ''}User Metrics - DefiLlama`}
			defaultSEO
			backgroundColor={backgroundColor && transparentize(0.6, backgroundColor)}
			style={{ gap: '36px' }}
		>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Users', hideOptions: true }} />

			<Wrapper>
				<nav className="flex items-center gap-5 overflow-hidden col-span-full">
					<RowLinksWithDropdown links={chains} activeLink={chain} />
				</nav>

				<StatsWrapper>
					<Stat>
						<span>24h Unique Users</span>
						<span>{formattedNum(recentMetrics?.['Unique Users'])}</span>
					</Stat>

					<hr />

					<Stat>
						<span>24h New Users</span>
						<span>{formattedNum(recentMetrics?.['New Users'])}</span>
					</Stat>

					<hr />

					<Stat>
						<span>24h Transactions</span>
						<span>{formattedNum(recentMetrics?.['Daily Transactions'])}</span>
					</Stat>
				</StatsWrapper>
				<ChartContainer>
					<BarChart
						chartData={allTxsChart}
						stacks={stacks}
						seriesConfig={seriesConfig}
						title=""
						chartOptions={chartOptions}
					/>
				</ChartContainer>

				<TableHeader>User Rankings</TableHeader>
				<Fallback>{`No protocols being tracked on this chain`}</Fallback>
			</Wrapper>
		</Layout>
	)
}

const stacks = { 'Unique Users': 'stackA', 'New Users': 'stackB' }

const seriesConfig = {
	stackA: {
		color: '#2172E5'
	},
	stackB: {
		type: 'line',
		symbol: 'none',
		color: '#E59421'
	}
}

const chartOptions = {
	legend: {
		right: null // set legend to center, default is right on larger screens
	}
}

const ChartContainer = styled(ChartWrapper)`
	margin-top: -32px;

	@media screen and (min-width: 80rem) {
		margin-top: 0;
	}
`
