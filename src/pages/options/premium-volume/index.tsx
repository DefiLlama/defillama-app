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
	}).catch((e) => console.info(`Chain page data not found ${adapterType}:${dataType} : ALL_CHAINS`, e))

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const PremiumVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Options Premium Volume Rankings - DeFi Options Trading - DefiLlama"
			description="Track options premium volume by DeFi protocol. Compare options trading activity across protocols on DefiLlama."
			canonicalUrl={`/options/premium-volume`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default PremiumVolumeOnAllChains
