import { maxAgeForNext } from '~/api'
import { DefiWatchlistContainer } from '~/containers/ProtocolList/Watchlist'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('watchlist', async () => {
	return {
		props: {},
		revalidate: maxAgeForNext([22])
	}
})

export default function Portfolio() {
	return (
		<Layout title={`Saved TVL Rankings - DefiLlama`} defaultSEO>
			<DefiWatchlistContainer />
		</Layout>
	)
}
