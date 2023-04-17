import * as React from 'react'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { useFetchChartsSummary } from '~/api/categories/adaptors/client'
import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import { capitalizeFirstLetter, slug } from '~/utils'
import { chartFormatterBy } from './utils'

export const useGetOverviewChartData = ({
	name,
	dataToFetch,
	type,
	enableBreakdownChart,
	disabled
}: {
	name: string
	dataToFetch: string
	type: string
	enableBreakdownChart: boolean
	disabled: boolean
}) => {
	const { data, loading, error } = useFetchChartsSummary(dataToFetch, slug(name), undefined, disabled)

	const mainChart = React.useMemo(() => {
		if (loading || error || !data) return [[], []] as [IJoin2ReturnType, string[]]

		let chartData: IJoin2ReturnType
		let title: string
		let legend: string[]
		if (!enableBreakdownChart) {
			chartData = data?.totalDataChart[0]
			legend = data?.totalDataChart[1]
		} else {
			const [cd, lgnd] = chartBreakdownByChain(data?.totalDataChartBreakdown)
			chartData = cd
			legend = lgnd
		}

		title = Object.keys(legend).length <= 1 ? `${capitalizeFirstLetter(type)} by chain` : ''

		const [finalData] = chartFormatterBy('chain')(
			[chartData, legend] as [IJoin2ReturnType, string[]],
			data?.totalDataChartBreakdown
		)

		return finalData && finalData.length > 0 ? finalData : null
	}, [data, error, loading, enableBreakdownChart, type])

	return { data: mainChart, loading }
}
