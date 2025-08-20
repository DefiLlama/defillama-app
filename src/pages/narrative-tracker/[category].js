import { maxAgeForNext } from '~/api'
import { getCategoryInfo, getCoinPerformance } from '~/api/categories/protocols'
import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

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
		<Layout title={`Narrative Tracker - DefiLlama`}>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
