import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const type = 'P/F'

export const getStaticProps = withPerformanceLogging(`fees/pf/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'pf',
		metricName: type
	})

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const FeesOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`Price to Fees Ratio (P/F) Rankings - DefiLlama`}
			description="Compare DeFi protocols by Price to Fees (P/F) ratio. Evaluate protocol valuations relative to total fees generated."
			canonicalUrl={`/pf`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Metrics"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default FeesOnAllChains
