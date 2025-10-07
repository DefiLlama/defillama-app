import { useEffect, useRef } from 'react'
import { LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, MarkPointComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { formattedNum } from '~/utils'
import type { PricePoint } from './types'

echarts.use([CanvasRenderer, LineChart, TooltipComponent, GridComponent, MarkPointComponent, MarkLineComponent])

export const TokenPriceChart = ({
	series,
	markers,
	isLoading
}: {
	series: PricePoint[]
	markers: { start: number; end: number; current: number; ath?: number }
	isLoading: boolean
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const { start, end, current, ath } = markers

	useEffect(() => {
		if (!containerRef.current || isLoading) return
		const chartDom = containerRef.current
		let chart = echarts.getInstanceByDom(chartDom)
		if (!chart) {
			chart = echarts.init(chartDom)
		}
		const data = series.map((point) => [point.timestamp * 1000, point.price])
		const markPointData: any[] = []
		if (series.length) {
			markPointData.push({
				name: 'Start',
				coord: [series[0].timestamp * 1000, start],
				value: `$${formattedNum(start)}`
			})
			markPointData.push({
				name: 'End',
				coord: [series[series.length - 1].timestamp * 1000, end],
				value: `$${formattedNum(end)}`
			})
			markPointData.push({
				name: 'Current',
				coord: [series[series.length - 1].timestamp * 1000, current],
				value: `$${formattedNum(current)}`
			})
		}
		const markLineData: any[] = []
		if (ath) {
			markLineData.push({
				name: 'ATH',
				label: { formatter: `ATH: $${formattedNum(ath)}` },
				yAxis: ath
			})
		}
		chart.setOption({
			animation: false,
			grid: { left: 40, right: 20, top: 20, bottom: 40 },
			xAxis: { type: 'time', splitLine: { show: false } },
			yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { opacity: 0.2 } } },
			tooltip: {
				trigger: 'axis',
				formatter: (items: any[]) => {
					const point = items?.[0]
					if (!point) return ''
					const date = new Date(point.value[0])
					return `\n\t\t\t\t\t<div class="space-y-1 text-xs">\n\t\t\t\t\t\t<div>${date.toLocaleDateString()}</div>\n\t\t\t\t\t\t<div>Price: $${formattedNum(point.value[1])}</div>\n\t\t\t\t\t</div>\n\t\t\t\t`
				}
			},
			series: [
				{
					type: 'line',
					smooth: true,
					showSymbol: false,
					areaStyle: { opacity: 0.1 },
					lineStyle: { width: 2 },
					markPoint: {
						symbolSize: 52,
						label: { formatter: ({ value, name }: any) => `${name}\n${value}` },
						data: markPointData
					},
					markLine: markLineData.length ? { symbol: 'none', data: markLineData } : undefined,
					data
				}
			]
		})

		const handleResize = () => {
			chart?.resize()
		}
		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
			chart?.dispose()
		}
	}, [series, start, end, current, ath, isLoading])

	return <div ref={containerRef} className="h-[360px] w-full" />
}
