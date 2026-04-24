import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS_AGGREGATOR
const type = 'Perp Aggregator Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'perps-aggregators',
		metricName: type
	})

	if (!data) throw new Error('Missing page data for route=/perps-aggregators')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const PerpsAggregatorsVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Perps Aggregator Rankings - Futures Routing - DefiLlama"
			description="Track perps aggregator volume by protocol, the notional volume of leveraged trades routed through aggregators."
			canonicalUrl={`/perps-aggregators`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PerpsAggregatorsVolumeOnAllChains
