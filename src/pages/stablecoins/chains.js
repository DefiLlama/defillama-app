import { maxAgeForNext } from '~/api'
import PeggedChainsOverview from '~/containers/Stablecoins/ChainsWithStablecoins'
import { getPeggedChainsPageData } from '~/containers/Stablecoins/queries.server'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('stablecoins/chains', async () => {
	const props = await getPeggedChainsPageData()

	if (!props.chainCirculatings || props.chainCirculatings?.length === 0) {
		// TODO: Remove
		throw new Error('getPeggedChainsPageData() broken')
	}
	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

export default function PeggedAssets({
	chainCirculatings,
	chartData,
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedChainsOverview
				chainCirculatings={chainCirculatings}
				chartData={chartData}
				peggedChartDataByChain={peggedChartDataByChain}
				chainList={chainList}
				chainsGroupbyParent={chainsGroupbyParent}
			/>
		</Layout>
	)
}
