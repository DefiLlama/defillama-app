import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryPerformance } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsChainsSearch } from '~/components/Search'

import { CategoryPerformanceContainer } from '~/containers/CategoryPerformanceContainer'

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
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Narrative Tracker' }} />
			<CategoryPerformanceContainer {...props} />
		</Layout>
	)
}
