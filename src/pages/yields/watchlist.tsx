import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import { YieldsWatchlistContainer } from '~/containers/Yields/Watchlist'
import Layout from '~/layout'
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
			title={`Saved Pools - DefiLlama`}
			description={`Saved Yields Pools on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`saved pools, defi saved pools, saved yields pools, defi saved yields pools`}
			canonicalUrl={`/yields/watchlist`}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldsWatchlistContainer protocolsDict={pools} />
		</Layout>
	)
}
