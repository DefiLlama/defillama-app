import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.BRIDGE_AGGREGATORS

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, route: 'bridge-aggregators' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const BridgeAggregatorsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Bridge Aggregators by chain - DefiLlama">
			<ChainsByAdapter {...props} type="Bridge Aggregator Volume" />
		</Layout>
	)
}

export default BridgeAggregatorsByChain
