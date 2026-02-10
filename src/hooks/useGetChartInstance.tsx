import type * as echarts from 'echarts/core'
import { useCallback, useRef } from 'react'

export function useGetChartInstance() {
	const chartInstanceRef = useRef<echarts.ECharts | null>(null)

	const handleChartReady = useCallback((instance: echarts.ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	const chartInstance = useCallback(() => chartInstanceRef.current, [])

	return { chartInstance, handleChartReady }
}
