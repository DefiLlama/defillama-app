import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.BRIDGE_AGGREGATORS
const type = 'Bridge Aggregator Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'bridge-aggregators',
		metricName: type
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const BridgeAggregatorsVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Bridge Aggregator Rankings - Cross-Chain Routing Analytics - DefiLlama"
			description="Track bridge aggregator volume and cross-chain transfers routed through aggregators. Compare volume across Bungee, LI.FI, Socket, and 20+ bridge aggregators. Real-time bridge routing analytics across all chains."
			canonicalUrl={`/bridge-aggregators`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default BridgeAggregatorsVolumeOnAllChains
