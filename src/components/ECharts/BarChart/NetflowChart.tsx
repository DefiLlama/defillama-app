import { useQuery } from '@tanstack/react-query'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { TagGroup } from '~/components/TagGroup'
import { NETFLOWS_API } from '~/constants'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { capitalizeFirstLetter, formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

export interface NetflowChartProps {
	height?: number | string
	onReady?: (instance: echarts.ECharts | null) => void
}

export default function NetflowChart({ height, onReady }: NetflowChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const [period, setPeriod] = useState('month')
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const { data = [] } = useQuery<Array<{ chain: string; net_flow: string }>>({
		queryKey: ['netflowData', period],
		queryFn: () => fetchJson(`${NETFLOWS_API}/${period}`).catch(() => [])
	})

	const { positiveData, negativeData, chains, csvSource } = useMemo(() => {
		const nonZeroData = (data ?? [])
			.filter((item) => item.net_flow !== '0')
			.map((item) => ({
				chain: item.chain,
				value: Number(item.net_flow)
			}))
			.sort((a, b) => Math.abs(a.value) - Math.abs(b.value))
			.slice(-15)
			.sort((a, b) => a.value - b.value)
			.map((item) => ({
				chain: capitalizeFirstLetter(item.chain),
				value: item.value
			}))

		const positive = nonZeroData.map((item) => (item.value > 0 ? item.value : 0))
		const negative = nonZeroData.map((item) => (item.value < 0 ? item.value : 0))
		const chainNames = nonZeroData.map((item) => item.chain)

		return {
			positiveData: positive,
			negativeData: negative,
			chains: chainNames,
			csvSource: nonZeroData.map((item) => ({
				Chain: item.chain,
				Inflow: item.value > 0 ? item.value : 0,
				Outflow: item.value < 0 ? item.value : 0,
				'Net Flow': item.value
			}))
		}
	}, [data])

	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		onReady?.(instance)

		return () => {
			onReady?.(null)
			chartRef.current = null
			instance.dispose()
		}
	}, [id, onReady])

	const heightStyle = useMemo(() => {
		if (height == null) return undefined
		if (typeof height === 'number') return { height: `${height}px` }
		return { height }
	}, [height])

	useEffect(() => {
		const instance = chartRef.current
		if (!instance) return

		const option = {
			tooltip: {
				trigger: 'axis',
				axisPointer: {
					type: 'shadow'
				},
				formatter: function (params) {
					const chain = params[0].axisValue
					const value = (params[0].value || 0) + (params[1].value || 0)
					return `<div class="flex flex-col gap-1">
						<span class="font-medium">${chain}</span>
						<span>Net Flow: ${value > 0 ? '+' : ''}${formattedNum(value)}</span>
					</div>`
				}
			},
			grid: {
				top: 12,
				bottom: 12,
				left: 42,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis: {
				type: 'value',
				position: 'top',
				splitLine: {
					lineStyle: {
						color: isThemeDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
						type: 'dashed'
					}
				},
				axisLabel: {
					formatter: (value) => formattedNum(value),
					color: isThemeDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
				}
			},
			yAxis: {
				type: 'category',
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
				data: chains,
				axisLabel: {
					color: isThemeDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
					fontSize: 13,
					padding: [0, 0, 0, 50]
				},
				offset: 30
			},
			series: [
				{
					name: 'Outflow',
					type: 'bar',
					stack: 'Total',
					data: negativeData,
					itemStyle: {
						color: '#ef4444',
						borderRadius: [0, 4, 4, 0]
					},
					barWidth: '50%',
					label: {
						show: true,
						position: 'left',
						formatter: (params) => (params.value !== 0 ? formattedNum(params.value) : ''),
						backgroundColor: 'transparent',
						color: '#ef4444',
						fontSize: 12,
						fontWeight: 500
					}
				},
				{
					name: 'Inflow',
					type: 'bar',
					stack: 'Total',
					data: positiveData,
					itemStyle: {
						color: '#22c55e',
						borderRadius: [4, 0, 0, 4]
					},
					barWidth: '50%',
					label: {
						show: true,
						position: 'right',
						formatter: (params) => (params.value !== 0 ? formattedNum(params.value) : ''),
						backgroundColor: 'transparent',
						color: '#22c55e',
						fontSize: 12,
						fontWeight: 500
					}
				}
			],
			dataset: {
				dimensions: ['Chain', 'Inflow', 'Outflow', 'Net Flow'],
				source: csvSource
			},
			graphic: [
				{
					type: 'image',
					id: 'logo',
					left: 'center',
					top: 'center',
					style: {
						image: isThemeDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
						height: 40,
						opacity: 0.3
					},
					z: -1
				}
			]
		}

		instance.setOption(option, { notMerge: true })
		instance.resize()
	}, [chains, positiveData, negativeData, isThemeDark, csvSource, height])

	return (
		<div className="relative min-h-[600px] pr-5">
			<div id={id} className="my-auto min-h-[600px]" style={heightStyle}></div>
			<div className="m-4 flex justify-center">
				<TagGroup values={flowTypes} selectedValue={period} setValue={setPeriod} />
			</div>
		</div>
	)
}

const flowTypes = ['day', 'week', 'month']
