import { maxAgeForNext } from '~/api'
import { feesOptions } from '~/components/Filters/options'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.FEES

export const getStaticProps = withPerformanceLogging(`fees/pf/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'pf'
	}).catch((e) => console.info(`Chain page data not found P/F : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const FeesOnAllChains = (props) => {
	return (
		<Layout
			title={`P/F - DefiLlama`}
			defaultSEO
			includeInMetricsOptions={feesOptions}
			includeInMetricsOptionslabel="Include in Metrics"
		>
			<AdapterByChain {...props} type="P/F" />
		</Layout>
	)
}

export default FeesOnAllChains
