import { useMemo } from 'react'
import { useAppMetadata } from '../../../AppMetadataContext'
import { useProDashboardCatalog } from '../../../ProDashboardAPIContext'
import { CHART_TYPES, getChainChartTypes, getProtocolChartTypes } from '../../../types'
import type { ComparisonType, MetricWithAvailability } from '../types'

export function useMetricAvailability(
	selectedItems: string[],
	comparisonType: ComparisonType | null
): MetricWithAvailability[] {
	const { availableChainChartTypes, availableProtocolChartTypes, chainsByName } = useAppMetadata()
	const { getProtocolInfo } = useProDashboardCatalog()

	return useMemo(() => {
		if (!comparisonType || selectedItems.length === 0) return []

		const allMetrics = comparisonType === 'chains' ? getChainChartTypes() : getProtocolChartTypes()

		return allMetrics.map((metric) => {
			const availableCount = selectedItems.filter((item) => {
				if (comparisonType === 'chains') {
					const chainMeta = chainsByName.get(item)
					const hasGeckoId = !!chainMeta?.gecko_id
					const types = availableChainChartTypes(item, { hasGeckoId })
					return types.includes(metric)
				} else {
					const protocol = getProtocolInfo(item)
					const types = availableProtocolChartTypes(item, { hasGeckoId: !!protocol?.geckoId })
					return types.includes(metric)
				}
			}).length

			const isValid =
				selectedItems.length === 1
					? availableCount === 1
					: selectedItems.length === 2
						? availableCount === 2
						: availableCount >= 2

			const chartTypeInfo = CHART_TYPES[metric as keyof typeof CHART_TYPES]

			return {
				metric,
				title: chartTypeInfo?.title || metric,
				chartType: chartTypeInfo?.chartType || 'line',
				color: chartTypeInfo?.color || '#8884d8',
				availableCount,
				totalCount: selectedItems.length,
				isValid
			}
		})
	}, [
		selectedItems,
		comparisonType,
		availableChainChartTypes,
		availableProtocolChartTypes,
		getProtocolInfo,
		chainsByName
	])
}

export function useFilteredMetrics(metrics: MetricWithAvailability[], showOnlyValid: boolean = true) {
	return useMemo(() => {
		if (!showOnlyValid) return metrics
		return metrics.filter((m) => m.isValid)
	}, [metrics, showOnlyValid])
}
