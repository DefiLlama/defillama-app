import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.DEXS
const dataType = ADAPTER_DATA_TYPES.DAILY_VOLUME
const type = 'DEX Volume'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({ adapterType, dataType, chainMetadata: metadataCache.chainMetadata })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const DexsByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title={`${type} by Chain - DefiLlama`}
			description={`Live ${type} rankings by chain. Track activity across Ethereum, Solana, Base, Arbitrum and 500+ networks. Filter by 24h or 30d.`}
			keywords={`${type} by chain`}
			canonicalUrl={`/dexs/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default DexsByChain
