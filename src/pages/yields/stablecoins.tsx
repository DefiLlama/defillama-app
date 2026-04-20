import { Announcement } from '~/components/Announcement'
import YieldPage from '~/containers/Yields'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer, exploitWarning } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/stablecoins', async () => {
	const data = await getYieldPageData()

	return {
		props: { ...data.props },
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Stablecoin Yields']

export default function YieldPlots(data) {
	return (
		<Layout
			title={`Best Stablecoin Yields - DeFi Liquidity Pools by APY`}
			description="Find the best stablecoin yield pools ranked by APY. Compare USDC, USDT, DAI, and other stablecoin farming opportunities across all chains."
			canonicalUrl={`/yields/stablecoins`}
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
			<YieldPage {...data} header="Stablecoin Yield Rankings" />
		</Layout>
	)
}
