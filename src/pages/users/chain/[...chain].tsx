import * as React from 'react'
import dynamic from 'next/dynamic'
import FormattedName from '~/components/FormattedName'
import { Name, StatsSection, DetailsWrapper, ChartWrapper, StatWrapper, Stat } from '~/components/ProtocolAndPool'
import { ProtocolsChainsSearch } from '~/components/Search'
import TokenLogo from '~/components/TokenLogo'
import Layout from '~/layout'
import { chainIconUrl, formattedNum } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { revalidate } from '~/api'
import { PROTOCOLS_API, USER_METRICS_CHAIN_API } from '~/constants'
import { getColor } from '~/utils/getColor'
import { transparentize } from 'polished'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export async function getStaticPaths() {
	const paths = []

	return { paths, fallback: 'blocking' }
}

export async function getStaticProps({
	params: {
		chain: [chain]
	}
}) {
	try {
		const [userMetrics, { chains }] = await Promise.all([
			fetch(`${USER_METRICS_CHAIN_API}/${chain}`).then((res) => res.json()),
			fetch(`${PROTOCOLS_API}`).then((res) => res.json())
		])

		const logoUrl = chainIconUrl(chain)

		const backgroundColor = await getColor(chain, logoUrl)

		return {
			props: {
				data: userMetrics?.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()),
				name: chains.find((c) => c.toLowerCase() === chain) || chain,
				logo: logoUrl,
				backgroundColor,
				revalidate: revalidate()
			}
		}
	} catch (error) {
		return {
			notFound: true
		}
	}
}

export default function Protocol({ name, logo, backgroundColor, data }) {
	const allTxsChart = React.useMemo(() => {
		const allTxsByDate = {}

		data.forEach((value) => {
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

	const recentMetrics = allTxsChart[allTxsChart.length - 1]

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
		</Layout>
	)
}
