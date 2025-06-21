import { useQueries } from '@tanstack/react-query'
import { getChartQueryKey, getChartQueryFn } from '../queries'
import { TimePeriod } from '../ProDashboardAPIContext'

export function useMultipleChartData(
	chartTypes: string[],
	itemType: 'chain' | 'protocol',
	item: string,
	geckoId?: string | null,
	timePeriod?: TimePeriod
) {
	const queries = useQueries({
		queries: chartTypes.map((type) => ({
			queryKey: getChartQueryKey(type, itemType, item, geckoId, timePeriod),
			queryFn: getChartQueryFn(type, itemType, item, geckoId, timePeriod),
			enabled:
				!!item && (itemType !== 'protocol' || !['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(type) || !!geckoId)
		}))
	})

	const chartDataMap = new Map<string, any>()
	chartTypes.forEach((type, index) => {
		chartDataMap.set(type, queries[index])
	})

	return chartDataMap
}
