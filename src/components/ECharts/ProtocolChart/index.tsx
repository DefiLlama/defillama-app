import { useCallback, useEffect, useMemo } from 'react'
import * as echarts from 'echarts/core'
import { v4 as uuid } from 'uuid'
import styled from 'styled-components'
import { getUtcDateObject, stringToColour } from '../utils'
import type { IChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { toK } from '~/utils'
import { BAR_CHARTS, DISABLED_CUMULATIVE_CHARTS } from './utils'
import { useRouter } from 'next/router'

const Wrapper = styled.div`
	--gradient-end: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)')};
`

const customOffsets = {
	Contributers: 60,
	'Contributers Commits': 80,
	'Devs Commits': 70,
	'NFT Volume': 65
}

export default function AreaBarChart({
	chartData,
	stacks,
	stackColors = {},
	valueSymbol = '',
	title,
	color,
	hallmarks,
	customLegendName,
	customLegendOptions,
	tooltipSort = true,
	chartOptions,
	height = '360px',
	unlockTokenSymbol = '',
	isMonthly,
	isThemeDark,
	...props
}: IChartProps) {
	const id = useMemo(() => uuid(), [])
	const router = useRouter()
	const { groupBy } = router.query
	const isCumulative = router.isReady && groupBy === 'cumulative' ? true : false

	const defaultChartSettings = useDefaults({
		color,
		title,
		valueSymbol,
		tooltipSort,
		hideLegend: true,
		unlockTokenSymbol,
		isThemeDark
	})

	const { series, yAxisByIndex } = useMemo(() => {
		const chartColor = color || stringToColour()

		let atleastOneLineChart = false

		stacks.forEach((stack) => {
			if (!BAR_CHARTS.includes(stack)) {
				atleastOneLineChart = true
			}
		})

		const yAxisByIndex = {}

		if (
			stacks.includes('TVL') ||
			stacks.includes('Mcap') ||
			stacks.includes('FDV') ||
			stacks.includes('Borrowed') ||
			stacks.includes('Staking')
		) {
			yAxisByIndex['TVL+Mcap+FDV+Borrowed+Staking'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Token Price')) {
			yAxisByIndex['Token Price'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Token Volume')) {
			yAxisByIndex['Token Volume'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Token Liquidity')) {
			yAxisByIndex['Token Liquidity'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Bridge Deposits') || stacks.includes('Bridge Withdrawals')) {
			yAxisByIndex['Bridge Deposits+Bridge Withdrawals'] =
				stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (
			stacks.includes('Volume') ||
			stacks.includes('Derivatives Volume') ||
			stacks.includes('Fees') ||
			stacks.includes('Revenue')
		) {
			yAxisByIndex['Volume+Derivatives Volume+Fees+Revenue'] =
				stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Unlocks')) {
			yAxisByIndex['Unlocks'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Active Addresses') || stacks.includes('New Addresses')) {
			yAxisByIndex['Active Addresses+New Addresses'] =
				stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Transactions')) {
			yAxisByIndex['Transactions'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Gas Used')) {
			yAxisByIndex['Gas Used'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Median APY')) {
			yAxisByIndex['Median APY'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('USD Inflows')) {
			yAxisByIndex['USD Inflows'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Total Proposals') || stacks.includes('Successful Proposals')) {
			yAxisByIndex['Total Proposals+Successful Proposals'] =
				stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Max Votes')) {
			yAxisByIndex['Max Votes'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Treasury')) {
			yAxisByIndex['Treasury'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Tweets')) {
			yAxisByIndex['Tweets'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Developers')) {
			yAxisByIndex['Developers'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Contributers')) {
			yAxisByIndex['Contributers'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Devs Commits')) {
			yAxisByIndex['Devs Commits'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Contributers Commits')) {
			yAxisByIndex['Contributers Commits'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('NFT Volume')) {
			yAxisByIndex['NFT Volume'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		if (stacks.includes('Premium Volume')) {
			yAxisByIndex['Premium Volume'] = stacks.length === 1 ? undefined : Object.keys(yAxisByIndex).length
		}

		const series = stacks.map((stack, index) => {
			const stackColor = stackColors[stack]

			let type = BAR_CHARTS.includes(stack) && !isCumulative ? 'bar' : 'line'
			type = DISABLED_CUMULATIVE_CHARTS.includes(stack) ? 'bar' : type

			const options = {}
			if (['TVL', 'Mcap', 'FDV', 'Borrowed', 'Staking'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['TVL+Mcap+FDV+Borrowed+Staking']
			} else if (['Bridge Deposits', 'Bridge Withdrawals'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['Bridge Deposits+Bridge Withdrawals']
			} else if (['Volume', 'Derivatives Volume', 'Fees', 'Revenue'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['Volume+Derivatives Volume+Fees+Revenue']
			} else if (['Active Addresses', 'New Addresses'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['Active Addresses+New Addresses']
			} else if (['Total Proposals', 'Successful Proposals'].includes(stack)) {
				options['yAxisIndex'] = yAxisByIndex['Total Proposals+Successful Proposals']
			} else {
				options['yAxisIndex'] = yAxisByIndex[stack]
			}

			return {
				name: stack,
				type,
				...options,
				scale: true,
				large: true,
				largeThreshold: 0,
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				symbol: 'none',
				itemStyle: {
					color: stackColor || null
				},
				...(type === 'line'
					? {
							areaStyle: {
								color: !customLegendName
									? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
											{
												offset: 0,
												color: stackColor ? stackColor : index === 0 ? chartColor : 'transparent'
											},
											{
												offset: 1,
												color: isThemeDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
											}
									  ])
									: null
							}
					  }
					: { barWidth: isMonthly ? '5' : '1.2' }),
				markLine: {},
				data: []
			}
		})

		chartData.forEach(({ date, ...item }) => {
			stacks.forEach((stack) => {
				series
					.find((t) => t.name === stack)
					?.data.push([
						getUtcDateObject(date),
						item[stack] || (stack === 'TVL' ? 0 : '-'),
						!atleastOneLineChart && groupBy === 'monthly' ? 'monthly' : false
					])
			})
		})

		if (series.length > 0 && hallmarks) {
			series[0] = {
				...series[0],
				markLine: {
					data: hallmarks.map(([date, event], index) => [
						{
							name: event,
							xAxis: getUtcDateObject(date),
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
							xAxis: getUtcDateObject(date),
							yAxis: 'max',
							y: Math.max(hallmarks.length * 40 - index * 40, 40)
						}
					])
				}
			}
		}

		series.forEach((seriesItem) => {
			if (seriesItem.data.length === 0) {
				seriesItem.large = false
			}
		})

		return { series, yAxisByIndex }
	}, [
		chartData,
		stacks,
		color,
		customLegendName,
		hallmarks,
		isThemeDark,
		stackColors,
		isCumulative,
		isMonthly,
		groupBy
	])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, dataZoom, legend } = defaultChartSettings

		for (const option in chartOptions) {
			if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		delete dataZoom[1].right

		const yAxiss = []

		const noOffset = Object.entries(yAxisByIndex).length < 3

		Object.entries(yAxisByIndex).forEach(([type, index]: [string, number]) => {
			const options = {
				...yAxis,
				name: '',
				type: 'value',
				alignTicks: true,
				offset: noOffset || index < 2 ? 0 : (yAxiss[yAxiss.length - 1]?.offset ?? 0) + (customOffsets[type] || 40)
			}

			if (type === 'TVL+Mcap+FDV+Borrowed+Staking') {
				yAxiss.push(yAxis)
			}

			if (type === 'Token Price') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Token Price']
						}
					}
				})
			}

			if (type === 'Token Volume') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Token Volume']
						}
					}
				})
			}

			if (type === 'Token Liquidity') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Token Liquidity']
						}
					}
				})
			}

			if (type === 'Bridge Deposits+Bridge Withdrawals') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Bridge Deposits']
						}
					}
				})
			}

			if (type === 'Volume+Derivatives Volume+Fees+Revenue') {
				yAxiss.push({
					...options
				})
			}

			if (type === 'Unlocks') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value) + ' ' + unlockTokenSymbol
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Unlocks']
						}
					}
				})
			}

			if (type === 'Active Addresses+New Addresses') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					}
				})
			}

			if (type === 'Transactions') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Transactions']
						}
					}
				})
			}

			if (type === 'Gas Used') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Gas Used']
						}
					}
				})
			}
			if (type === 'Median APY') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => `${value}%`
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Median APY']
						}
					}
				})
			}

			if (type === 'USD Inflows') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['USD Inflows']
						}
					}
				})
			}

			if (type === 'Total Proposals+Successful Proposals') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Total Proposals']
						}
					}
				})
			}

			if (type === 'Max Votes') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => toK(value)
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Max Votes']
						}
					}
				})
			}

			if (type === 'Treasury') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Treasury']
						}
					}
				})
			}

			if (type === 'Tweets') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => value + ' tweets'
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Tweets']
						}
					}
				})
			}

			if (type === 'Developers') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => value + ' devs'
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Developers']
						}
					}
				})
			}
			if (type === 'Contributers') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => value + ' contributers'
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Contributers']
						}
					}
				})
			}

			if (type === 'Devs Commits') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => value + ' commits'
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Devs Commits']
						}
					}
				})
			}
			if (type === 'Contributers Commits') {
				yAxiss.push({
					...options,
					axisLabel: {
						formatter: (value) => value + ' commits'
					},
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Contributers Commits']
						}
					}
				})
			}

			if (type === 'NFT Volume') {
				yAxiss.push({
					...options,

					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['NFT Volume']
						}
					}
				})
			}
			if (type === 'Premium Volume') {
				yAxiss.push({
					...options,
					axisLine: {
						show: true,
						lineStyle: {
							color: stackColors['Premium Volume']
						}
					}
				})
			}
		})

		if (Object.entries(yAxisByIndex).length === 0) {
			yAxiss.push(yAxis)
		}

		chartInstance.setOption({
			graphic: { ...graphic },
			legend: {
				...legend,
				left: 65,
				show: stacks.length > 1
			},
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid,
				top: 40
			},
			xAxis: {
				...xAxis
			},
			yAxis: yAxiss,
			dataZoom: [...dataZoom],
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [
		createInstance,
		defaultChartSettings,
		series,
		stacks.length,
		chartOptions,
		unlockTokenSymbol,
		stackColors,
		yAxisByIndex
	])

	return (
		<div style={{ position: 'relative', marginTop: 16 }} {...props}>
			<Wrapper id={id} style={{ height, margin: 'auto 0' }}></Wrapper>
		</div>
	)
}
