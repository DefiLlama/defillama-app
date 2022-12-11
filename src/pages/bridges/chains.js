import Layout from '~/layout'
import BridgeChainsOverview from '~/components/BridgesPage/BridgeChainsOverview'
import { addMaxAgeHeaderForNext } from '~/api'
import { getBridgeChainsPageData } from '~/api/categories/bridges'

export const getServerSideProps = async ({ params, res }) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const props = await getBridgeChainsPageData()

	if (!props.filteredChains || props.filteredChains?.length === 0) {
		// TODO: Remove
		throw new Error('getBridgeChainsPageData() broken')
	}
	return {
		props
	}
}

export default function BridgeChains({ chains, filteredChains, chainToChartDataIndex, formattedVolumeChartData }) {
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
