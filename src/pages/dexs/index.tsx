import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.DEXS
const type = 'DEX Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		route: 'dexs',
		metricName: type
	}).catch((e) => console.info(`Chain page data not found ${adapterType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const DexsVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="DEX Volume Rankings - Decentralized Exchange Trading - DefiLlama"
			description="Track DEX swap volume and trading activity across all decentralized exchanges. Compare 24h and 7-day volume on Uniswap, Curve, PancakeSwap, and 500+ spot DEXs. Real-time DEX volume rankings by protocol and chain."
			canonicalUrl={`/dexs`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default DexsVolumeOnAllChains
