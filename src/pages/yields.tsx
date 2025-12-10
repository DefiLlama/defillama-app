import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import YieldPage from '~/containers/Yields'
import { getLendBorrowData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields', async () => {
	// trigger build
	const data = await getYieldPageData()
	const dataBorrow = await getLendBorrowData()
	data.props.pools = data.props.pools.map((p) => {
		const x = dataBorrow.props.pools.find((i) => i.pool === p.pool)
		return {
			...p,
			apyBaseBorrow: x?.apyBaseBorrow ?? null,
			apyRewardBorrow: x?.apyRewardBorrow ?? null,
			apyBorrow: x?.apyBorrow ?? null,
			totalSupplyUsd: x?.totalSupplyUsd ?? null,
			totalBorrowUsd: x?.totalBorrowUsd ?? null,
			totalAvailableUsd: x?.totalAvailableUsd ?? null,
			ltv: x?.ltv ?? null
		}
	})

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: All Pools']

export default function ApyHomePage(data) {
	return (
		<Layout
			title={`Yield Rankings - DefiLlama`}
			description={`Yield Rankings on DefiLlama. Pools by APY, TVL, and other metrics on all chains. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`yield rankings, defi yield rankings, pools by apy, pools by tvl, pools by other metrics`}
			canonicalUrl={`/yields`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
