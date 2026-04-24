import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_EARNINGS
const type = 'Earnings'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'earnings',
		metricName: type
	})

	if (!data) throw new Error('Missing page data for route=/earnings')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const EarningsOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="DeFi Earnings & Net Profit Rankings - DefiLlama"
			description="Track DeFi protocol earnings and net profit rankings. Compare sustainable earnings (revenue minus incentives) across 500+ protocols. Real-time earnings analytics showing true profitability after token incentives."
			canonicalUrl={`/earnings`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in Earnings"
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default EarningsOnAllChains
