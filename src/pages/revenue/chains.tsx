import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByFeesAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_REVENUE
const type = 'Revenue'

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

const RevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title="DeFi Revenue by Chain - All Blockchains - DefiLlama"
			description="Compare DeFi protocol revenue across all blockchains. Track actual revenue (fees retained) on Ethereum, Solana, Base, Arbitrum, and 150+ chains. Real-time blockchain revenue analytics by chain."
			canonicalUrl={`/revenue/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default RevenueByChain
