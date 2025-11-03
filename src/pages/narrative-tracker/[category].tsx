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

const pageName = ['Narrative Tracker', 'by', 'Category']

export default function Returns(props) {
	return (
		<Layout
			title={`Narrative Tracker - DefiLlama`}
			description={`Narrative Tracker by ${props.category}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`narrative tracker, defi narrative tracker, narrative tracker by ${props.category}`}
			canonicalUrl={`/narrative-tracker/${props.category}`}
			pageName={pageName}
		>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
