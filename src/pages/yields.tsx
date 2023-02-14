import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { getYieldPageData } from '~/api/categories/yield'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'

export async function getStaticProps() {
	const data = await getYieldPageData()
	data.props.pools = data.props.pools.filter((p) => p.apy > 0)

	const cgTokens = await getAllCGTokensList()

	const tokens = []
	const tokenSymbolsList = []

	cgTokens.forEach((token) => {
		if (token.symbol) {
			tokens.push({
				name: token.name,
				symbol: token.symbol.toUpperCase(),
				logo: token.image2 || null,
				fallbackLogo: token.image || null
			})
			tokenSymbolsList.push(token.symbol.toUpperCase())
		}
	})

	return {
		props: { ...data.props, tokens, tokenSymbolsList },
		revalidate: maxAgeForNext([23])
	}
}

export default function ApyHomePage(data) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
