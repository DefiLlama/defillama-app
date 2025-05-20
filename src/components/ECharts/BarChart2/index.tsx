import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import type { IChart2Props } from '../types'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export default function BarChart2({ chartData, chartOptions, height, stackColors, groupBy }: IChart2Props) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		isThemeDark,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily'
	})

	const series = useMemo(() => {
		const series = []

		for (const stack in chartData) {
			series.push({
				name: stack,
				type: 'bar',
				large: true,
				largeThreshold: 0,
				stack,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: stackColors[stack] ?? (isThemeDark ? '#000000' : '#ffffff')
				},
				data: chartData[stack]
			})
		}
		return series
	}, [chartData, stackColors, isThemeDark])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		// override default chart settings
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: 12,
				bottom: 68,
				top: 12,
				right: 12,
				containLabel: true
			},
			xAxis,
			yAxis,
			dataZoom,
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, series, chartOptions, groupBy])

	return <div id={id} className="min-h-[360px]" style={height ? { height } : undefined}></div>
}
