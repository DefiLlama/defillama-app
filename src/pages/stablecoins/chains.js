import Layout from '~/layout'
import PeggedChainsOverview from '~/components/PeggedChainsOverview'
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
	peggedChartDataByChain,
	chainList,
	chainsGroupbyParent,
	chainTVLData,
	allChartData,
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedChainsOverview
				chainCirculatings={chainCirculatings}
				peggedChartDataByChain={peggedChartDataByChain}
				chainList={chainList}
				chainsGroupbyParent={chainsGroupbyParent}
				chainTVLData={chainTVLData}
				allChartData={allChartData}
			/>
		</Layout>
	)
}
