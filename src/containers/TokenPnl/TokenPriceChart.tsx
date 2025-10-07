import { useEffect, useRef } from 'react'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { formattedNum } from '~/utils'
import type { PricePoint } from './types'

echarts.use([CanvasRenderer, LineChart, TooltipComponent, GridComponent, MarkLineComponent, LegendComponent])

export const TokenPriceChart = ({
	series,
	markers,
	isLoading,
	overlaySeries,
	onPointClick
}: {
	series: PricePoint[]
	markers: { start: number; end: number; current: number; ath?: number }
	isLoading: boolean
	overlaySeries?: Array<{ id: string; name: string; data: { timestamp: number; price: number }[]; color?: string }>
	onPointClick?: (point: { timestamp: number; price: number }) => void
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
		const markLineData: any[] = []
		if (ath) {
			markLineData.push({
				name: 'ATH',
				label: { formatter: `ATH: $${formattedNum(ath)}` },
				yAxis: ath
			})
		}

		const primaryColor = 'rgb(148, 163, 184)'
		const areaGradient = new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
			{ offset: 0, color: 'rgba(148,163,184,0.22)' },
			{ offset: 1, color: 'rgba(148,163,184,0.00)' }
		])

		const overlaySeriesOptions = (overlaySeries || []).map((ov, idx) => ({
			name: ov.name,
			type: 'line',
			smooth: true,
			showSymbol: false,
			lineStyle: { width: 1.5, opacity: 0.85, color: ov.color || ['#94a3b8', '#64748b', '#475569'][idx % 3] },
			data: ov.data.map((p) => [p.timestamp * 1000, p.price]),
			yAxisIndex: 1
		}))

		chart.setOption({
			animation: false,
			grid: { left: 40, right: 20, top: 20, bottom: 40 },
			xAxis: { type: 'time', splitLine: { show: false } },
			yAxis: [
				{ type: 'value', scale: true, splitLine: { lineStyle: { opacity: 0.12 } } },
				{
					type: 'value',
					scale: true,
					splitLine: { show: false },
					axisLabel: { show: false },
					axisLine: { show: false },
					axisTick: { show: false }
				}
			],
			tooltip: {
				trigger: 'axis',
				backgroundColor: 'transparent',
				borderWidth: 0,
				padding: 0,
				axisPointer: { type: 'line', lineStyle: { color: 'rgba(148,163,184,0.35)', width: 1 } },
				confine: true,
				formatter: (items: any[]) => {
					if (!items?.length) return ''
					const point = items[0]
					const date = new Date(point.value[0])
					return `<div style="backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background: rgba(10,14,20,0.85); border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 6px 24px rgba(0,0,0,0.35); border-radius: 10px; padding: 8px 10px; font-size: 12px; line-height: 1.2; white-space: nowrap;">
							<div style="opacity: .8;">${date.toLocaleDateString()}</div>
							<div style="font-weight: 600;">Price: $${formattedNum(point.value[1])}</div>
						</div>`
				}
			},
			legend: overlaySeriesOptions.length ? { bottom: 6, left: 'center', textStyle: { color: '#cbd5e1' } } : undefined,
			series: [
				{
					type: 'line',
					smooth: true,
					showSymbol: false,
					areaStyle: { opacity: 1, color: areaGradient },
					lineStyle: { width: 2.25, color: primaryColor },
					markLine: markLineData.length
						? {
								symbol: 'none',
								lineStyle: { type: 'dashed', opacity: 0.5 },
								label: { color: '#cbd5e1' },
								data: markLineData
							}
						: undefined,
					data
				},
				...overlaySeriesOptions
			]
		})

		const handleResize = () => {
			chart?.resize()
		}
		window.addEventListener('resize', handleResize)
		const handleClick = (params: any) => {
			if (!params || !onPointClick) return
			if (params.componentType === 'series' && Array.isArray(params.value)) {
				onPointClick({ timestamp: Math.floor(params.value[0] / 1000), price: params.value[1] })
			}
		}
		chart.on('click', handleClick)
		return () => {
			window.removeEventListener('resize', handleResize)
			try {
				chart?.off('click', handleClick)
			} catch {}
			chart?.dispose()
		}
	}, [series, start, end, current, ath, isLoading, overlaySeries, onPointClick])

	return <div ref={containerRef} className="h-[360px] w-full" />
}
