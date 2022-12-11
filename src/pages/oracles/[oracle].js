import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Layout from '~/layout'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper } from '~/components'
import { ProtocolsTable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { RowLinksWithDropdown, RowLinksWrapper } from '~/components/Filters'
import { useCalcExtraTvlsByDay, useCalcStakePool2Tvl } from '~/hooks/data'
import { formattedNum, getPercentChange, getPrevTvlFromChart, getTokenDominance } from '~/utils'
import { addMaxAgeHeaderForNext } from '~/api'
import { getOraclePageData } from '~/api/categories/protocols'

const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
})

export const getServerSideProps = async ({ params: { oracle }, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const data = await getOraclePageData(oracle)

	return {
		...data
	}
}

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
