import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/containers/Yields/constants'
import YieldsStrategyPage from '~/containers/Yields/views/StrategyFinderView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/strategy', async () => {
	const { getYieldStrategyPageMetadata } = await import('~/containers/Yields/server/dataset')
	const metadata = await getYieldStrategyPageMetadata()

	return {
		props: metadata,
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Delta Neutral Strategies']

export default function YieldStrategies(data) {
	return (
		<Layout
			title={`Delta Neutral Strategies - DefiLlama Yield`}
			description="Find delta-neutral lend-borrow-farm strategies. Compare APY, LTV, available liquidity, and farm TVL across DeFi."
			canonicalUrl={`/yields/strategy`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<YieldsStrategyPage {...data} />
		</Layout>
	)
}
