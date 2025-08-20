import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getCategoryPerformance } from '~/api/categories/protocols'
import { CategoryPerformanceContainer } from '~/containers/NarrativeTracker'
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
export default function CategoryPerformance(props) {
	return (
		<Layout title={`Narrative Tracker - DefiLlama`} pageName={pageName}>
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
