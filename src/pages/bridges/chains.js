import Layout from '~/layout'
import BridgeChainsOverview from '~/components/BridgesPage/BridgeChainsOverview'
import { revalidate } from '~/api'
import { getBridgeChainsPageData } from '~/api/categories/bridges'

export async function getStaticProps() {
	const props = await getBridgeChainsPageData()

	if (!props.filteredChains || props.filteredChains?.length === 0) { // TODO: Remove
		throw new Error("getBridgeChainsPageData() broken")
	}
	return {
		props,
		revalidate: revalidate()
	}
}

export default function BridgeChains({
	chains,
	filteredChains,
	chainToChartDataIndex,
	formattedVolumeChartData
}) {
	return (
		<Layout title={`Bridges - DefiLlama`} defaultSEO>
			<BridgeChainsOverview
				chains={chains}
				filteredChains={filteredChains}
				chainToChartDataIndex={chainToChartDataIndex}
				formattedVolumeChartData={formattedVolumeChartData}
			/>
		</Layout>
	)
}
