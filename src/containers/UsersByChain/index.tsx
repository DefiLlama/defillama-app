import * as React from 'react'
import dynamic from 'next/dynamic'
import { transparentize } from 'polished'
import FormattedName from '~/components/FormattedName'
import { Name, StatsSection, DetailsWrapper, ChartWrapper, StatWrapper, Stat } from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { ListHeader, ListOptions } from '~/components/ChainPage/shared'
import { RowLinksWithDropdown } from '~/components/Filters'
import { Panel } from '~/components'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface IUsersByChainsProps {
	chart: Array<{
		day: string
		total_txs: number
		unique_users: number
	}>
	backgroundColor?: string
	logo?: string
	name: string
	chain: string
	chains: Array<{ label: string; to: string }>
	protocols: Array<string>
}

export default function UsersByChain({ chart, backgroundColor, logo, name, chains, chain }: IUsersByChainsProps) {
	const allTxsChart = React.useMemo(() => {
		const allTxsByDate = {}

		chart.forEach((value) => {
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
	}, [chart])

	const recentMetrics = allTxsChart[allTxsChart.length - 1]

	return (
		<Layout
			title={`${name ? name + ': ' : ''}User Metrics - DefiLlama`}
			defaultSEO
			backgroundColor={backgroundColor && transparentize(0.6, backgroundColor)}
			style={{ gap: '36px' }}
		>
			<ProtocolsChainsSearch />

			<StatsSection>
				<DetailsWrapper>
					<Name>
						{logo ? (
							<>
								<TokenLogo logo={logo} size={24} />
								<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
							</>
						) : (
							name
						)}
					</Name>

					<StatWrapper>
						<Stat>
							<span>24h Users</span>
							<span>{formattedNum(recentMetrics?.['Unique Users'])}</span>
						</Stat>
					</StatWrapper>
					<StatWrapper>
						<Stat>
							<span>24h Transactions</span>
							<span>{formattedNum(recentMetrics?.['Daily Transactions'])}</span>
						</Stat>
					</StatWrapper>
				</DetailsWrapper>
				<ChartWrapper>
					<BarChart chartData={allTxsChart} stacks={{ 'Unique Users': 'stackA' }} title="" color={backgroundColor} />
				</ChartWrapper>
			</StatsSection>

			<ListOptions>
				<ListHeader>User Rankings</ListHeader>
				<RowLinksWithDropdown links={chains} activeLink={chain} />
			</ListOptions>

			<Panel as="p" style={{ textAlign: 'center', margin: 0 }}>{`No protocols tracked on this chain`}</Panel>
		</Layout>
	)
}
