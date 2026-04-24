import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPEN_INTEREST
const dataType = ADAPTER_DATA_TYPES.OPEN_INTEREST_AT_END
const type = 'Open Interest'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'open-interest',
		metricName: type
	})

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const OpenInterestOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Open Interest Rankings - DeFi Derivatives - DefiLlama"
			description="Track crypto open interest rankings across all derivatives protocols. Compare total open interest on Hyperliquid, Aster, Lighter, and 50+ perp DEXs. Real-time open interest analytics and leverage exposure data."
			canonicalUrl={`/open-interest`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default OpenInterestOnAllChains
