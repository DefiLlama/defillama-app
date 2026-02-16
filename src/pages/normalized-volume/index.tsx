import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.NORMALIZED_VOLUME
const type = 'Normalized Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'normalized-volume',
		metricName: type
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const NormalizedVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title={`${type} by Protocol - DefiLlama`}
			description={`${type} by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${type} by protocol`}
			canonicalUrl={`/normalized-volume`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default NormalizedVolumeOnAllChains
