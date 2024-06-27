import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getCategoryPerformance } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { CategoryPerformanceContainer } from '~/containers/CategoryPerformanceContainer'

export const getStaticProps = withPerformanceLogging('category-performance', async ({ params }) => {
	const performance = await getCategoryPerformance()
	const coinPerformanceFilteredToCategory = performance.coinPerformance.filter((i) => i.categoryId === params.category)

	return {
		props: {
			categoryPerformance: coinPerformanceFilteredToCategory
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const performance = await getCategoryPerformance()

	const paths = performance.categoryPerformance.map((i) => ({
		params: { category: i.categoryId.toString() }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Performance(props) {
	return (
		<Layout title={`Performance - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Performance', name: props.token, route: 'category-performance' }} />

			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
