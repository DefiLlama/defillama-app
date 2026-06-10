import { Announcement } from '~/components/Announcement'
import { disclaimer } from '~/containers/Yields/constants'
import { getYieldPageData } from '~/containers/Yields/queries.server'
import YieldPage from '~/containers/Yields/views/PoolsView'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/stablecoins', async () => {
	const data = await getYieldPageData()
	const {
		pools: _pools,
		stablecoinInfoBySymbol: _stablecoinInfoBySymbol,
		tokenCategories: _tokenCategories,
		usdPeggedSymbols: _usdPeggedSymbols,
		...metadata
	} = data.props

	return {
		props: { ...metadata, serverPagination: true },
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
			<YieldPage {...data} header="Stablecoin Yield Rankings" />
		</Layout>
	)
}
