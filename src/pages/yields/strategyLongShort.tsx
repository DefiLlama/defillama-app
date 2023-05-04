import Layout from '~/layout'
import YieldsStrategyPageLongShort from '~/components/YieldsPage/indexStrategyLongShort'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getYieldPageData, getPerpData } from '~/api/categories/yield'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/strategyLongShort', async () => {
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

	const poolsUniqueSymbols = [...new Set(filteredPools.map((p) => p.symbol))]

	const perps = (await getPerpData()).filter((m) => m.fundingRate > 0)
	// filter search token to only include what we have in pool arrays
	const cgTokens = (await getAllCGTokensList()).filter((t) => poolsUniqueSymbols.includes(t.symbol?.toUpperCase()))
	const tokens = []
	const tokenSymbolsList = []

	cgTokens.forEach((token) => {
		if (token.symbol) {
			tokens.push({
				name: token.name,
				symbol: token.symbol?.toUpperCase(),
				logo: token.image2 || null,
				fallbackLogo: token.image || null
			})
			tokenSymbolsList.push(token.symbol?.toUpperCase())
		}
	})

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

export default function YieldStrategiesFR(data) {
	return (
		<Layout title={`Yield Strategies - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPageLongShort {...data} />
		</Layout>
	)
}
