import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.AGGREGATORS
const dataType = ADAPTER_DATA_TYPES.DAILY_VOLUME
const type = 'DEX Aggregator Volume'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({ adapterType, dataType, chainMetadata: metadataCache.chainMetadata })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const DexAggregatorsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`${type} by Chain - DefiLlama`}
			description={`Live ${type} by chain. Compare volumes across networks with multi-timeframe data, historical volume trends and chain dominance tracking.`}
			keywords={`${type} by chain`}
			canonicalUrl={`/dex-aggregators/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default DexAggregatorsByChain
