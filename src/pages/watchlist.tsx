import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'
import { DefiWatchlistContainer } from '~/containers/DeFiWatchlist'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	const [{ protocols }, { chains }] = await Promise.all([
		getChainOverviewData({ chain: 'All' }),
		getChainsByCategory({ category: 'All', sampledChart: true })
	])

	return {
		props: {
			chains,
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio(props) {
	return (
		<Layout title={`Watchlist - DefiLlama`} includeInMetricsOptions={tvlOptions}>
			<DefiWatchlistContainer {...props} />
		</Layout>
	)
}
