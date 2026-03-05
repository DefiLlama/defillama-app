import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByFeesAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_FEES
const type = 'Fees'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByFeesAdapterPageData({
		adapterType,
		dataType,
		chainMetadata: metadataCache.chainMetadata
	})

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const FeesByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title="Fees by Blockchain - User Fees Generated Across All Chains - DefiLlama"
			description="Compare DeFi fees generated across all blockchains. Track total user fees on Ethereum, Solana, Base, Arbitrum, and 150+ chains. Real-time blockchain fee analytics by chain and category."
			canonicalUrl={`/fees/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default FeesByChain
