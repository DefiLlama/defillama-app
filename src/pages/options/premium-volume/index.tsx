import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = ADAPTER_DATA_TYPES.DAILY_PREMIUM_VOLUME
const type = 'Options Premium Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		dataType,
		route: 'options/premium-volume',
		metricName: type
	})

	if (!data) throw new Error('Missing page data for route=/options/premium-volume')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const PremiumVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Options Premium Volume Rankings - DefiLlama"
			description="Track options premium volume by protocol, the value paid buying and selling options on DeFi exchanges."
			canonicalUrl={`/options/premium-volume`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PremiumVolumeOnAllChains
