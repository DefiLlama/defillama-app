import { maxAgeForNext } from '~/api'
import { TMetric } from '~/components/Metrics'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.PERPS_AGGREGATOR
const type: TMetric = 'Perp Aggregator Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'perps-aggregators'
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const PerpsAggregatorsVolumeOnAllChains = (props) => {
	return (
		<Layout title={`${type} by Protocol - DefiLlama`} defaultSEO>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PerpsAggregatorsVolumeOnAllChains
