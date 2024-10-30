import Layout from '~/layout'
import BridgeChainsOverview from '~/containers/BridgesPage/BridgeChainsOverview'
import { maxAgeForNext } from '~/api'
import { getBridgeChainsPageData } from '~/api/categories/bridges'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridges/chains', async () => {
	const props = await getBridgeChainsPageData()

	if (!props.filteredChains || props.filteredChains?.length === 0) {
		// TODO: Remove
		throw new Error('getBridgeChainsPageData() broken')
	}
	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

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
