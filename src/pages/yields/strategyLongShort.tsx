import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import YieldsStrategyPageLongShort from '~/containers/Yields/indexStrategyLongShort'
import { getPerpData, getYieldPageData } from '~/containers/Yields/queries/index'
import { disclaimer } from '~/containers/Yields/utils'
import Layout from '~/layout'
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

const pageName = ['Yields: Long/Short Strategies']

export default function YieldStrategiesFR(data) {
	return (
		<Layout
			title={`Yield Long/Short Strategies - DefiLlama Yield`}
			description={`Find strategies to maximize yield by long/shorting tokens. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`yield long/short strategies, defi yield long/short strategies, long/short strategies, defi long/short strategies`}
			canonicalUrl={`/yields/strategyLongShort`}
			pageName={pageName}
		>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPageLongShort {...data} />
		</Layout>
	)
}
