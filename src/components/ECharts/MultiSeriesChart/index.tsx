import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartCleanup } from '~/hooks/useChartCleanup'
import { useChartResize } from '~/hooks/useChartResize'
import { ChartContainer } from '../ChartContainer'
import { formatTooltipValue } from '../formatters'
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
	groupBy?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
	valueSymbol?: string
	yAxisSymbols?: string[]
	alwaysShowTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	title?: string
	xAxisType?: 'time' | 'category'
	showAggregateInTooltip?: boolean
	onReady?: (instance: echarts.ECharts | null) => void
}

const EMPTY_ARRAY = []

export default function MultiSeriesChart({
	series,
	valueSymbol = '',
	yAxisSymbols = EMPTY_ARRAY,
	height,
	chartOptions,
	groupBy,
	hideDataZoom = false,
	hideDownloadButton: _hideDownloadButton = false,
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
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')
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
					yAxisIndex: serie.yAxisIndex,
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
	}, [series, isThemeDark, xAxisType])

	const chartRef = useRef<echarts.ECharts | null>(null)
	const hasNotifiedReadyRef = useRef(false)
	const onReadyRef = useRef(onReady)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	useEffect(() => {
		onReadyRef.current = onReady
	}, [onReady])

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		if (!instance) {
			instance = echarts.init(chartDom)
		}

		chartRef.current = instance
		if (instance && !hasNotifiedReadyRef.current && onReadyRef.current) {
			onReadyRef.current(instance)
			hasNotifiedReadyRef.current = true
		}

		const settings = { ...defaultChartSettings }
		for (const option in chartOptions) {
			if (option === 'overrides') {
				settings['tooltip'] = { ...settings['inflowsTooltip'] }
			} else if (settings[option]) {
				settings[option] = mergeDeep(settings[option], chartOptions[option])
			} else {
				settings[option] = { ...chartOptions[option] }
			}
		}

		if (showAggregateInTooltip && !chartOptions?.tooltip?.formatter) {
			settings.tooltip = {
				...settings.aggregateTooltip
			}
		}

		const { graphic, tooltip, xAxis, yAxis, dataZoom, legend, grid } = settings

		const metricTypes = new Set(processedSeries.flatMap((s: any) => (s.metricType ? [s.metricType] : [])))
		const uniqueMetricTypes = Array.from(metricTypes)

		const hasExplicitAxisIndex = processedSeries.some((s: any) => s.yAxisIndex != null && s.yAxisIndex > 0)
		const maxExplicitAxisIndex = hasExplicitAxisIndex
			? Math.max(...processedSeries.map((s: any) => s.yAxisIndex ?? 0))
			: 0

		const needMultipleAxes = uniqueMetricTypes.length > 1 || hasExplicitAxisIndex

		let finalYAxis: any = yAxis
		let seriesWithHallmarks = processedSeries

		if (needMultipleAxes) {
			const axisCount = Math.max(uniqueMetricTypes.length, maxExplicitAxisIndex + 1, 2)
			finalYAxis = Array.from({ length: Math.min(axisCount, 3) }, (_, index) => ({
				...yAxis,
				axisLabel: {
					...(yAxis as any).axisLabel,
					margin: 4,
					formatter: (value: number) => formatTooltipValue(value, yAxisSymbols[index] ?? valueSymbol)
				},
				position: index === 0 ? 'left' : index === 1 ? 'right' : 'left',
				offset: index === 2 ? 40 : 0
			}))

			seriesWithHallmarks = seriesWithHallmarks.map((s: any) => {
				const axisIndex = s.yAxisIndex ?? uniqueMetricTypes.indexOf(s.metricType)
				return {
					...s,
					yAxisIndex: Math.min(axisIndex >= 0 ? axisIndex : 0, 2)
				}
			})
		}

		const legendRightPadding = needMultipleAxes ? 40 : legend.right
		const gridLeftPadding = 12

		const shouldHideDataZoom = seriesWithHallmarks.every((s: any) => s.data.length < 2) || hideDataZoom

		instance.setOption({
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
				bottom: shouldHideDataZoom ? 12 : 68,
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
			dataZoom: shouldHideDataZoom ? [] : [...dataZoom],
			series: seriesWithHallmarks
		})

		if (alwaysShowTooltip && seriesWithHallmarks.length > 0 && seriesWithHallmarks[0].data.length > 0) {
			instance.dispatchAction({
				type: 'showTip',
				seriesIndex: 0,
				dataIndex: seriesWithHallmarks[0].data.length - 1,
				position: [60, 0]
			})

			instance.on('globalout', () => {
				instance.dispatchAction({
					type: 'showTip',
					seriesIndex: 0,
					dataIndex: seriesWithHallmarks[0].data.length - 1,
					position: [60, 0]
				})
			})
		}
	}, [
		defaultChartSettings,
		processedSeries,
		chartOptions,
		hideDataZoom,
		alwaysShowTooltip,
		series,
		id,
		showAggregateInTooltip,
		valueSymbol,
		yAxisSymbols
	])

	useChartCleanup(id, () => {
		chartRef.current = null
		if (hasNotifiedReadyRef.current) {
			onReadyRef.current?.(null)
			hasNotifiedReadyRef.current = false
		}
	})

	return <ChartContainer id={id} chartClassName="my-auto h-[360px]" chartStyle={height ? { height } : undefined} />
}
