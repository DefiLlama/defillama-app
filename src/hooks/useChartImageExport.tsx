import * as echarts from 'echarts/core'
import { useCallback, useState } from 'react'

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
