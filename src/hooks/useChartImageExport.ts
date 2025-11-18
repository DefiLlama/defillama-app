import { useCallback, useState } from 'react'
import * as echarts from 'echarts/core'

export function useChartImageExport() {
	const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

	const handleChartReady = useCallback((instance: echarts.ECharts | null) => {
		setChartInstance(instance)
	}, [])

	return {
		chartInstance,
		handleChartReady
	}
}
