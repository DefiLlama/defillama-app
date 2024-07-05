import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

export const getStaticProps = withPerformanceLogging('category-returns', async ({ params }) => {
	const returns = await getCategoryReturns()
	const coinReturnsFilteredToCategory = returns.coinReturns.filter((i) => i.categoryId === params.category)

	return {
		props: {
			returns: coinReturnsFilteredToCategory,
			isCoinPage: true,
			categoryName: coinReturnsFilteredToCategory[0].categoryName
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
