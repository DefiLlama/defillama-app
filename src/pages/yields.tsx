import { Announcement } from '~/components/Announcement'
import YieldPage from '~/containers/Yields'
import { getLendBorrowData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
			title="DeFi Yield Farming Rankings - Best APY Pools by Chain - DefiLlama"
			description="Find the best DeFi yield farming opportunities across all chains. Compare APY rates, TVL, and pool metrics for 10,000+ yield pools on Ethereum, Solana, Base, and 500+ networks. Real-time yield analytics."
			canonicalUrl={`/yields`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
