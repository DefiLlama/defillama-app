import { maxAgeForNext } from '~/api'
import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'
import { getCategoryPerformance } from '~/containers/NarrativeTracker/queries'
import type { CategoryPerformanceProps } from '~/containers/NarrativeTracker/types'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('narrative-tracker', async () => {
	const data = await getCategoryPerformance()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Narrative Tracker']
export default function CategoryPerformance(props: CategoryPerformanceProps) {
	return (
		<Layout
			title={`Narrative Tracker - DefiLlama`}
			description={`Narrative tracker on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`narrative tracker, defi narrative tracker`}
			canonicalUrl={`/narrative-tracker`}
			pageName={pageName}
		>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
