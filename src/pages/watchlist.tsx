import { DefiWatchlistContainer } from '~/containers/ProtocolList/Watchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { tvlOptions } from '~/components/Filters/options'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio() {
	return (
		<Layout title={`Saved TVL Rankings - DefiLlama`} defaultSEO includeInMetricsOptions={tvlOptions}>
			<DefiWatchlistContainer />
		</Layout>
	)
}
