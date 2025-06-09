import { DashboardItemConfig, ChartConfig, ProtocolsTableConfig, TextConfig, MultiChartConfig } from '../types'

/**
 * Clean items before saving by removing runtime data like loading states and data
 */
export function cleanItemsForSaving(items: DashboardItemConfig[]): DashboardItemConfig[] {
	return items.map((item) => {
		if (item.kind === 'chart') {
			// Remove runtime properties from chart config
			const { data, isLoading, hasError, refetch, ...chartConfigToSave } = item as ChartConfig
			return chartConfigToSave
		} else if (item.kind === 'table') {
			// Table configs don't have runtime data to remove
			return item as ProtocolsTableConfig
		} else if (item.kind === 'text') {
			// Text configs don't have runtime data to remove
			return item as TextConfig
		} else if (item.kind === 'multi') {
			// Clean nested chart items in multi-chart
			const { items: nestedItems, ...rest } = item as MultiChartConfig
			const cleanNestedItems = nestedItems.map((nestedItem) => {
				const { data, isLoading, hasError, refetch, ...cleanItem } = nestedItem
				return cleanItem
			})
			return { ...rest, items: cleanNestedItems }
		}
		return item
	})
}

/**
 * Generate a unique ID for dashboard items
 */
export function generateItemId(type: string, identifier: string): string {
	return `${type}-${identifier}-${Date.now()}`
}