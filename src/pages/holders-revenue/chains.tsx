import { maxAgeForNext } from '~/api'
import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.DAILY_HOLDERS_REVENUE
const type = 'Holders Revenue'

export const getStaticProps = withPerformanceLogging(`${adapterType}/chains`, async () => {
	const data = await getChainsByAdapterPageData({ adapterType, dataType, route: 'holders-revenue' })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const HoldersRevenueByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout title={`${type} by Chain - DefiLlama`} pageName={pageName}>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default HoldersRevenueByChain
