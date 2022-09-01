import Layout from '~/layout'
import PeggedChainsOverview from '~/components/PeggedPage/PeggedChainsOverview'
import { revalidate } from '~/api'
import { getPeggedChainsPageData } from '~/api/categories/stablecoins'

export async function getStaticProps() {
	const props = await getPeggedChainsPageData()

	if (!props.chainCirculatings || props.chainCirculatings?.length === 0) { // TODO: Remove
		throw new Error("getPeggedChainsPageData() broken")
	}
	return {
		props,
		revalidate: revalidate()
	}
}

export default function PeggedAssets({
	chainCirculatings,
	chartData,
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent,
	chainTVLData
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedChainsOverview
				chainCirculatings={chainCirculatings}
				chartData={chartData}
				peggedChartDataByChain={peggedChartDataByChain}
				chainList={chainList}
				chainsGroupbyParent={chainsGroupbyParent}
				chainTVLData={chainTVLData}
			/>
		</Layout>
	)
}
