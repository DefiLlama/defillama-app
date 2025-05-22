import { maxAgeForNext } from '~/api'
import { ChainByAdapter2 } from '~/containers/DimensionAdapters/ChainByAdapter2'
import { ADAPTOR_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const ADAPTOR_TYPE = ADAPTOR_TYPES.FEES
const dataType = 'dailyRevenue'

export const getStaticProps = withPerformanceLogging('revenue/index', async () => {
	const data = await getAdapterChainPageData({
		adaptorType: ADAPTOR_TYPE,
		dataType,
		chain: 'All',
		route: 'revenue'
	}).catch((e) => console.info(`Chain page data not found ${ADAPTOR_TYPE}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const RevenueOnAllChains = (props) => {
	return (
		<Layout title="Revenue - DefiLlama" defaultSEO>
			<ChainByAdapter2 {...props} type="Revenue" />
		</Layout>
	)
}

export default RevenueOnAllChains
