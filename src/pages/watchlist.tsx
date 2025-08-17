import { DefiWatchlistContainer } from '~/containers/ProtocolList/Watchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { tvlOptions } from '~/components/Filters/options'
import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { formatProtocolsData } from '~/api/categories/protocols/utils'
import { getDexVolumeByChain, getFeesAndRevenueProtocolsByChain } from '~/api/categories/adaptors'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	const { protocols, parentProtocols } = await fetchJson(PROTOCOLS_API)

	const protocolsList = formatProtocolsData({
		chain: null,
		protocols,
		removeBridges: true
	})

	const { protocols: protocolsVolumeByChain } = await getDexVolumeByChain({
		chain: 'All',
		excludeTotalDataChart: false,
		excludeTotalDataChartBreakdown: true
	})

	const protocolsFeesAndRevenueByChain = await getFeesAndRevenueProtocolsByChain({
		chain: 'All'
	})

	return {
		props: {
			protocolsList,
			parentProtocols,
			protocolsVolumeByChain,
			protocolsFeesAndRevenueByChain
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio({
	protocolsList,
	parentProtocols,
	protocolsVolumeByChain,
	protocolsFeesAndRevenueByChain
}) {
	return (
		<Layout title={`Watchlist - DefiLlama`} defaultSEO includeInMetricsOptions={tvlOptions}>
			<DefiWatchlistContainer
				protocolsList={protocolsList}
				parentProtocols={parentProtocols}
				protocolsVolumeByChain={protocolsVolumeByChain}
				protocolsFeesAndRevenueByChain={protocolsFeesAndRevenueByChain}
			/>
		</Layout>
	)
}
