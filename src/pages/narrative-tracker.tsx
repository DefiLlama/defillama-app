import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns, getCategoryChartData } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsChainsSearch } from '~/components/Search'

import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

function calculateWeightedAverageCumulativeReturn(data) {
	const groupedData = {}

	// group data by date and category
	data.forEach((coin) => {
		const date = Math.floor(new Date(coin.truncated_day).getTime() / 1000)
		if (!groupedData[date]) {
			groupedData[date] = {}
		}
		if (!groupedData[date][coin.category_name]) {
			groupedData[date][coin.category_name] = {
				weightedSum: 0,
				totalWeight: 0
			}
		}
		groupedData[date][coin.category_name].weightedSum += coin.cumulative_return * coin.mcap
		groupedData[date][coin.category_name].totalWeight += coin.mcap
	})

	// calculate weighted averages and format the output
	const result = Object.entries(groupedData).map(([date, categories]) => {
		const output = { date: parseInt(date) }
		Object.entries(categories).forEach(([category, { weightedSum, totalWeight }]) => {
			output[category] = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0
		})
		return output
	})

	return result
}

export const getStaticProps = withPerformanceLogging('narrative-tracker', async () => {
	const returns = await getCategoryReturns()
	const returnsChart = await getCategoryChartData()

	const chart = returnsChart.categoryInfo
		.map((coin) => {
			const prices = returnsChart.coinReturns.filter((i) => i.coin_id === coin.coin_id).map((i) => ({ ...i, ...coin }))
			return prices
		})
		.flat()

	const returnsChartData = calculateWeightedAverageCumulativeReturn(chart)

	return {
		props: {
			returns: returns.categoryReturns,
			isCoinPage: false,
			returnsChartData,
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
