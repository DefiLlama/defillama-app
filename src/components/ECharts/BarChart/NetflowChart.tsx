import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { TooltipComponent, GridComponent } from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { toK } from '~/utils'
import { capitalize } from 'lodash'
import { useQuery } from '@tanstack/react-query'
import { RowFilter } from '~/components/Filters/RowFilter'
import { NETFLOWS_API } from '~/constants'
import llamaLogo from '~/assets/logo_white_long.svg'

echarts.use([BarChart, TooltipComponent, GridComponent, CanvasRenderer])

interface INetflowChartProps {
	data: Array<{
		chain: string
		net_flow: string
	}>
	height?: string
}

export default function NetflowChart({ height = '800px' }: INetflowChartProps) {
	const id = useMemo(() => crypto.randomUUID(), [])
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
				top: 100,
				bottom: 20,
				left: 140,
				right: 80
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
						image: llamaLogo.src,
						width: 150,
						height: 50,
						opacity: 0.15
					},
					z: -1
				},
				...chains.map((chain, index) => ({
					type: 'image',
					id: `icon-${chain}`,

					style: {
						image: `https://icons.llamao.fi/icons/chains/rsz_${chain.toLowerCase()}?w=48&h=48`,
						width: 20,
						height: 20
					},
					left: 10,
					top: (chains.length - 1 - index) * ((parseInt(height) - 100) / chains.length) + 90,
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
	}, [createInstance, chains, positiveData, negativeData, isThemeDark])

	return (
		<div className="relative">
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					marginTop: '20px'
				}}
			>
				<RowFilter values={flowTypes} selectedValue={period} setValue={setPeriod} />
			</div>
		</div>
	)
}

const flowTypes = ['day', 'week', 'month']
