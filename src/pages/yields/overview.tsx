import Layout from '~/layout'
import { PlotsPage } from '~/Yields/indexPlots'
import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/Yields/utils'
import { maxAgeForNext } from '~/api'
import { getYieldPageData, getYieldMedianData } from '~/Yields/queries/index'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/overview', async () => {
	const {
		props: { ...data }
	} = await getYieldPageData()
	data.pools = data.pools.filter((p) => p.apy > 0)
	const median = await getYieldMedianData()

	return {
		props: { ...data, median: median.props },
		revalidate: maxAgeForNext([23])
	}
})

export default function YieldPlots(data) {
	return (
		<Layout title={`Overview - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<PlotsPage {...data} />
		</Layout>
	)
}
