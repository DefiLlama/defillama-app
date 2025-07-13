import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '../ECharts/useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

interface MixedChartProps {
	title?: string
	data: any
	config: any
	advancedConfig?: {
		primaryAxis: string
		secondaryAxis: string
		dualYAxis: boolean
	}
	valueSymbol?: string
	height?: string
}

export default function MixedChart({
	title,
	data,
	config,
	advancedConfig,
	valueSymbol = '$',
	height = '400px'
}: MixedChartProps) {
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
				rotate: categories.length > 6 ? 45 : 0
			}
		}

		const yAxis = [
			{
				type: 'value',
				name: advancedConfig?.primaryAxis || 'Primary',
				position: 'left',
				axisLine: {
					lineStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.1
					}
				},
				nameTextStyle: {
					fontFamily: 'sans-serif',
					fontSize: 12,
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
			},
			{
				type: 'value',
				name: advancedConfig?.secondaryAxis || 'Secondary',
				position: 'right',
				axisLine: {
					lineStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
						opacity: 0.1
					}
				},
				nameTextStyle: {
					fontFamily: 'sans-serif',
					fontSize: 12,
					fontWeight: 400,
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				splitLine: {
					show: false
				},
				axisLabel: {
					formatter: (value: number) => formattedNum(value, true)
				}
			}
		]

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
			yAxis: yAxis,
			series: series.map((s: any) => ({
				name: s.name,
				type: s.type || 'bar',
				data: s.data,
				yAxisIndex: s.yAxisIndex || 0,
				itemStyle: {
					color: s.color
				},
				lineStyle:
					s.type === 'line'
						? {
								color: s.color,
								width: 2
						  }
						: undefined
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
	}, [createInstance, defaultChartSettings, data, advancedConfig, isThemeDark, valueSymbol])

	return (
		<div className="relative">
			<div id={id} className="my-auto min-h-[360px]" style={{ height }}></div>
		</div>
	)
}
