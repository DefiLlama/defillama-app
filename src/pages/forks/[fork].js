import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from '~/components'
import { ProtocolsTable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart2, getTokenDominance } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getForkPageData } from '~/api/categories/protocols'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
})

const charts = ['TVL']

const chartColors = {
	TVL: '#4f8fea'
}

export async function getStaticProps({ params: { fork } }) {
	const data = await getForkPageData(fork)

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
}

export async function getStaticPaths() {
	const { forks = {} } = await getForkPageData()

	const forksList = Object.keys(forks)

	const paths = forksList.slice(0, 10).map((fork) => {
		return {
			params: { fork }
		}
	})

	return { paths, fallback: 'blocking' }
}

const PageView = ({ chartData, tokenLinks, token, filteredProtocols, parentTokens }) => {
	const [extraTvlsEnabled] = useDefiManager()

	const { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD } = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const parentForks = formatDataWithExtraTvls({
			data: parentTokens,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chartData, extraTvlsEnabled, key: 'TVL' })

		const totalVolume = getPrevTvlFromChart2(finalChartData, 0, 'TVL')
		const tvlPrevDay = getPrevTvlFromChart2(finalChartData, 1, 'TVL')
		const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
		return { protocolsData, parentForks, finalChartData, totalVolume, volumeChangeUSD }
	}, [chartData, filteredProtocols, parentTokens, extraTvlsEnabled])

	const topToken = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const tvl = formattedNum(totalVolume, true)

	const dominance = getTokenDominance(topToken, totalVolume)

	const percentChange = volumeChangeUSD?.toFixed(2)

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Forks', name: token, route: 'forks' }} />

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Locked (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{tvl}</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Change (24h)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' }}> {percentChange || 0}%</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>{topToken.name} Dominance</h2>
						<p style={{ '--tile-text-color': '#46acb7' }}> {dominance}%</p>
					</BreakpointPanel>
				</BreakpointPanels>
				<BreakpointPanel id="chartWrapper">
					<Chart chartData={finalChartData} stackColors={chartColors} stacks={charts} title="" valueSymbol="$" />
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink={token} />
			</RowLinksWrapper>

			<ProtocolsTable data={protocolsData} pinnedRow={parentForks[0]} />
		</>
	)
}

export default function Forks(props) {
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
