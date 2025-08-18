import { DefiWatchlistContainer } from '~/containers/ProtocolList/Watchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { tvlOptions } from '~/components/Filters/options'
import { PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { formatProtocolsData } from '~/api/categories/protocols/utils'
import { getDexVolumeByChain, getFeesAndRevenueProtocolsByChain } from '~/api/categories/adaptors'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	const [protocolsData, protocolsVolumeByChainData, protocolsFeesAndRevenueByChain, chainsData] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		getDexVolumeByChain({
			chain: 'All',
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		}),
		getFeesAndRevenueProtocolsByChain({
			chain: 'All'
		}),
		getChainsByCategory({ category: 'All', sampledChart: true })
	])

	const { protocols, parentProtocols } = protocolsData
	const { chains, chainAssets } = chainsData
	const { protocols: protocolsVolumeByChain } = protocolsVolumeByChainData

	const protocolsList = formatProtocolsData({
		chain: null,
		protocols,
		removeBridges: true
	})

	return {
		props: {
			protocolsList,
			parentProtocols,
			protocolsVolumeByChain,
			protocolsFeesAndRevenueByChain,
			chains,
			chainAssets
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio({
	protocolsList,
	parentProtocols,
	protocolsVolumeByChain,
	protocolsFeesAndRevenueByChain,
	chains,
	chainAssets
}) {
	return (
		<Layout title={`Watchlist - DefiLlama`} defaultSEO includeInMetricsOptions={tvlOptions}>
			<DefiWatchlistContainer
				protocolsList={protocolsList}
				parentProtocols={parentProtocols}
				protocolsVolumeByChain={protocolsVolumeByChain}
				protocolsFeesAndRevenueByChain={protocolsFeesAndRevenueByChain}
				chains={chains}
				chainAssets={chainAssets}
			/>
		</Layout>
	)
}
