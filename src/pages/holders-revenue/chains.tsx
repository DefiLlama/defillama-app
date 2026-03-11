import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE
const type = 'Holders Revenue'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({ adapterType, dataType, chainMetadata: metadataCache.chainMetadata })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const HoldersRevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title="Holders Revenue by Chain - Token Holder Earnings Across Chains - DefiLlama"
			description="Compare token holder revenue across blockchains on DefiLlama."
			canonicalUrl={`/holders-revenue/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default HoldersRevenueByChain
