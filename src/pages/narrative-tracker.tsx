import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryPerformance } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'

export const getStaticProps = withPerformanceLogging('narrative-tracker', async () => {
	const data = await getCategoryPerformance()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoryPerformance(props) {
	return (
		<Layout title={`Narrative Tracker - DefiLlama`} defaultSEO>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
