import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.AGGREGATORS

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, route: 'dex-aggregators' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const DexAggregatorsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="DEX Aggregators by chain - DefiLlama">
			<ChainsByAdapter {...props} type="DEX Aggregator Volume" />
		</Layout>
	)
}

export default DexAggregatorsByChain
