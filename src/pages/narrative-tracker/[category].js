import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { maxAgeForNext } from '~/api'
import { getCoinPerformance, getCategoryInfo } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { CategoryPerformanceContainer } from '~/containers/CategoryPerformanceContainer'

export const getStaticProps = withPerformanceLogging('category-performance', async ({ params }) => {
	const data = await getCoinPerformance(params.category)

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const info = await getCategoryInfo()

	const paths = info.map((i) => ({
		params: { category: i.id.toString() }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Returns(props) {
	return (
		<Layout title={`Narrative Tracker - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
