import { ChainsByAdapter } from '~/containers/DimensionAdapters/ChainsByAdapter'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getChainsByAdapterPageData } from '~/containers/DimensionAdapters/queries'
import type { IChainsByAdapterPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = ADAPTER_DATA_TYPES.DAILY_PREMIUM_VOLUME
const type = 'Options Premium Volume'

export const getStaticProps = withPerformanceLogging(`${adapterType}/${dataType}/chains`, async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const data = await getChainsByAdapterPageData({ adapterType, dataType, chainMetadata: metadataCache.chainMetadata })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', type]

const OptionsPremiumVolumeByChain = (props: IChainsByAdapterPageData) => {
	return (
		<Layout
			title="Options Premium Volume by Chain - DeFi Options Activity - DefiLlama"
			description="Compare DeFi options premium volume across blockchains on DefiLlama."
			canonicalUrl={`/options/premium-volume/chains`}
			pageName={pageName}
		>
			<ChainsByAdapter {...props} type={type} />
		</Layout>
	)
}

export default OptionsPremiumVolumeByChain
