import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import YieldPage from '~/containers/Yields'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/stablecoins', async () => {
	const data = await getYieldPageData()

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Stablecoin Pools']

export default function YieldPlots(data) {
	return (
		<Layout
			title={`Stablecoins - DefiLlama Yield`}
			description={`Stablecoin Pools by APY values. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`stablecoin pools by apy values, defi stablecoin pools, defi stablecoin pools by apy, stablecoin yields`}
			canonicalUrl={`/yields/stablecoins`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
