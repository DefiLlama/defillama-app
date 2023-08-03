import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { getYieldPageData, getLendBorrowData } from '~/api/categories/yield'
import { getAllCGTokensList, maxAgeForNext } from '~/api'
import Announcement from '~/components/Announcement'
import { disclaimer } from '~/components/YieldsPage/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('yields', async () => {
	const data = await getYieldPageData()
	const dataBorrow = await getLendBorrowData()
	// data.props.pools = data.props.pools.filter((p) => p.apy > 0)
	data.props.pools = data.props.pools.map((p) => {
		const x = dataBorrow.props.pools.find((i) => i.pool === p.pool)
		if (x === undefined) return p
		return {
			...p,
			apyBaseBorrow: x.apyBaseBorrow,
			apyRewardBorrow: x.apyRewardBorrow,
			apyBorrow: x.apyBorrow,
			totalSupplyUsd: x.totalSupplyUsd,
			totalBorrowUsd: x.totalBorrowUsd,
			totalAvailableUsd: x.totalAvailableUsd,
			ltv: x.ltv
		}
	})

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

export default function ApyHomePage(data) {
	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<Announcement>{disclaimer}</Announcement>
			<YieldPage {...data} />
		</Layout>
	)
}
