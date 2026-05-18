/**
 * Per-message registry of ECharts instance getters, used by the HTML artifact
 * export to invoke the PNG export pipeline per chart.
 *
 * Each rendered chart registers its instance getter under its artifact id when
 * mounted, and deregisters on unmount. The registry is provided by the message
 * bubble (one per message) and consumed by the artifact export button.
 */

import type * as echarts from 'echarts/core'
import { createContext, useContext, useEffect } from 'react'

export type ChartInstanceRegistry = Map<string, () => echarts.ECharts | null>

const ChartInstanceRegistryContext = createContext<ChartInstanceRegistry | null>(null)

export const ChartInstanceRegistryProvider = ChartInstanceRegistryContext.Provider

export function useChartInstanceRegistry(): ChartInstanceRegistry | null {
	return useContext(ChartInstanceRegistryContext)
}

export function createChartInstanceRegistry(): ChartInstanceRegistry {
	return new Map()
}

/**
 * Hook used by chart renderers. When inside a registry provider, registers the
 * chart instance getter under the given id on mount, and removes the entry on
 * unmount. No-op outside a provider, so charts rendered outside LlamaAI
 * message bubbles are unaffected.
 */
export function useRegisterChartInstance(chartId: string, getter: () => echarts.ECharts | null): void {
	const registry = useChartInstanceRegistry()
	useEffect(() => {
		if (!registry) return
		registry.set(chartId, getter)
		return () => {
			registry.delete(chartId)
		}
	}, [registry, chartId, getter])
}
