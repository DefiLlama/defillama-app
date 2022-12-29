import Layout from '~/layout'
import YieldsStrategyPageFR from '~/components/YieldsPage/indexStrategyFR'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getYieldPageData, getBinanceData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()

	// todo(slasher): need to add binance symbol

	// for funding rate strategies keep only single sided no IL pools
	const filteredPools = data.props.pools
		.filter(
			(p) =>
				p.ilRisk === 'no' &&
				p.exposure === 'single' &&
				p.apy > 0 &&
				p.project !== 'babydogeswap' &&
				p.project !== 'cbridge'
		)
		.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	const fr = await getBinanceData()
	const perpMarkets = [...new Set(fr.map((p) => p.symbol.replace(/USDT|BUSD/g, '')))]
	const cgTokens = (await getAllCGTokensList()).filter((p) => perpMarkets.includes(p.symbol?.toUpperCase()))

	const tokens = []
	const tokenSymbolsList = []

	cgTokens.forEach((token) => {
		if (token.symbol) {
			tokens.push({ name: token.name, symbol: token.symbol.toUpperCase(), logo: token.image })
			tokenSymbolsList.push(token.symbol.toUpperCase())
		}
	})

	return {
		props: {
			filteredPools,
			fr,
			tokens,
			...data.props
		},
		revalidate: maxAgeForNext([23])
	}
}

export default function YieldStrategiesFR(data) {
	return (
		<Layout title={`Yield Strategies - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldsStrategyPageFR {...data} />
		</Layout>
	)
}
