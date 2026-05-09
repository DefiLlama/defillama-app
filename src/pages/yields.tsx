import { Announcement } from '~/components/Announcement'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import YieldPage from '~/containers/Yields'
import { getLendBorrowDataFromYieldPageData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer, exploitWarning } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields', async () => {
	// trigger build
	const data = await getYieldPageData()
	const [dataBorrow, { questions: entityQuestions }] = await Promise.all([
		getLendBorrowDataFromYieldPageData(data),
		fetchEntityQuestions('yields', 'page').catch(() => ({
			questions: [] as string[]
		}))
	])
	const borrowPoolsById = new Map(dataBorrow.props.pools.map((pool) => [pool.pool, pool]))
	data.props.pools = data.props.pools.map((p) => {
		const x = borrowPoolsById.get(p.pool)
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
		props: { ...data.props, entityQuestions },
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: All Pools']

export default function ApyHomePage(data) {
	return (
		<Layout
			title="Yield Farming Rankings - Best DeFi APY Pools - DefiLlama"
			description="Find the best DeFi yield farming opportunities across all chains. Compare APY rates, TVL, and pool metrics for 10,000+ yield pools on Ethereum, Solana, Base, and 500+ networks. Real-time yield analytics."
			canonicalUrl={`/yields`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<Announcement
				announcementId="kelp-warning"
				version="2026-04"
				className="border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
			>
				{exploitWarning}
			</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
