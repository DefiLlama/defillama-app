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
	markers: { start: number; end: number; current: number }
	isLoading: boolean
	overlaySeries?: Array<{ id: string; name: string; data: { timestamp: number; price: number }[]; color?: string }>
	onPointClick?: (point: { timestamp: number; price: number }) => void
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const { start, end, current } = markers

	useEffect(() => {
		if (!containerRef.current || isLoading) return
		const chartDom = containerRef.current
		let chart = echarts.getInstanceByDom(chartDom)
		if (!chart) {
			chart = echarts.init(chartDom)
		}
		const data = series.map((point) => [point.timestamp * 1000, point.price])
		const markLineData: any[] = []

		const startTimestamp = start * 1000
		const endTimestamp = end * 1000

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

		const startPrice = series[0]?.price || 0

		chart.setOption({
			animation: true,
			animationDuration: 750,
			animationEasing: 'cubicOut',
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
				axisPointer: {
					type: 'line',
					lineStyle: { color: 'rgba(148,163,184,0.5)', width: 1.5, type: 'solid' },
					z: 0
				},
				confine: true,
				formatter: (items: any[]) => {
					if (!items?.length) return ''
					const point = items[0]
					const date = new Date(point.value[0])
					const price = point.value[1]
					const changeFromStart = startPrice ? ((price - startPrice) / startPrice) * 100 : 0
					const changeColor = changeFromStart >= 0 ? '#10b981' : '#ef4444'
					const changeSign = changeFromStart >= 0 ? '+' : ''

					return `<div style="background: var(--bg-card); border: 1px solid var(--bg-border); box-shadow: 0 6px 24px rgba(0,0,0,0.25); color: var(--text-primary); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.4; white-space: nowrap;">
							<div style="opacity: .75; margin-bottom: 4px;">${date.toLocaleDateString()}</div>
							<div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">$${formattedNum(price)}</div>
							<div style="font-size: 11px; color: ${changeColor}; font-weight: 500;">${changeSign}${changeFromStart.toFixed(2)}% from start</div>
						</div>`
				}
			},
			legend: overlaySeriesOptions.length ? { bottom: 6, left: 'center', textStyle: { color: '#cbd5e1' } } : undefined,
			series: [
				{
					type: 'line',
					smooth: true,
					showSymbol: false,
					symbolSize: 8,
					symbol: 'circle',
					itemStyle: {
						color: primaryColor,
						borderColor: 'var(--bg-card)',
						borderWidth: 2
					},
					emphasis: {
						scale: true,
						focus: 'series',
						lineStyle: { width: 2.5 }
					},
					areaStyle: { opacity: 1, color: areaGradient },
					lineStyle: { width: 2.25, color: primaryColor },
					markPoint: {
						symbol: 'circle',
						symbolSize: 10,
						itemStyle: {
							color: primaryColor,
							borderColor: 'var(--bg-card)',
							borderWidth: 2,
							shadowBlur: 4,
							shadowColor: 'rgba(148,163,184,0.5)'
						},
						label: { show: false },
						data: [
							{ coord: [startTimestamp, series[0]?.price || 0], name: 'Start' },
							{ coord: [endTimestamp, series[series.length - 1]?.price || 0], name: 'End' }
						]
					},
					markLine: markLineData.length
						? {
								symbol: 'none',
								lineStyle: { type: 'dashed', opacity: 0.35, width: 1 },
								label: { color: 'var(--text-secondary)', fontSize: 11 },
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
	}, [series, start, end, current, isLoading, overlaySeries, onPointClick])

	return <div ref={containerRef} className="h-[360px] w-full" />
}
