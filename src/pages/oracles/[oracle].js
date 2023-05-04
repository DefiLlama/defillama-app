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
import { getOraclePageData } from '~/api/categories/protocols'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
})
const charts = ['TVS']

const chartColors = {
	TVS: '#4f8fea'
}

export const getStaticProps = withPerformanceLogging('oracles/[oracle]', async ({ params: { oracle } }) => {
	const data = await getOraclePageData(oracle)

	return {
		...data,
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const { oracles = {} } = await getOraclePageData()

	const oraclesList = Object.keys(oracles)

	const paths = oraclesList.slice(0, 10).map((oracle) => {
		return {
			params: { oracle }
		}
	})

	return { paths, fallback: 'blocking' }
}

const PageView = ({ chartData, tokenLinks, token, filteredProtocols }) => {
	const [extraTvlsEnabled] = useDefiManager()

	const { protocolsData, finalChartData, totalVolume, volumeChangeUSD } = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chartData, extraTvlsEnabled, key: 'TVS' })

		const totalVolume = getPrevTvlFromChart2(finalChartData, 0, 'TVS')
		const tvlPrevDay = getPrevTvlFromChart2(finalChartData, 1, 'TVS')
		const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
		return { protocolsData, finalChartData, totalVolume, volumeChangeUSD }
	}, [chartData, extraTvlsEnabled, filteredProtocols])

	const topToken = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const tvs = formattedNum(totalVolume, true)

	const dominance = getTokenDominance(topToken, totalVolume)

	const percentChange = volumeChangeUSD?.toFixed(2)

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Oracles', name: token, route: 'oracles' }} />

			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Secured (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{tvs}</p>
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

			<ProtocolsTable data={protocolsData} />
		</>
	)
}

export default function Oracles(props) {
	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
