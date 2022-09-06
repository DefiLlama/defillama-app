import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, ProtocolsTable } from '~/components'
import { ProtocolsChainsSearch } from '~/components/Search'
import { columnsToShow } from '~/components/Table'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { revalidate } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'

const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
})

export async function getStaticProps({ params: { oracle } }) {
	const data = await getOraclePageData(oracle)

	return {
		...data,
		revalidate: revalidate()
	}
}

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

const columns = columnsToShow(
	'protocolName',
	'category',
	'chains',
	'1dChange',
	'7dChange',
	'1mChange',
	'tvl',
	'mcaptvl'
)

const PageView = ({ chartData, tokenLinks, token, filteredProtocols }) => {
	const protocolsData = useCalcStakePool2Tvl(filteredProtocols)

	const finalChartData = useCalcExtraTvlsByDay(chartData)

	const { totalVolume, volumeChangeUSD } = useMemo(() => {
		const totalVolume = getPrevTvlFromChart(finalChartData, 0)
		const tvlPrevDay = getPrevTvlFromChart(finalChartData, 1)
		const volumeChangeUSD = getPercentChange(totalVolume, tvlPrevDay)
		return { totalVolume, volumeChangeUSD }
	}, [finalChartData])

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
					<Chart
						display="liquidity"
						dailyData={finalChartData}
						totalLiquidity={totalVolume}
						liquidityChange={volumeChangeUSD}
						title="TVS"
					/>
				</BreakpointPanel>
			</ChartAndValuesWrapper>

			<RowLinksWrapper>
				<RowLinksWithDropdown links={tokenLinks} activeLink={token} />
			</RowLinksWrapper>

			<ProtocolsTable columns={columns} data={protocolsData} />
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
