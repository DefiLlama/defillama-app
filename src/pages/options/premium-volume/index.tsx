import { maxAgeForNext } from '~/api'
import { TMetric } from '~/components/Metrics'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = 'dailyPremiumVolume'
const type: TMetric = 'Options Premium Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		dataType,
		route: 'options/premium-volume'
	}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const PremiumVolumeOnAllChains = (props) => {
	return (
		<Layout title={`${type} - DefiLlama`} defaultSEO className="gap-2">
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PremiumVolumeOnAllChains
