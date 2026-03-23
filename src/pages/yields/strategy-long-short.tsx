import { fetchAllCGTokensList } from '~/api'
import { Announcement } from '~/components/Announcement'
import YieldsStrategyPageLongShort from '~/containers/Yields/indexStrategyLongShort'
import { getPerpData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/strategy-long-short', async () => {
	const data = await getYieldPageData()

	// for funding rate strategies keep only single sided no IL pools
	const filteredPools = data.props.pools
		.filter(
			(p) =>
				p.ilRisk === 'no' &&
				p.exposure === 'single' &&
				p.apy > 0 &&
				p.project !== 'babydogeswap' &&
				p.project !== 'cbridge' &&
				!p.symbol.includes('ADAI') &&
				!p.symbol.includes('DOP') &&
				!p.symbol.includes('COPI') &&
				!p.symbol.includes('EUROPOOL') &&
				!p.symbol.includes('UMAMI')
		)
		.map((p) => ({ ...p, symbol: p.symbol?.toUpperCase() }))

	const poolsUniqueSymbols = new Set(filteredPools.map((p) => p.symbol))

	const perps = (await getPerpData()).filter((m) => m.fundingRate > 0)
	// filter search token to only include what we have in pool arrays
	const cgTokens = (await fetchAllCGTokensList()).filter((t) => poolsUniqueSymbols.has(t.symbol?.toUpperCase()))
	const tokens = []
	const tokenSymbolsList = []

	for (const token of cgTokens) {
		if (token.symbol) {
			tokens.push({
				name: token.name,
				symbol: token.symbol?.toUpperCase(),
				logo: token.image2 || null,
				fallbackLogo: token.image || null
			})
			tokenSymbolsList.push(token.symbol?.toUpperCase())
		}
	}

	return {
		props: {
			filteredPools,
			perps,
			tokens,
			...data.props
		},
		revalidate: maxAgeForNext([23])
	}
})

const pageName = ['Yields: Long/Short Strategies']

export default function YieldStrategiesFR(data) {
	return (
		<Layout
			title={`Long/Short Strategies - DefiLlama Yield`}
			description="Find long/short yield strategies across DeFi. Pair directional positions with yield farming to maximize returns."
			canonicalUrl={`/yields/strategy-long-short`}
			pageName={pageName}
		>
			<Announcement announcementId="yields-disclaimer" version="2026-03">
				{disclaimer}
			</Announcement>
			<YieldsStrategyPageLongShort {...data} />
		</Layout>
	)
}
