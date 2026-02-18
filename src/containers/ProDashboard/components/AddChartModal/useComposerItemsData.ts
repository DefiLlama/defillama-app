import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { TimePeriod } from '../../ProDashboardAPIContext'
import { getChartQueryFn, getChartQueryKey } from '../../queries'
import type { ChartConfig } from '../../types'
import { groupData } from '../../utils'

const EMPTY_SERIES: [string, number][] = []
const PROTOCOL_GECKO_TYPES = new Set(['tokenMcap', 'tokenPrice', 'tokenVolume'])
const CHAIN_GECKO_TYPES = new Set(['chainMcap', 'chainPrice'])

export function useComposerItemsData(composerItems: ChartConfig[], timePeriod: TimePeriod) {
	const queries = useQueries({
		queries: composerItems.map((item) => {
			const itemType = item.protocol ? 'protocol' : 'chain'
			const itemName = item.protocol || item.chain || ''

			const needsGeckoId =
				(itemType === 'protocol' && PROTOCOL_GECKO_TYPES.has(item.type)) ||
				(itemType === 'chain' && CHAIN_GECKO_TYPES.has(item.type))

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
			const rawData = (queryResult?.data ?? EMPTY_SERIES) as [string, number][]

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
