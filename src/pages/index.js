import Layout from '~/layout'
import { RAISES_API } from '~/constants'
import { maxAgeForNext } from '~/api'
import { getChainPageData } from '~/api/categories/chains'
import { getPeggedOverviewPageData } from '~/api/categories/stablecoins'

import { withPerformanceLogging } from '~/utils/perf'

import { fetchWithErrorLogging } from '~/utils/async'
import { ChainContainer } from '~/containers/ChainContainer'

import { groupBy, mapValues, sumBy } from 'lodash'
import { buildPeggedChartData } from '~/utils/stablecoins'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainPageData()
	const raisesData = await fetch(RAISES_API).then((r) => r.json())
	const stablecoinsData = await getPeggedOverviewPageData(null)
	const bridgeData = null

	const bridgeChartData = bridgeData
		? bridgeData?.chainVolumeData?.map((volume) => [volume?.date, volume?.Deposits, volume.Withdrawals])
		: null

	const raisesChart =
		raisesData && raisesData?.raises
			? mapValues(
					groupBy(raisesData.raises, (val) => val.date),
					(raises) => sumBy(raises, 'amount')
			  )
			: null

	const { peggedAreaTotalData } = buildPeggedChartData(
		stablecoinsData?.chartDataByPeggedAsset,
		stablecoinsData?.peggedAssetNames,
		Object.values(stablecoinsData?.peggedNameToChartDataIndex || {}),
		'mcap',
		stablecoinsData?.chainTVLData,
		'All'
	)

	return {
		props: {
			...data.props,
			raisesData,
			stablecoinsChartData: peggedAreaTotalData,
			bridgeChartData,
			raisesChart,
			totalFundingAmount: raisesChart ? Object.values(raisesChart).reduce((acc, curr) => (acc += curr), 0) * 1e6 : null
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return (
		<Layout title="DefiLlama - DeFi Dashboard">
			<ChainContainer {...props} />
		</Layout>
	)
}
