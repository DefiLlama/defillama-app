import { Announcement } from '~/components/Announcement'
import YieldPage from '~/containers/Yields'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
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

const pageName = ['Yields: Stablecoin Pools']

export default function YieldPlots(data) {
	return (
		<Layout
			title={`Stablecoin Pools - DefiLlama Yield`}
			description="Find the best stablecoin yield pools ranked by APY. Compare USDC, USDT, DAI, and other stablecoin farming opportunities across all chains."
			canonicalUrl={`/yields/stablecoins`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<Announcement announcementId="resolv-exploit" version="2026-03" warning>
				USR is depegging following an exploit on Resolv (unauthorized minting of 50M unbacked USR). Protocol functions are paused. Follow Resolv's X for updates.
			</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
