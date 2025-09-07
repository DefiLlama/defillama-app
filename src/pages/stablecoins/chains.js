import { maxAgeForNext } from '~/api'
import { CHART_COLORS } from '~/constants/colors'
import { ChainsWithStablecoins } from '~/containers/Stablecoins/ChainsWithStablecoins'
import { getPeggedChainsPageData } from '~/containers/Stablecoins/queries.server'
import { buildStablecoinChartData, getPrevStablecoinTotalFromChart } from '~/containers/Stablecoins/utils'
import Layout from '~/layout'
import { formattedNum, getPercentChange } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('stablecoins/chains', async () => {
	const props = await getPeggedChainsPageData()

	if (!props.chainCirculatings || props.chainCirculatings?.length === 0) {
		// TODO: Remove
		throw new Error('getPeggedChainsPageData() broken')
	}

	const totalMcapCurrent = getPrevStablecoinTotalFromChart(props.chartData, 0, 'totalCirculatingUSD')
	const totalMcapPrevDay = getPrevStablecoinTotalFromChart(props.chartData, 1, 'totalCirculatingUSD')
	const totalMcapPrevWeek = getPrevStablecoinTotalFromChart(props.chartData, 7, 'totalCirculatingUSD')
	const totalMcapPrevMonth = getPrevStablecoinTotalFromChart(props.chartData, 30, 'totalCirculatingUSD')
	const change1d = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2) ?? '0'
	const change7d = getPercentChange(totalMcapCurrent, totalMcapPrevWeek)?.toFixed(2) ?? '0'
	const change30d = getPercentChange(totalMcapCurrent, totalMcapPrevMonth)?.toFixed(2) ?? '0'
	const change1d_nol = formattedNum(
		String(totalMcapCurrent && totalMcapPrevDay ? parseFloat(totalMcapCurrent) - parseFloat(totalMcapPrevDay) : 0),
		true
	)
	const change7d_nol = formattedNum(
		String(totalMcapCurrent && totalMcapPrevDay ? parseFloat(totalMcapCurrent) - parseFloat(totalMcapPrevWeek) : 0),
		true
	)
	const change30d_nol = formattedNum(
		String(totalMcapCurrent && totalMcapPrevDay ? parseFloat(totalMcapCurrent) - parseFloat(totalMcapPrevMonth) : 0),
		true
	)

	const { peggedAreaChartData, peggedAreaTotalData, stackedDataset } = buildStablecoinChartData({
		chartDataByAssetOrChain: props.peggedChartDataByChain,
		assetsOrChainsList: props.chainList,
		filteredIndexes: [...Array(props.chainList.length).keys()],
		issuanceType: 'mcap'
	})

	return {
		props: {
			chainCirculatings: props.chainCirculatings,
			chartData: props.chartData,
			chainList: props.chainList,
			chainsGroupbyParent: props.chainsGroupbyParent,
			change1d: change1d.startsWith('-') ? change1d : `+${change1d}`,
			change7d: change7d.startsWith('-') ? change7d : `+${change7d}`,
			change30d: change30d.startsWith('-') ? change30d : `+${change30d}`,
			totalMcapCurrent,
			change1d_nol: change1d_nol.startsWith('-') ? change1d_nol : `+${change1d_nol}`,
			change7d_nol: change7d_nol.startsWith('-') ? change7d_nol : `+${change7d_nol}`,
			change30d_nol: change30d_nol.startsWith('-') ? change30d_nol : `+${change30d_nol}`,
			peggedAreaChartData: peggedAreaChartData,
			peggedAreaTotalData: {
				MCap: {
					name: 'Mcap',
					stack: 'Mcap',
					color: CHART_COLORS[0],
					data: peggedAreaTotalData.map(({ date, Mcap }) => [+date * 1e3, Mcap]),
					type: 'line'
				}
			},
			stackedDataset: stackedDataset
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', 'Stablecoins Supply']

export default function PeggedAssets(props) {
	return (
		<Layout
			title={`Stablecoins Circulating - DefiLlama`}
			description={`Stablecoins Circulating by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`stablecoins circulating by chain, stablecoins supply by chain, stablecoins market cap by chain`}
			canonicalUrl={`/stablecoins/chains`}
			pageName={pageName}
		>
			<ChainsWithStablecoins {...props} />
		</Layout>
	)
}
