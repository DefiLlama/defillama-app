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
	chartData,
	peggedAreaChainData,
	peggedAreaMcapData,
	stackedDataset,
	peggedChartType,
	chainList,
	chainsGroupbyParent
}) {
	return (
		<Layout title={`Stablecoins Circulating - DefiLlama`} defaultSEO>
			<PeggedChainsOverview
				chainCirculatings={chainCirculatings}
				chartData={chartData}
				peggedAreaChainData={peggedAreaChainData}
				peggedAreaMcapData={peggedAreaMcapData}
				stackedDataset={stackedDataset}
				peggedChartType={peggedChartType}
				chainList={chainList}
				chainsGroupbyParent={chainsGroupbyParent}
			/>
		</Layout>
	)
}
