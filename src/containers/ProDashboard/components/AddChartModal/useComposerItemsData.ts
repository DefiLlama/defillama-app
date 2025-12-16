import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { TimePeriod } from '../../ProDashboardAPIContext'
import { getChartQueryFn, getChartQueryKey } from '../../queries'
import { ChartConfig } from '../../types'
import { groupData } from '../../utils'

export function useComposerItemsData(composerItems: ChartConfig[], timePeriod: TimePeriod) {
	const queries = useQueries({
		queries: composerItems.map((item) => {
			const itemType = item.protocol ? 'protocol' : 'chain'
			const itemName = item.protocol || item.chain || ''

			const needsGeckoId =
				(itemType === 'protocol' && ['tokenMcap', 'tokenPrice', 'tokenVolume'].includes(item.type)) ||
				(itemType === 'chain' && ['chainMcap', 'chainPrice'].includes(item.type))

			const isEnabled = !!itemName && !!item.type && (!needsGeckoId || !!item.geckoId)

			return {
				queryKey: getChartQueryKey(item.type, itemType, itemName, item.geckoId, timePeriod),
				queryFn: getChartQueryFn(item.type, itemType, itemName, item.geckoId, timePeriod),
				staleTime: 5 * 60 * 1000,
				enabled: isEnabled
			}
		})
	})

	const itemsWithData = useMemo(() => {
		return composerItems.map((item, index) => {
			const queryResult = queries[index]
			const rawData = (queryResult?.data || []) as [string, number][]

			const shouldGroup = item.grouping && item.grouping !== 'day'
			const groupedData =
				shouldGroup && Array.isArray(rawData) && rawData.length > 0 ? groupData(rawData, item.grouping) : rawData

			return {
				...item,
				data: groupedData,
				isLoading: queryResult?.isLoading || false,
				hasError: queryResult?.isError || false
			}
		})
	}, [composerItems, queries])

	return itemsWithData
}
