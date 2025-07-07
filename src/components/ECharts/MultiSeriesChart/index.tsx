import { useEffect, useId, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'

interface IMultiSeriesChartProps {
	series?: Array<{
		data: Array<[number, number]>
		type: 'line' | 'bar'
		name: string
		color: string
		logo?: string
		stack?: string
		areaStyle?: any
		metricType?: string
	}>
	chartOptions?: {
		[key: string]: {
			[key: string]: any
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
	valueSymbol?: string
	alwaysShowTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	title?: string
}

export default function MultiSeriesChart({
	series,
	valueSymbol = '',
	title,
	height,
	chartOptions,
	groupBy,
	hideDataZoom = false,
	hideDownloadButton = false,
	alwaysShowTooltip
}: IMultiSeriesChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		valueSymbol,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly', 'quarterly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly' | 'quarterly')
				: 'daily',
		isThemeDark,
		alwaysShowTooltip
	})

	const processedSeries = useMemo(() => {
		return (
			series?.map((serie: any) => {
				const serieConfig: any = {
					name: serie.name,
					type: serie.type,
					symbol: serie.type === 'line' ? 'none' : undefined,
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					itemStyle: {
						color: serie.color
					},
					data: serie.data?.map(([timestamp, value]: [number, number]) => [+timestamp * 1e3, value]) || [],
					metricType: serie.metricType,
					...(serie.logo && {
						legendIcon: 'image://' + serie.logo
					}),
					...(serie.stack && {
						stack: serie.stack
					})
				}

				if (serie.type === 'line' && !serie.areaStyle) {
					serieConfig.areaStyle = {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{
								offset: 0,
								color: serie.color
							},
							{
								offset: 1,
								color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
							}
						])
					}
				} else if (serie.areaStyle !== undefined) {
					serieConfig.areaStyle = serie.areaStyle
				}

				return serieConfig
			}) || []
		)
	}, [series, isThemeDark])

	const chartRef = useRef<echarts.ECharts | null>(null)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		for (const option in chartOptions) {
			if (option === 'overrides') {
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom, legend, grid } = defaultChartSettings

		const metricTypes = new Set(processedSeries.map((s: any) => s.metricType).filter(Boolean))
		const uniqueMetricTypes = Array.from(metricTypes)

		const needMultipleAxes = uniqueMetricTypes.length > 1

		let finalYAxis: any = yAxis
		let seriesWithHallmarks = processedSeries

		if (needMultipleAxes) {
			finalYAxis = uniqueMetricTypes.slice(0, 3).map((_, index) => ({
				...yAxis,
				position: index === 0 ? 'left' : index === 1 ? 'right' : 'left',
				offset: index === 2 ? 60 : 0
			}))

			seriesWithHallmarks = seriesWithHallmarks.map((s: any) => {
				const axisIndex = uniqueMetricTypes.indexOf(s.metricType)
				return {
					...s,
					yAxisIndex: Math.min(axisIndex, 2)
				}
			})
		}

		const legendRightPadding = needMultipleAxes ? 40 : legend.right
		const gridLeftPadding = uniqueMetricTypes.length > 2 ? 72 : 12

		chartInstance.setOption({
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: gridLeftPadding,
				bottom: 68,
				top: 40,
				right: 12,
				containLabel: true
			},
			xAxis,
			yAxis: finalYAxis,
			legend: {
				...legend,
				data: series?.map((s: any) => s.name) || [],
				...(legendRightPadding !== undefined ? { right: legendRightPadding } : {})
			},
			dataZoom: hideDataZoom ? [] : [...dataZoom],
			series: seriesWithHallmarks
		})

		if (alwaysShowTooltip && seriesWithHallmarks.length > 0 && seriesWithHallmarks[0].data.length > 0) {
			chartInstance.dispatchAction({
				type: 'showTip',
				seriesIndex: 0,
				dataIndex: seriesWithHallmarks[0].data.length - 1,
				position: [60, 0]
			})

			chartInstance.on('globalout', () => {
				chartInstance.dispatchAction({
					type: 'showTip',
					seriesIndex: 0,
					dataIndex: seriesWithHallmarks[0].data.length - 1,
					position: [60, 0]
				})
			})
		}

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
		}
	}, [defaultChartSettings, processedSeries, chartOptions, hideDataZoom, alwaysShowTooltip, series, id])

	useEffect(() => {
		return () => {
			const chartDom = document.getElementById(id)
			if (chartDom) {
				const chartInstance = echarts.getInstanceByDom(chartDom)
				if (chartInstance) {
					chartInstance.dispose()
				}
			}
			if (chartRef.current) {
				chartRef.current = null
			}
		}
	}, [id])

	return (
		<div className="relative">
			<div id={id} className="my-auto min-h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
