import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES
const dataType = ADAPTER_DATA_TYPES.REVENUE

export const getStaticProps = withPerformanceLogging(`revenue/ps/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		dataType,
		chain: 'All',
		route: 'ps'
	}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const RevenueOnAllChains = (props) => {
	return (
		<Layout
			title={`P/S - DefiLlama`}
			defaultSEO
			includeInMetricsOptions={feesOptions}
			includeInMetricsOptionslabel="Include in Metrics"
		>
			<AdapterByChain {...props} type="P/S" />
		</Layout>
	)
}

export default RevenueOnAllChains
