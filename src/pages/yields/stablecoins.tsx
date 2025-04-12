import Layout from '~/layout'
import YieldPage from '~/containers/Yields'
import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/containers/Yields/utils'
import { maxAgeForNext } from '~/api'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/stablecoins', async () => {
	const data = await getYieldPageData()

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([23])
	}
})

export default function YieldPlots(data) {
	return (
		<Layout title={`Stablecoins - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
