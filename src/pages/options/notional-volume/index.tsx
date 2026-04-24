import { AdapterByChain } from '~/containers/DimensionAdapters/AdapterByChain'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from '~/containers/DimensionAdapters/constants'
import { getAdapterByChainPageData } from '~/containers/DimensionAdapters/queries'
import type { IAdapterByChainPageData } from '~/containers/DimensionAdapters/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const adapterType = ADAPTER_TYPES.OPTIONS
const dataType = ADAPTER_DATA_TYPES.DAILY_NOTIONAL_VOLUME
const type = 'Options Notional Volume'

export const getStaticProps = withPerformanceLogging(`${type}/index`, async () => {
	const data = await getAdapterByChainPageData({
		adapterType,
		chain: 'All',
		dataType,
		route: 'options/notional-volume',
		metricName: type
	})

	if (!data) throw new Error('Missing page data')

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', type]

const NotionalVolumeOnAllChains = (props: IAdapterByChainPageData) => {
	return (
		<Layout
			title="Options Notional Volume Rankings - DefiLlama"
			description="Track options notional volume by protocol, the sum of the notional value traded on DeFi options exchanges."
			canonicalUrl={`/options/notional-volume`}
			pageName={pageName}
		>
			<AdapterByChain {...props} type={type} />
		</Layout>
	)
}

export default NotionalVolumeOnAllChains
