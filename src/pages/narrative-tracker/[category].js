import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns, getCategoryChartData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

export const getStaticProps = withPerformanceLogging('category-returns', async ({ params }) => {
	const returns = await getCategoryReturns()
	const coinReturnsFilteredToCategory = returns.coinReturns.filter((i) => i.categoryId === params.category)

	const returnsChart = await getCategoryChartData()
	const returnsChartData = {}
	const coinsInCategory = returnsChart.categoryInfo.filter((coin) => coin.category_id === params.category)
	const coinsUnique = Object.fromEntries(coinsInCategory.map((c) => [c.coin_id, c.coin_name]))

	returnsChart.coinReturns.forEach((coin) => {
		if (coinsUnique[coin.coin_id]) {
			returnsChartData[coin.truncated_day] = {
				date: Math.floor(new Date(coin.truncated_day).getTime() / 1000),
				...(returnsChartData[coin.truncated_day] ?? {}),
				[coinsUnique[coin.coin_id]]: coin.cumulative_return * 100
			}
		}
	})

	return {
		props: {
			returns: coinReturnsFilteredToCategory,
			isCoinPage: true,
			categoryName: coinReturnsFilteredToCategory[0].categoryName,
			returnsChartData: Object.values(returnsChartData),
			coinsInCategory: Object.values(coinsUnique)
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const returns = await getCategoryReturns()

	const paths = returns.categoryReturns.map((i) => ({
		params: { category: i.id.toString() }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Returns(props) {
	return (
		<Layout title={`Narrative Tracker - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch
				step={{ category: 'Narrative Tracker', name: props.categoryName, route: 'narrative-tracker' }}
			/>
			<CategoryReturnsContainer {...props} />
		</Layout>
	)
}
