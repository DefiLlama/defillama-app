import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_APP_REVENUE
const type = 'App Revenue'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'app-revenue' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const HoldersRevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`${type} by Chain - DefiLlama`}
			description={`${type} by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by chain`}
			canonicalUrl={`/app-revenue/chains`}
			metricFilters={feesOptions}
			metricFiltersLabel="Include in App Revenue"
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default HoldersRevenueByChain
