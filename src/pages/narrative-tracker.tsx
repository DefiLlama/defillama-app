import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns, getCategoryChartData2, getCategoryReturnsInfo } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsChainsSearch } from '~/components/Search'

import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

export const getStaticProps = withPerformanceLogging('narrative-tracker', async () => {
	const returns = await getCategoryReturns()
	const returnsChart = await getCategoryChartData2()
	let info = await getCategoryReturnsInfo()

	const getLastReturn = (period) => returnsChart[period].slice(-1)[0]
	info = info.map((i) => ({
		...i,
		returns1D: null,
		returns1W: getLastReturn('7')[i.name],
		returns1M: getLastReturn('30')[i.name],
		returns1Y: getLastReturn('365')[i.name],
		returnsYtd: getLastReturn('ytd')[i.name]
	}))

	return {
		props: {
			returns: info,
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
