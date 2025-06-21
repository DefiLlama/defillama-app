import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { download, toNiceCsvDate, slug } from '~/utils'

interface IMultiSeriesChartProps {
	series?: Array<{
		data: Array<[number, number]>
		type: 'line' | 'bar'
		name: string
		color: string
		logo?: string
		stack?: string
		areaStyle?: any
	}>
	chartOptions?: {
		[key: string]: {
			[key: string]: any
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
	valueSymbol?: string
	alwaysShowTooltip?: boolean
	hideDataZoom?: boolean
	hideDownloadButton?: boolean
	title?: string
	highlights?: any
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
	alwaysShowTooltip,
	highlights
}: IMultiSeriesChartProps) {
	const id = useId()

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		valueSymbol,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
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

				if (Array.isArray(highlights)) {
					const markLineData = []
					const markAreaData = []
					highlights.forEach((hl) => {
						if (hl.type === 'vline') {
							markLineData.push({
								name: hl.label,
								xAxis: hl.timestamp * 1000,
								label: { formatter: hl.label }
							})
						} else if (hl.type === 'hline') {
							markLineData.push({
								name: hl.label,
								yAxis: hl.value,
								label: { formatter: hl.label }
							})
						} else if (hl.type === 'highlight_range') {
							markAreaData.push([
								{
									xAxis: hl.start * 1000,
									itemStyle: { opacity: 0.15 },
									label: { show: !!hl.label, formatter: hl.label }
								},
								{ xAxis: hl.end * 1000 }
							])
						}
					})
					if (markLineData.length > 0) {
						serieConfig.markLine = { data: markLineData }
					}
					if (markAreaData.length > 0) {
						serieConfig.markArea = { data: markAreaData }
					}
				}

				return serieConfig
			}) || []
		)
	}, [series, isThemeDark, highlights])

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

		const maxValues = processedSeries.map((s: any) => {
			const vals = (s.data || []).map((d: any) => (typeof d[1] === 'number' ? d[1] : 0))
			return vals.length ? Math.max(...vals) : 0
		})
		const overallMax = maxValues.length ? Math.max(...maxValues) : 0
		const minMax = maxValues.length ? Math.min(...maxValues.filter((v) => v > 0)) : 0
		const ratioThreshold = 100
		const needSecondaryAxis = minMax > 0 && overallMax > 0 && overallMax / minMax > ratioThreshold

		let finalYAxis: any = yAxis
		let seriesWithHallmarks = processedSeries

		if (needSecondaryAxis) {
			finalYAxis = [
				{ ...yAxis, position: 'left' },
				{ ...yAxis, position: 'right' }
			]

			seriesWithHallmarks = seriesWithHallmarks.map((s: any, idx: number) => ({
				...s,
				yAxisIndex: idx < maxValues.length && maxValues[idx] < overallMax / ratioThreshold ? 1 : 0
			}))
		}

		const legendRightPadding = needSecondaryAxis ? 40 : legend.right

		chartInstance.setOption({
			graphic,
			tooltip,
			title: titleDefaults,
			grid: {
				left: 12,
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
