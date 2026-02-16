import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_APP_FEES
const type = 'App Fees'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({
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

const AppFeesByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`${type} by Chain - DefiLlama`}
			description={`${type} by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by chain`}
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
