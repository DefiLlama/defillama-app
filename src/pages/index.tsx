import { maxAgeForNext } from '~/api'
import { ChainOverview } from '~/containers/ChainOverview'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('index', async () => {
	const data = await getChainOverviewData({
		chain: 'All'
	})

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function HomePage(props) {
	return <ChainOverview {...props} />
}
