import { maxAgeForNext } from '~/api'
import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'
import { getCategoryInfo, getCoinPerformance } from '~/containers/NarrativeTracker/queries'
import type { CategoryPerformanceProps } from '~/containers/NarrativeTracker/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('category-performance', async ({ params }) => {
	const rawCategory = params?.category
	const categoryId = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory
	if (typeof categoryId !== 'string' || categoryId.length === 0) {
		return { notFound: true }
	}
	const data = await getCoinPerformance(categoryId)

	return {
		props: {
			...data,
			categoryId
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

interface CategoryPageProps extends CategoryPerformanceProps {
	categoryId: string
}

export default function Returns(props: CategoryPageProps) {
	return (
		<Layout
			title={`Narrative Tracker - DefiLlama`}
			description={`Narrative Tracker by ${props.categoryName ?? 'Category'}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`narrative tracker, defi narrative tracker, narrative tracker by ${props.categoryName ?? 'category'}`}
			canonicalUrl={`/narrative-tracker/${props.categoryId}`}
			pageName={pageName}
		>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
