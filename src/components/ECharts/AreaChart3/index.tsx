import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import type { IChart2Props } from '../types'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'

export default function AreaChart3({ chartData, chartOptions, height, stackColors, hallmarks }: IChart2Props) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		isThemeDark
	})

	const series = useMemo(() => {
		const series = []

		for (const stack in chartData) {
			series.push({
				name: stack,
				type: 'line',
				large: true,
				largeThreshold: 0,
				stack,
				symbol: 'none',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: stackColors[stack] ?? (isThemeDark ? '#000000' : '#ffffff')
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{
							offset: 0,
							color: stackColors[stack] ?? (isThemeDark ? '#000000' : '#ffffff')
						},
						{
							offset: 1,
							color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
						}
					])
				},
				data: chartData[stack]
			})
		}
		if (hallmarks) {
			series[0].markLine = {
				data: hallmarks.map(([date, event], index) => [
					{
						name: event,
						xAxis: +date * 1e3,
						yAxis: 0,
						label: {
							color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
							fontFamily: 'sans-serif',
							fontSize: 14,
							fontWeight: 500
						}
					},
					{
						name: 'end',
						xAxis: +date * 1e3,
						yAxis: 'max',
						y: Math.max(hallmarks.length * 40 - index * 40, 40)
					}
				])
			}
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
				right: 12
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
	}, [createInstance, defaultChartSettings, series, chartOptions])

	return <div id={id} className="min-h-[360px]" style={height ? { height } : undefined}></div>
}
