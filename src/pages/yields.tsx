import { Announcement } from '~/components/Announcement'
import { fetchEntityQuestions } from '~/containers/LlamaAI/api'
import { disclaimer, exploitWarning } from '~/containers/Yields/constants'
import { getYieldPageData } from '~/containers/Yields/queries.server'
import YieldPage from '~/containers/Yields/views/PoolsView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields', async () => {
	const [data, { questions: entityQuestions }] = await Promise.all([
		getYieldPageData(),
		fetchEntityQuestions('yields', 'page').catch(() => ({
			questions: [] as string[]
		}))
	])
	const {
		pools: _pools,
		stablecoinInfoBySymbol: _stablecoinInfoBySymbol,
		tokenCategories: _tokenCategories,
		usdPeggedSymbols: _usdPeggedSymbols,
		...metadata
	} = data.props

	return {
		props: { ...metadata, entityQuestions, serverPagination: true },
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
