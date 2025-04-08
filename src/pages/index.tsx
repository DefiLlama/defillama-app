import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainOverview } from '~/ChainOverview'
import { getChainOverviewData } from '~/ChainOverview/queries.server'

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
