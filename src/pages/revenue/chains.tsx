import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByFeesAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_REVENUE
const type = 'Revenue'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByFeesAdapterPageData({ adapterType, dataType })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const RevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`${type} by Chain - DefiLlama`}
			description={`${type} by Chain. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by chain`}
			canonicalUrl={`/revenue/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default RevenueByChain
