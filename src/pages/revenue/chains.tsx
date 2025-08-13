import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.REVENUE

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'revenue' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const RevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="Revenue by Chain - DefiLlama">
			<ChainsByAdapter {...props} type="Revenue" />
		</Layout>
	)
}

export default RevenueByChain
