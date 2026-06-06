import { feesOptions } from '~/components/Filters/options'
import { ChainsByAdapter } from '~/containers/AdapterMetrics/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/AdapterMetrics/constants'
import { getChainsByAdapterPageData } from '~/containers/AdapterMetrics/queries'
import type { IChainsByAdapterPageData } from '~/containers/AdapterMetrics/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_APP_FEES
const type = 'App Fees'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({
		adapterType,
		dataType,
		chainMetadata: metadataCache.chainMetadata,
		includeChartData: false
	})

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const AppFeesByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`App Fee Rankings by Blockchain - DefiLlama`}
			description="Compare app fees by chain, excluding stablecoins, liquid staking apps, and gas fees."
			canonicalUrl={`/app-fees/chains`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in App Fees"
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default AppFeesByChain
