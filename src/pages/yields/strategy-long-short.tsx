import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/containers/Yields/constants'
import YieldsStrategyPageLongShort from '~/containers/Yields/views/LongShortStrategyView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/strategy-long-short', async () => {
	const { getYieldLongShortPageMetadata } = await import('~/containers/Yields/server/dataset')
	const metadata = await getYieldLongShortPageMetadata()

	return {
		props: metadata,
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Long/Short Strategies']

export default function YieldStrategiesFR(data) {
	return (
		<Layout
			title={`Long/Short Strategies - DefiLlama Yield`}
			description="Find long/short yield strategies across DeFi. Pair directional positions with yield farming to maximize returns."
			canonicalUrl={`/yields/strategy-long-short`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<YieldsStrategyPageLongShort {...data} />
		</Layout>
	)
}
