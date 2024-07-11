import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns, getCategoryChartData2 } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsChainsSearch } from '~/components/Search'

import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

export const getStaticProps = withPerformanceLogging('narrative-tracker', async () => {
	const returns = await getCategoryReturns()
	const returnsChart = await getCategoryChartData2()

	return {
		props: {
			returns: returns.categoryReturns,
			isCoinPage: false,
			returnsChartData: returnsChart,
			coinsInCategory: returns.categoryReturns.map((i) => i.name)
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoryReturns(props) {
	return (
		<Layout title={`Narrative Tracker - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Narrative Tracker' }} />
			<CategoryReturnsContainer {...props} />
		</Layout>
	)
}
