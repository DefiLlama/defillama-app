import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.AGGREGATORS
const type = 'DEX Aggregators'

export const getStaticProps = withPerformanceLogging(`${slug(type)}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: slug(type)
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const DexAggregatorsVolumeOnAllChains = (props) => {
	return (
		<Layout title={`${type} - DefiLlama`} defaultSEO>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default DexAggregatorsVolumeOnAllChains
