import Layout from '~/layout'
import YieldPageBorrow from '~/components/YieldsPage/indexBorrow'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import { getLendBorrowData } from '~/api/categories/yield'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields/borrow', async () => {
	const data = await getLendBorrowData()

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
})

export default function YieldBorrow(data) {
	return (
		<Layout title={`Lend/Borrow rates - DefiLlama Yield`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPageBorrow {...data} />
		</Layout>
	)
}
