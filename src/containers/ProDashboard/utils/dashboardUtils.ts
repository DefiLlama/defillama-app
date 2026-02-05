import { ChartConfig, DashboardItemConfig, MultiChartConfig, ProtocolsTableConfig, TextConfig } from '../types'

// Valid chart types accepted by the API
const VALID_PROTOCOL_CHART_TYPES = new Set([
	'tvl',
	'volume',
	'fees',
	'revenue',
	'tokenMcap',
	'tokenPrice',
	'tokenVolume',
	'medianApy',
	'holderRevenue',
	'aggregators',
	'perps',
	'options'
])

const VALID_CHAIN_CHART_TYPES = new Set([
	'tvl',
	'volume',
	'fees',
	'users',
	'txs',
	'revenue',
	'stablecoins',
	'stablecoinInflows',
	'chainMcap',
	'chainPrice',
	'bridgedTvl',
	'perps',
	'aggregators',
	'bridgeAggregators',
	'perpsAggregators',
	'options',
	'bribes',
	'tokenTax',
	'activeUsers',
	'newUsers',
	'gasUsed',
	'chainFees',
	'chainRevenue'
])

// Valid item kinds accepted by the API
const VALID_ITEM_KINDS = new Set(['chart', 'multi', 'text', 'table', 'builder'])

/**
 * Check if a chart type is valid for the API
 */
function isValidChartType(type: string, hasProtocol: boolean): boolean {
	if (hasProtocol) {
		return VALID_PROTOCOL_CHART_TYPES.has(type)
	}
	return VALID_CHAIN_CHART_TYPES.has(type)
}

/**
 * Sanitize dashboard items to remove invalid values that the API doesn't accept
 */
export function sanitizeItemsForAPI(items: DashboardItemConfig[]): DashboardItemConfig[] {
	return items
		.map((item) => {
			// Filter out items with invalid kind values
			if (!VALID_ITEM_KINDS.has(item.kind)) {
				return null
			}

			if (item.kind === 'chart') {
				const chartItem = item as ChartConfig
				// Filter out charts with invalid type values
				if (!isValidChartType(chartItem.type, !!chartItem.protocol)) {
					return null
				}
				return item
			} else if (item.kind === 'multi') {
				const multiItem = item as MultiChartConfig
				// Filter out nested items with invalid type values
				const validNestedItems = multiItem.items.filter((nestedItem) => {
					if (nestedItem.kind !== 'chart') {
						return false
					}
					return isValidChartType(nestedItem.type, !!nestedItem.protocol)
				})

				// If no valid nested items remain, filter out the entire multi-chart
				if (validNestedItems.length === 0) {
					return null
				}

				return {
					...multiItem,
					items: validNestedItems
				}
			}

			// For other item types (table, text, builder), keep them as-is
			return item
		})
		.filter((item): item is DashboardItemConfig => item !== null)
}

/**
 * Clean items before saving by removing runtime data like loading states and data
 */
export function cleanItemsForSaving(items: DashboardItemConfig[]): DashboardItemConfig[] {
	return items.map((item) => {
		if (item.kind === 'chart') {
			// Remove runtime properties from chart config
			const {
				data: _data,
				isLoading: _isLoading,
				hasError: _hasError,
				refetch: _refetch,
				...chartConfigToSave
			} = item as ChartConfig
			return chartConfigToSave
		} else if (item.kind === 'table') {
			// Table configs don't have runtime data to remove
			return item as ProtocolsTableConfig
		} else if (item.kind === 'unified-table') {
			return item
		} else if (item.kind === 'text') {
			// Text configs don't have runtime data to remove
			return item as TextConfig
		} else if (item.kind === 'multi') {
			// Clean nested chart items in multi-chart
			const { items: nestedItems, ...rest } = item as MultiChartConfig
			const cleanNestedItems = nestedItems.map((nestedItem) => {
				const { data: _data, isLoading: _isLoading, hasError: _hasError, refetch: _refetch, ...cleanItem } = nestedItem
				return cleanItem
			})
			return { ...rest, items: cleanNestedItems }
		} else if (item.kind === 'metric') {
			return item
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
