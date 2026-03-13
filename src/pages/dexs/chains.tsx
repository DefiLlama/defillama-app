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
			title="DEX Volume by Chain - Spot Trading - DefiLlama"
			description="Compare DEX swap volume across all blockchains. Track decentralized exchange trading activity on Ethereum, Solana, Base, Arbitrum, and 200+ chains. Real-time blockchain DEX volume rankings by chain."
			canonicalUrl={`/dexs/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default DexsByChain
