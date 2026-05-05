import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_REVENUE
const type = 'P/S'

export const getStaticProps = withPerformanceLogging(`revenue/ps/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'ps',
		metricName: type
	})

	if (!data) throw new Error('Missing page data for route=/ps')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const RevenueOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`Price to Sales Ratio (P/S) Rankings - DefiLlama`}
			description="Compare DeFi protocols by Price to Sales (P/S) ratio. Identify undervalued and overvalued protocols based on revenue multiples."
			canonicalUrl={`/ps`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Metrics"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default RevenueOnAllChains
