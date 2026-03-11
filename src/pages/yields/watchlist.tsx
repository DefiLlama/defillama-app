import { Announcement } from '~/components/Announcement'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import { YieldsWatchlistContainer } from '~/containers/Yields/Watchlist'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/watchlist', async () => {
	const data = await getYieldPageData()

	return {
		props: { pools: data.props.pools },
		revalidate: maxAgeForNext([23])
	}
})

export default function Portfolio({ pools }) {
	return (
		<Layout
			title={`Your Saved DeFi Yield Pools - DefiLlama`}
			description="Track your saved DeFi yield pools in one place. Monitor APY changes, TVL, and performance for your bookmarked pools on DefiLlama."
			canonicalUrl={`/yields/watchlist`}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldsWatchlistContainer protocolsDict={pools} />
		</Layout>
	)
}
