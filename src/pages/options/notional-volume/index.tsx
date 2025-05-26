import { maxAgeForNext } from '~/api'
import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = 'dailyNotionalVolume'
const type = 'Options Notional Volume'

export const getStaticProps = withPerformanceLogging(`${slug(type)}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		dataType,
		route: 'options/notional-volume'
	}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const NotionalVolumeOnAllChains = (props) => {
	return (
		<Layout title={`${type} - DefiLlama`} defaultSEO>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default NotionalVolumeOnAllChains
