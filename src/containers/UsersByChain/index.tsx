import * as React from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import Layout from '~/layout'
import {
	Wrapper,
	StatsSection,
	StatsWrapper,
	Stat,
	ChartWrapper,
	LinksWrapper,
	TableHeader,
	Fallback
} from '~/layout/Chain'
import { ProtocolsChainsSearch } from '~/components/Search'
import { formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { RowLinksWithDropdown } from '~/components/Filters'

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

export default function UsersByChain({ chart, backgroundColor, name, chains, chain }: IUsersByChainsProps) {
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
				<LinksWrapper>
					<RowLinksWithDropdown links={chains} activeLink={chain} />
				</LinksWrapper>

				<StatsSection>
					<StatsWrapper>
						<Stat>
							<span>24h Unique Users</span>
							<span>{formattedNum(recentMetrics?.['Unique Users'])}</span>
						</Stat>

						<Stat>
							<span>24h New Users</span>
							<span>{formattedNum(recentMetrics?.['New Users'])}</span>
						</Stat>

						<Stat>
							<span>24h Transactions</span>
							<span>{formattedNum(recentMetrics?.['Daily Transactions'])}</span>
						</Stat>
					</StatsWrapper>
					<ChartWrapper>
						<BarChart
							chartData={allTxsChart}
							stacks={{ 'Unique Users': 'stackA', 'New Users': 'stackB' }}
							seriesConfig={{
								stackA: {
									color: '#66c2a5'
								},
								stackB: {
									type: 'line',
									symbol: 'none',
									color: '#fc8d62'
								}
							}}
							title=""
						/>
					</ChartWrapper>
				</StatsSection>

				<TableHeader>User Rankings</TableHeader>
				<Fallback>{`No protocols tracked on this chain`}</Fallback>
			</Wrapper>
		</Layout>
	)
}
