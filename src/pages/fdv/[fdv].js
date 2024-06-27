import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search'
import { maxAgeForNext } from '~/api'
import { getCategoryPerformance } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { FdvContainer } from '~/containers/FdvContainer'

export const getStaticProps = withPerformanceLogging('fdv', async ({ params }) => {
	const performance = await getCategoryPerformance()
	const coinPerformanceFilteredToCategory = performance.coinPerformance.filter((i) => i.categoryId === params.fdv)

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
		params: { fdv: i.categoryId.toString() }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Performance(props) {
	return (
		<Layout title={`Performance - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Performance', name: props.token, route: 'fdv' }} />

			<FdvContainer {...props} />
		</Layout>
	)
}
