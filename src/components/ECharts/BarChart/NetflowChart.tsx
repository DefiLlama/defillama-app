import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { toK } from '~/utils'
import { capitalize } from 'lodash'
import { useQuery } from '@tanstack/react-query'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { NETFLOWS_API } from '~/constants'

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
		queryFn: () => fetch(`${NETFLOWS_API}/${period}`).then((res) => res.json())
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
					return `${chain}<br/>Net Flow: ${value > 0 ? '+' : ''}${toK(value)}`
				}
			},
			grid: {
				top: 80,
				bottom: 20,
				left: 120,
				right: 60
			},
			xAxis: {
				type: 'value',
				position: 'top',
				splitLine: {
					lineStyle: {
						color: '#a1a1aa',
						opacity: 0.1
					}
				},
				axisLabel: {
					formatter: (value) => toK(value)
				}
			},
			yAxis: {
				type: 'category',
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
				data: chains,
				axisLabel: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					rich: {
						icon: {
							height: 20,
							width: 20,
							backgroundColor: (params: any) => {
								return `https://icons.llamao.fi/icons/chains/rsz_${params.value.toLowerCase()}?w=48&h=48`
							}
						},
						value: {
							height: 20,
							align: 'center',
							padding: [0, 0, 0, 10]
						}
					}
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
						borderRadius: 0
					},
					symbol: 'none',
					symbolSize: 0,
					barCategoryGap: '40%',
					label: {
						show: true,
						position: 'left',
						formatter: (params) => (params.value !== 0 ? toK(params.value) : ''),
						backgroundColor: isThemeDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
						padding: [4, 8],
						color: isThemeDark ? '#fff' : '#000',
						borderRadius: 4,
						fontSize: 12
					}
				},
				{
					name: 'Inflow',
					type: 'bar',
					stack: 'Total',
					data: positiveData,
					itemStyle: {
						color: '#22c55e'
					},
					label: {
						show: true,
						position: 'right',
						formatter: (params) => (params.value !== 0 ? toK(params.value) : ''),
						padding: [4, 8],
						borderRadius: 4,
						color: isThemeDark ? '#fff' : '#000',
						fontSize: 12
					}
				}
			],
			graphic: chains.map((chain, index) => ({
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
		<div style={{ position: 'relative' }}>
			<RowFilter
				values={['day', 'week', 'month']}
				selectedValue={period}
				setValue={setPeriod}
				style={{ marginLeft: 'auto' }}
			/>
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
