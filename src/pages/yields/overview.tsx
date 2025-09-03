import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { PlotsPage } from '~/containers/Yields/indexPlots'
import { getYieldMedianData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
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

const pageName = ['Yields: Overview']

export default function YieldPlots(data) {
	return (
		<Layout
			title={`Overview - DefiLlama Yield`}
			description={`Overview of defi yields. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`overview of defi yields, defi yields overview`}
			canonicalUrl={`/yields/overview`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<PlotsPage {...data} />
		</Layout>
	)
}
