import type { InferGetStaticPropsType } from 'next'
import { tvlOptions } from '~/components/Filters/options'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { DefiWatchlistContainer } from '~/containers/DeFiWatchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const [{ protocols }, { chains }] = await Promise.all([
		getChainOverviewData({
			chain: 'All',
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata
		}),
		getChainsByCategory({
			chainMetadata: metadataCache.chainMetadata,
			category: 'All',
			sampledChart: true
		})
	])

	return {
		props: {
			chains,
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title="Watchlist - Track DeFi Protocols & Chains - DefiLlama"
			description="Create your personalized DeFi watchlist to track favorite protocols and chains. Monitor TVL changes, APY rates, and price movements. Save and compare your selected DeFi investments in one dashboard."
			canonicalUrl={`/watchlist`}
			metricFilters={tvlOptions}
		>
			<DefiWatchlistContainer {...props} />
		</Layout>
	)
}
