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
	}>
	chartOptions?: {
		[key: string]: {
			[key: string]: any
		}
	}
	height?: string
	groupBy?: 'daily' | 'weekly' | 'monthly'
	hallmarks?: [number, string][]
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
	hallmarks,
	alwaysShowTooltip
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
					})
				}

				if (serie.type === 'line') {
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

		const { graphic, titleDefaults, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

		let seriesWithHallmarks = processedSeries
		if (hallmarks && processedSeries.length > 0) {
			seriesWithHallmarks = [...processedSeries]
			seriesWithHallmarks[0] = {
				...seriesWithHallmarks[0],
				markLine: {
					data: hallmarks.map(([date, event], index: number) => [
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
		}

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
			legend: {
				...legend,
				data: series?.map((s: any) => s.name) || []
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
	}, [
		defaultChartSettings,
		processedSeries,
		chartOptions,
		hideDataZoom,
		hallmarks,
		isThemeDark,
		alwaysShowTooltip,
		series,
		id
	])

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
