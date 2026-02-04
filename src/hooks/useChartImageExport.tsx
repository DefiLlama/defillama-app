import * as echarts from 'echarts/core'
import { useCallback, useRef } from 'react'

export function useChartImageExport() {
	const chartInstanceRef = useRef<echarts.ECharts | null>(null)

	const handleChartReady = useCallback((instance: echarts.ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	return {
		chartInstance: () => chartInstanceRef.current,
		handleChartReady
	}
}
