import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getYieldPageData } from '~/api/categories/yield'

export async function getStaticProps() {
	const data = await getYieldPageData()
	const cgTokens = await getAllCGTokensList()
	data.props.pools = data.props.pools.filter((p) => p.apy > 0)

	const tokens = []
	const tokenSymbolsList = []

	cgTokens.forEach((token) => {
		if (token.symbol) {
			tokens.push({ name: token.name, symbol: token.symbol.toUpperCase(), logo: token.image })
			tokenSymbolsList.push(token.symbol.toUpperCase())
		}
	})

	return {
		props: { ...data.props, tokens, tokenSymbolsList },
		revalidate: maxAgeForNext([23])
	}
}

export default function YieldPlots(data) {
	return (
		<Layout title={`Stablecoins - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
