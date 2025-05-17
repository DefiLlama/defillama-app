import * as React from 'react'
import { getDimensionProtocolPageData, IJoin2ReturnType } from '~/api/categories/adaptors'
import { chartBreakdownByChain } from '~/api/categories/adaptors/utils'
import { capitalizeFirstLetter, slug } from '~/utils'
import { chartFormatterBy } from './utils'
import { useQuery } from '@tanstack/react-query'
import { ADAPTOR_TYPES } from '../constants'

export const useGetDimensionAdapterChartData = ({
	protocolName,
	adapterType,
	disabled
}: {
	protocolName: string
	adapterType: `${ADAPTOR_TYPES}`
	disabled?: boolean
}) => {
	return useQuery({
		queryKey: ['adaptor-chart-data', protocolName, adapterType, disabled],
		queryFn: !disabled
			? () =>
					getDimensionProtocolPageData({ protocolName, adapterType }).then((data) => {
						if (!data || data.totalDataChart[0].length === 0) return null
						return data
					})
			: () => null,
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	// const mainChart = React.useMemo(() => {
	// 	if (isLoading || error || !data) return null

	// 	let chartData: IJoin2ReturnType
	// 	let title: string
	// 	let legend: string[]
	// 	if (!enableBreakdownChart) {
	// 		chartData = data?.totalDataChart[0]
	// 		legend = data?.totalDataChart[1]
	// 	} else {
	// 		const [cd, lgnd] = chartBreakdownByChain(data?.totalDataChartBreakdown)
	// 		chartData = cd
	// 		legend = lgnd
	// 	}

	// 	title = Object.keys(legend).length <= 1 ? `${capitalizeFirstLetter(type)} by chain` : ''

	// 	const [finalData, finalLegend] = chartFormatterBy('chain')(
	// 		[chartData, legend] as [IJoin2ReturnType, string[]],
	// 		data?.totalDataChartBreakdown
	// 	)

	// 	const mainChart = finalData && finalData.length > 0 ? finalData : null

	// 	if (!mainChart) return null

	// 	return [finalData, finalLegend] as [IJoin2ReturnType, Array<string>]
	// }, [data, error, isLoading, enableBreakdownChart, type])
}
