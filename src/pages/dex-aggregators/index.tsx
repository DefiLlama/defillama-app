import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.AGGREGATORS
const type = 'DEX Aggregator Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'dex-aggregators',
		metricName: type
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const DexAggregatorsVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="DEX Aggregator Rankings - Swap Routing Analytics - DefiLlama"
			description="Track DEX aggregator volume and swap routing activity. Compare swap volume across 1inch, CowSwap, OpenOcean, and 100+ DEX aggregators. Real-time swap routing analytics with best price execution data."
			canonicalUrl={`/dex-aggregators`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default DexAggregatorsVolumeOnAllChains
