import { useEffect, useId, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useDefaults } from '../useDefaults'
import { mergeDeep } from '../utils'

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
	xAxisType?: 'time' | 'category'
	showAggregateInTooltip?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
}

export default function MultiSeriesChart({
	series,
	valueSymbol = '',
	height,
	chartOptions,
	groupBy,
	hideDataZoom = false,
	hideDownloadButton = false,
	alwaysShowTooltip,
	xAxisType = 'time',
	showAggregateInTooltip = false,
	onReady
}: IMultiSeriesChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		valueSymbol,
		xAxisType,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly', 'quarterly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly' | 'quarterly')
				: 'daily',
		isThemeDark,
		alwaysShowTooltip,
		showAggregateInTooltip
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
					data: serie.data?.map(([x, y]: [any, number]) => (xAxisType === 'time' ? [+x * 1e3, y] : [x, y])) || [],
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
		const isNewInstance = !chartInstance
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		if (onReady && isNewInstance) {
			onReady(chartInstance)
		}

		for (const option in chartOptions) {
			if (option === 'overrides') {
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		if (showAggregateInTooltip && !chartOptions?.tooltip?.formatter) {
			defaultChartSettings.tooltip = {
				...defaultChartSettings.aggregateTooltip
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom, legend, grid } = defaultChartSettings

		const metricTypes = new Set(processedSeries.map((s: any) => s.metricType).filter(Boolean))
		const uniqueMetricTypes = Array.from(metricTypes)

		const needMultipleAxes = uniqueMetricTypes.length > 1

		let finalYAxis: any = yAxis
		let seriesWithHallmarks = processedSeries

		if (needMultipleAxes) {
			finalYAxis = uniqueMetricTypes.slice(0, 3).map((_, index) => ({
				...yAxis,
				axisLabel: { ...(yAxis as any).axisLabel, margin: 4 },
				position: index === 0 ? 'left' : index === 1 ? 'right' : 'left',
				offset: index === 2 ? 40 : 0
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
		const gridLeftPadding = 12

		chartInstance.setOption({
			graphic,
			tooltip:
				showAggregateInTooltip && !alwaysShowTooltip
					? {
							...tooltip,
							position: function (pos: [number, number], params: any, dom: any, rect: any, size: any) {
								const tooltipWidth = size.contentSize[0]
								const tooltipHeight = size.contentSize[1]
								const chartWidth = size.viewSize[0]
								const chartHeight = size.viewSize[1]

								// If tooltip would be cut off at bottom, position it above the cursor
								if (pos[1] + tooltipHeight > chartHeight - 50) {
									return [Math.min(pos[0], chartWidth - tooltipWidth - 10), Math.max(10, pos[1] - tooltipHeight - 10)]
								}

								// Otherwise use default position
								return pos
							}
						}
					: tooltip,
			grid: {
				left: gridLeftPadding,
				bottom: 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel',
				...grid
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
					if (onReady) {
						onReady(null)
					}
				}
			}
			if (chartRef.current) {
				chartRef.current = null
			}
		}
	}, [id])

	return (
		<div className="relative">
			<div id={id} className="my-auto h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
