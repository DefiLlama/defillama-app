import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS_AGGREGATOR

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, route: 'perps-aggregators' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const PerpsAggregatorsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Perp Aggregator Volume by Chain - DefiLlama">
			<ChainsByAdapter {...props} type="Perp Aggregator Volume" />
		</Layout>
	)
}

export default PerpsAggregatorsByChain
