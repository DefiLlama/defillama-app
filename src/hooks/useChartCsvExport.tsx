import type * as echarts from 'echarts/core'
import { useCallback, useRef } from 'react'

export type CsvCell = string | number | boolean

export interface ChartCsv {
	filename: string
	rows: Array<Array<CsvCell>>
}

export function useChartCsvExport() {
	const chartInstanceRef = useRef<echarts.ECharts | null>(null)

	const handleChartReady = useCallback((instance: echarts.ECharts | null) => {
		chartInstanceRef.current = instance
	}, [])

	return {
		chartInstance: () => chartInstanceRef.current,
		handleChartReady
	}
}
