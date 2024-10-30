import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/Filters'
import { formatChartTvlsByDay } from '~/hooks/data'
import { formattedNum, getPrevTvlFromChart2, getTokenDominance } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'
import { formatDataWithExtraTvls } from '~/hooks/data/defi'
import { useDefiManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsTableWithSearch } from '~/components/Table/Defi/Protocols'

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
})
const charts = ['TVS']

const chartColors = {
	TVS: '#4f8fea'
}

export const getStaticProps = withPerformanceLogging(
	'oracles/[...oracle]',
	async ({
		params: {
			oracle: [oracle, chain]
		}
	}) => {
		const data = await getOraclePageData(oracle, chain)

		return {
			...data,
			revalidate: maxAgeForNext([22])
		}
	}
)

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

const PageView = ({ chartData, tokenLinks, token, filteredProtocols, chain, chainChartData, oracleMonthlyVolumes }) => {
	const [extraTvlsEnabled] = useDefiManager()
	const { protocolsData, finalChartData, totalValue } = useMemo(() => {
		const protocolsData = formatDataWithExtraTvls({
			data: filteredProtocols,
			extraTvlsEnabled
		})

		const finalChartData = formatChartTvlsByDay({ data: chainChartData || chartData, extraTvlsEnabled, key: 'TVS' })

		const totalValue = getPrevTvlFromChart2(finalChartData, 0, 'TVS')

		return { protocolsData, finalChartData, totalValue }
	}, [chainChartData, chartData, extraTvlsEnabled, filteredProtocols])

	const topToken = {}

	if (protocolsData.length > 0) {
		topToken.name = protocolsData[0]?.name
		topToken.tvl = protocolsData[0]?.tvl
	}

	const dominance = getTokenDominance(topToken, totalValue)

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Oracles', name: token, route: 'oracles' }} />
			<h1 className="text-2xl font-medium -mb-5">
				Total Value Secured by {token} {chain ? `on ${chain}` : null}
			</h1>
			<ChartAndValuesWrapper>
				<BreakpointPanels>
					<BreakpointPanel>
						<h1>Total Value Secured (USD)</h1>
						<p style={{ '--tile-text-color': '#4f8fea' }}>{formattedNum(totalValue, true)}</p>
					</BreakpointPanel>
					<BreakpointPanel>
						<h2>Total Volume Secured (30d)</h2>
						<p style={{ '--tile-text-color': '#fd3c99' }}> {formattedNum(oracleMonthlyVolumes[token] ?? 0, true)}</p>
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

			<nav className="flex items-center gap-5 overflow-hidden -mb-5">
				<RowLinksWithDropdown links={tokenLinks} activeLink={chain ?? 'All'} />
			</nav>

			<ProtocolsTableWithSearch data={protocolsData} />
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
