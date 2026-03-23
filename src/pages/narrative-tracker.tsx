import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'
import { getCategoryPerformance } from '~/containers/NarrativeTracker/queries'
import type { CategoryPerformanceProps } from '~/containers/NarrativeTracker/types'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
			title="Narrative Tracker - Crypto Market Trends - DefiLlama"
			description="Track crypto narratives and market trends by sector performance. Monitor AI, DePIN, RWA, L2s, and other crypto narratives. Real-time narrative performance analytics and trend identification."
			canonicalUrl={`/narrative-tracker`}
			pageName={pageName}
		>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
