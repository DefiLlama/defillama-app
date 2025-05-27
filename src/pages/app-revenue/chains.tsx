import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = 'dailyAppRevenue'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'app-revenue' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const HoldersRevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title="App Revenue by chain - DefiLlama">
			<ChainsByAdapter {...props} type="App Revenue" />
		</Layout>
	)
}

export default HoldersRevenueByChain
