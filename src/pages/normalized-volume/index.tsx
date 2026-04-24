import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.NORMALIZED_VOLUME
const type = 'Normalized Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'normalized-volume',
		metricName: type
	})

	if (!data) throw new Error('Missing page data for route=/normalized-volume')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const NormalizedVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Normalized DEX Volume Rankings - DefiLlama"
			description="Track normalized perp volume with suspected wash trading filtered out. Compare genuine trading activity based on liquidity and market conditions."
			canonicalUrl={`/normalized-volume`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default NormalizedVolumeOnAllChains
