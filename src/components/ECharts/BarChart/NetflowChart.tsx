import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { slug, toK } from '~/utils'
import { capitalize } from 'lodash'
import { useQuery } from '@tanstack/react-query'
import { TagGroup } from '~/components/TagGroup'
import { NETFLOWS_API } from '~/constants'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

interface INetflowChartProps {
	data: Array<{
		chain: string
		net_flow: string
	}>
	height?: string
}

export default function NetflowChart({ height }: INetflowChartProps) {
	const id = useId()
	const [isThemeDark] = useDarkModeManager()
	const [period, setPeriod] = useState('month')

	const { data = [] } = useQuery({
		queryKey: ['netflowData', period],
		queryFn: () =>
			fetch(`${NETFLOWS_API}/${period}`)
				.then((res) => res.json())
				.catch(() => [])
	})

	const { positiveData, negativeData, chains } = useMemo(() => {
		const nonZeroData = data
			.filter((item) => item.net_flow !== '0')
			.map((item) => ({
				chain: item.chain,
				value: Number(item.net_flow)
			}))
			.sort((a, b) => Math.abs(a.value) - Math.abs(b.value))
			.slice(-15)
			.sort((a, b) => a.value - b.value)
			.map((item) => ({
				chain: capitalize(item.chain),
				value: item.value
			}))

		const positive = nonZeroData.map((item) => (item.value > 0 ? item.value : 0))
		const negative = nonZeroData.map((item) => (item.value < 0 ? item.value : 0))
		const chainNames = nonZeroData.map((item) => item.chain)

		return {
			positiveData: positive,
			negativeData: negative,
			chains: chainNames
		}
	}, [data])

	const createInstance = useCallback(() => {
		if (!echarts) return null
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

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
						<span>Net Flow: ${value > 0 ? '+' : ''}${toK(value)}</span>
					</div>`
				}
			},
			grid: {
				top: 20,
				bottom: 20,
				left: 40,
				right: 40,
				containLabel: true
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
					formatter: (value) => toK(value),
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
				}
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
						formatter: (params) => (params.value !== 0 ? toK(params.value) : ''),
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
						formatter: (params) => (params.value !== 0 ? toK(params.value) : ''),
						backgroundColor: 'transparent',
						color: '#22c55e',
						fontSize: 12,
						fontWeight: 500
					}
				}
			],
			graphic: [
				{
					type: 'image',
					id: 'logo',
					left: 'center',
					top: 'center',
					style: {
						image: isThemeDark ? logoLight.src : logoDark.src,
						height: 40,
						opacity: 0.3
					},
					z: -1
				},
				...chains.map((chain, index) => ({
					type: 'image',
					id: `icon-${chain}`,
					style: {
						image: `https://icons.llamao.fi/icons/chains/rsz_${slug(chain)}?w=48&h=48`,
						width: 20,
						height: 20
					},
					left: 10,
					top: (chains.length - 1 - index) * ((parseInt(height) - 62) / chains.length) + 48,
					z: 100,
					clipPath: {
						type: 'rect',
						shape: {
							x: 0,
							y: 0,
							width: 20,
							height: 20,
							r: 50
						}
					}
				}))
			]
		}

		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [createInstance, chains, positiveData, negativeData, isThemeDark, height])

	return (
		<div className="relative min-h-[600px] pr-5">
			<div id={id} className="my-auto min-h-[600px]" style={height ? { height: `${height}px` } : undefined}></div>
			<div className="flex justify-center mt-4">
				<TagGroup values={flowTypes} selectedValue={period} setValue={setPeriod} />
			</div>
		</div>
	)
}

const flowTypes = ['day', 'week', 'month']
