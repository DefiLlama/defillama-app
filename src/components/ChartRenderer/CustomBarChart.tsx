import { useCallback, useEffect, useId, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '../ECharts/useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'

interface ChartDataFormat {
	single?: Array<{
		date: string
		[metric: string]: number | string
	}>

	multi?: {
		entities: string[]
		metrics: string[]
		series: Array<{
			entity: string
			metric: string
			data: Array<{
				date: string
				value: number
			}>
		}>
	}
}

interface CustomBarChartProps {
	chartData?:
		| ChartDataFormat
		| any[]
		| {
				categories: string[]
				series: Array<{
					name: string
					type: 'line' | 'bar'
					color: string
					data: number[]
				}>
		  }
	title?: string
	config?: any
	valueSymbol?: string
	color?: string
	height?: string
	chartOptions?: any
	isMultiSeries?: boolean
	chartType?: string
	isStacked?: boolean
}

export default function CustomBarChart({
	chartData,
	title,
	config,
	valueSymbol = '$',
	color = '#2172E5',
	height,
	chartOptions,
	isMultiSeries,
	chartType = 'bar',
	isStacked = false
}: CustomBarChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const detectedMultiSeries = useMemo(() => {
		if (Array.isArray(chartData)) {
			return config?.series && config.series.length > 1
		} else if (chartData && !Array.isArray(chartData)) {
			return true
		}
		return false
	}, [chartData, config])

	const effectiveMultiSeries = isMultiSeries !== undefined ? isMultiSeries : detectedMultiSeries

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		hideLegend: effectiveMultiSeries ? false : true,
		isThemeDark
	})

	const categories = useMemo(() => {
		if (chartData && typeof chartData === 'object' && 'single' in chartData) {
			if (chartData.single && chartData.single.length > 0) {
				return chartData.single.map((item: any) => item.date || 'Unknown')
			}
		} else if (chartData && typeof chartData === 'object' && 'multi' in chartData) {
			if (chartData.multi) {
				return chartData.multi.entities || []
			}
		} else if (Array.isArray(chartData) && chartData.length > 0) {
			return chartData.map((item: any) => item.name || item.entity || 'Unknown')
		} else if (chartData && !Array.isArray(chartData)) {
			return (chartData as { categories: string[] }).categories
		}
		return []
	}, [chartData])

	const series = useMemo(() => {
		if (chartData && typeof chartData === 'object' && 'single' in chartData) {
			if (chartData.single && chartData.single.length > 0) {
				const seriesConfig = config?.series || []
				if (seriesConfig.length > 1) {
					return seriesConfig.map((seriesItem: any) => ({
						name: seriesItem.name,
						type: 'bar',
						data: chartData.single!.map((item: any) => item[seriesItem.dataKey] || 0),
						itemStyle: {
							color: seriesItem.color
						},
						stack: isStacked ? 'total' : undefined
					}))
				} else {
					const dataKey =
						seriesConfig[0]?.dataKey || Object.keys(chartData.single[0]).find((k) => k !== 'date') || 'value'
					return [
						{
							data: chartData.single!.map((item: any) => [item.date || 'Unknown', item[dataKey] || 0]),
							type: 'bar',
							itemStyle: {
								color: color
							}
						}
					]
				}
			}
		} else if (chartData && typeof chartData === 'object' && 'multi' in chartData) {
			if (chartData.multi) {
				const { entities, series: multiSeries } = chartData.multi

				const entityData: Record<string, number[]> = {}
				entities.forEach((entity) => {
					entityData[entity] = []
				})
				multiSeries.forEach(({ entity, data }) => {
					if (entityData[entity]) {
						entityData[entity] = data.map((d) => d.value)
					}
				})
				return entities.map((entity, index) => ({
					name: entity,
					type: 'bar',
					data: entityData[entity] || [],
					itemStyle: {
						color: config?.series?.[index]?.color || ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'][index % 5]
					},
					stack: isStacked ? 'total' : undefined
				}))
			}
		} else if (Array.isArray(chartData)) {
			const seriesConfig = config?.series || []
			if (seriesConfig.length > 1) {
				return seriesConfig.map((seriesItem: any) => ({
					name: seriesItem.name,
					type: 'bar',
					data: chartData.map((item: any) => item[seriesItem.dataKey] || 0),
					itemStyle: {
						color: seriesItem.color
					},
					stack: isStacked ? 'total' : undefined
				}))
			} else {
				const dataKey = seriesConfig[0]?.dataKey || 'value'
				return [
					{
						data: chartData.map((item: any) => [
							item.name || item.entity || 'Unknown',
							item[dataKey] || item.value || 0
						]),
						type: 'bar',
						itemStyle: {
							color: color
						}
					}
				]
			}
		} else if (chartData && !Array.isArray(chartData)) {
			const legacyData = chartData as {
				categories: string[]
				series: Array<{
					name: string
					type: 'line' | 'bar'
					color: string
					data: number[]
				}>
			}
			return (
				legacyData.series?.map((seriesItem) => ({
					name: seriesItem.name,
					type: seriesItem.type,
					data: seriesItem.data,
					itemStyle: {
						color: seriesItem.color
					},
					stack: isStacked ? 'total' : undefined
				})) || []
			)
		} else {
			return []
		}
	}, [chartData, config, color, isStacked])

	const computedChartOptions = useMemo(() => {
		const { graphic, titleDefaults, grid, dataZoom } = defaultChartSettings

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
			axisLabel: { interval: 0, rotate: 45 }
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
				if (effectiveMultiSeries) {
					let content = `<strong>${params[0].axisValue}</strong><br/>`
					params.forEach((param: any) => {
						content += `${param.seriesName}: ${valueSymbol}${formattedNum(param.value, true)}<br/>`
					})
					return content
				} else {
					const value = params[0].value
					return `<strong>${value[0]}</strong>: ${valueSymbol}${formattedNum(value[1], true)}`
				}
			}
		}

		const legend = effectiveMultiSeries
			? {
					show: true,
					data: series.map((s: any) => s.name),
					top: 'bottom',
					textStyle: {
						color: isThemeDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
					}
			  }
			: { show: false }

		const baseOptions = {
			graphic: { ...graphic },
			tooltip: { ...tooltip },
			title: { ...titleDefaults },
			legend: { ...legend },
			grid: { ...grid },
			xAxis: { ...xAxis },
			yAxis: { ...yAxis },
			dataZoom: [dataZoom[0], { ...dataZoom[1], labelFormatter: () => '' }],
			series
		}

		for (const option in chartOptions) {
			if (baseOptions[option]) {
				baseOptions[option] = { ...baseOptions[option], ...chartOptions[option] }
			} else {
				baseOptions[option] = { ...chartOptions[option] }
			}
		}

		return baseOptions
	}, [defaultChartSettings, categories, isThemeDark, effectiveMultiSeries, series, valueSymbol, chartOptions])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()
		chartInstance.setOption(computedChartOptions)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, computedChartOptions])

	return (
		<div className="relative">
			<div id={id} className="my-auto min-h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
