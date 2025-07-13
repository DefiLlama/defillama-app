import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '../ECharts/useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

interface ClusteredBarChartProps {
	title?: string
	data: any
	config: any
	advancedConfig?: {
		groupBy: string
		groupLimit: number
		othersCategory: boolean
	}
	valueSymbol?: string
	height?: string
}

export default function ClusteredBarChart({
	title,
	data,
	config,
	advancedConfig,
	valueSymbol = '$',
	height = '400px'
}: ClusteredBarChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color: '#2172E5',
		title,
		valueSymbol,
		hideLegend: false,
		isThemeDark
	})

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid } = defaultChartSettings

		const categories = data.categories || []
		const series = data.series || []

		const xAxis = {
			type: 'category',
			data: categories,
			boundaryGap: true,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400
			},
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.2
				}
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: {
				interval: 0,
				rotate: categories.length > 8 ? 45 : 0,
				formatter: (value: string) => {
					return value.length > 12 ? value.substring(0, 12) + '...' : value
				}
			}
		}

		const yAxis = {
			type: 'value',
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.1
				}
			},
			boundaryGap: false,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400,
				color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: {
				formatter: (value: number) => formattedNum(value, true)
			}
		}

		const tooltip = {
			trigger: 'axis',
			confine: true,
			formatter: (params: any) => {
				let content = `<strong>${params[0].axisValue}</strong><br/>`
				params.forEach((param: any) => {
					content += `${param.seriesName}: ${valueSymbol}${formattedNum(param.value, true)}<br/>`
				})
				return content
			}
		}

		const legend = {
			show: true,
			data: series.map((s: any) => s.name),
			top: 'bottom',
			textStyle: {
				color: isThemeDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
			}
		}

		const echartsConfig = {
			graphic: { ...graphic },
			tooltip: { ...tooltip },
			title: { ...titleDefaults },
			legend: { ...legend },
			grid: { ...grid },
			xAxis: { ...xAxis },
			yAxis: { ...yAxis },
			series: series.map((s: any) => ({
				name: s.name,
				type: 'bar',
				data: s.data,
				itemStyle: {
					color: s.color
				}
			}))
		}

		chartInstance.setOption(echartsConfig)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, defaultChartSettings, data, isThemeDark, valueSymbol])

	return (
		<div className="relative">
			<div id={id} className="my-auto min-h-[360px]" style={{ height }}></div>
		</div>
	)
}
