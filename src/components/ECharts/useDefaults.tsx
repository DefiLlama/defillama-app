import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent,
	LegendComponent
} from 'echarts/components'
import { useMedia } from '~/hooks'
import logoLight from '~/public/defillama-press-kit/defi/PNG/defillama-light-neutral.png'
import logoDark from '~/public/defillama-press-kit/defi/PNG/defillama-dark-neutral.png'
import { toK } from '~/utils'
import { useMemo } from 'react'
import { lastDayOfMonth } from './ProtocolChart/useFetchAndFormatChartData'

const CHART_SYMBOLS = {
	'Active Users': '',
	'Returning Users': '',
	'New Users': '',
	Transactions: '',
	'Total Proposals': '',
	'Successful Proposals': '',
	'Max Votes': '',
	TVL: '$',
	APY: '%',
	'Median APY': '%',
	Treasury: '$',
	Tweets: ''
}

echarts.use([
	CanvasRenderer,
	LineChart,
	BarChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	DataZoomComponent,
	GraphicComponent,
	MarkLineComponent,
	LegendComponent
])

interface IUseDefaultsProps {
	color: string
	title: string
	tooltipSort?: boolean
	tooltipOrderBottomUp?: boolean
	valueSymbol?: string
	hideLegend?: boolean
	isStackedChart?: boolean
	unlockTokenSymbol?: string
	isThemeDark: boolean
}

export function useDefaults({
	color,
	title,
	tooltipSort = true,
	tooltipOrderBottomUp,
	valueSymbol = '',
	hideLegend,
	isStackedChart,
	unlockTokenSymbol = '',
	isThemeDark
}: IUseDefaultsProps) {
	const isSmall = useMedia(`(max-width: 37.5rem)`)

	const defaults = useMemo(() => {
		const graphic = {
			type: 'image',
			z: 0,
			style: {
				image: isThemeDark ? logoLight.src : logoDark.src,
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '40%' : '45%',
			top: '130px'
		}

		const titleDefaults = {
			text: title,
			textStyle: {
				fontFamily: 'sans-serif',
				fontWeight: 600,
				color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			left: 15
		}

		const gridTop = valueSymbol === '%' ? 20 : hideLegend ? 0 : isSmall ? 60 : 10

		const grid = {
			left: 20,
			containLabel: true,
			bottom: 60,
			top: title === '' ? gridTop + 20 : gridTop + 48,
			right: 20
		}

		const tooltip = {
			trigger: 'axis',
			confine: true,
			formatter: function (params) {
				let chartdate = new Date(params[0].value[0]).toLocaleDateString(undefined, {
					year: params[0].value[2] === 'monthly' ? undefined : 'numeric',
					month: 'short',
					day: 'numeric'
				})

				chartdate +=
					params[0].value[2] === 'monthly'
						? ' - ' + lastDayOfMonth(params[0].value[0]) + ', ' + new Date(params[0].value[0]).getFullYear()
						: ''

				let vals
				let filteredParams = params.filter((item) => item.value[1] !== '-' && item.value[1] !== null)

				if (isStackedChart) {
					filteredParams.reverse()
				} else {
					filteredParams.sort((a, b) => (tooltipSort ? Math.abs(b.value[1]) - Math.abs(a.value[1]) : 0))
				}

				const otherIndex = filteredParams.findIndex((item) => item.seriesName === 'Others')
				let others

				if (otherIndex >= 0 && otherIndex < 10) {
					others = filteredParams[otherIndex]
					filteredParams = filteredParams.filter((item) => item.seriesName !== 'Others')
				}
				const topParams = filteredParams.slice(0, 10)
				const otherParams = filteredParams.slice(10)

				if (tooltipOrderBottomUp) {
					topParams.reverse()
				}

				vals = topParams.reduce((prev, curr) => {
					return (prev +=
						'<li style="list-style:none">' +
						curr.marker +
						curr.seriesName +
						'&nbsp;&nbsp;' +
						formatTooltipValue(
							curr.value[1],
							curr.seriesName === 'Unlocks'
								? unlockTokenSymbol
								: curr.seriesName.includes('Active Users')
								? 'Users'
								: curr.seriesName.includes('New Users')
								? 'Users'
								: curr.seriesName.includes('Returning Users')
								? 'Users'
								: curr.seriesName.includes('Transactions')
								? 'TXs'
								: curr.seriesName === 'TVL' && valueSymbol !== '$'
								? valueSymbol
								: Object.keys(CHART_SYMBOLS).includes(curr.seriesName)
								? CHART_SYMBOLS[curr.seriesName]
								: valueSymbol
						) +
						'</li>')
				}, '')

				if (otherParams.length !== 0) {
					const otherString =
						'<li style="list-style:none">' +
						(others?.marker ?? otherParams[0].marker) +
						'Others' +
						'&nbsp;&nbsp;' +
						formatTooltipValue(
							toK(otherParams.reduce((prev, curr) => prev + curr.value[1], 0) + (others?.value[1] ?? 0)),
							valueSymbol
						) +
						'</li>'

					if (tooltipOrderBottomUp) {
						vals = otherString + vals
					} else {
						vals += otherString
					}
				}

				const mcap = params.filter((param) => param.seriesName === 'Mcap')?.[0]?.value[1]
				const tvl = params.filter((param) => param.seriesName === 'TVL')?.[0]?.value[1]

				if (mcap && tvl) {
					vals += '<li style="list-style:none">' + 'Mcap/TVL' + '&nbsp;&nbsp;' + Number(mcap / tvl).toFixed(2) + '</li>'
				}

				if (title.toLowerCase() === 'tokens (usd)' || title.toLowerCase() === 'chains') {
					const total = params.reduce((acc, curr) => (acc += curr.value[1]), 0)

					vals += '<li style="list-style:none;font-weight:600">' + 'Total' + '&nbsp;&nbsp;' + '$' + toK(total) + '</li>'
				}

				return chartdate + vals
			}
		}

		const inflowsTooltip = {
			trigger: 'axis',
			confine: true,
			formatter: function (params) {
				const chartdate = new Date(params[0].value[0]).toLocaleDateString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})

				let vals = params
					.sort((a, b) => (tooltipSort ? a.value[1] - b.value[1] : 0))
					.reduce((prev, curr) => {
						if (curr.value[1] !== 0 && curr.value[1] !== '-') {
							return (prev +=
								'<li style="list-style:none">' +
								curr.marker +
								curr.seriesName +
								'&nbsp;&nbsp;' +
								valueSymbol +
								toK(curr.value[1]) +
								'</li>')
						} else return prev
					}, '')

				const total = params.reduce((acc, curr) => (acc += curr.value[1]), 0)

				vals += '<li style="list-style:none;font-weight:600">' + 'Total Inflows' + '&nbsp;&nbsp;' + toK(total) + '</li>'

				return chartdate + vals
			}
		}

		const xAxis = {
			type: 'time',
			boundaryGap: false,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400
			},
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.2
				}
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		}

		const yAxis = {
			type: 'value',
			axisLabel: {
				formatter: (value) =>
					valueSymbol === '$'
						? valueSymbol + toK(value)
						: (valueSymbol === '%' ? value : toK(value)) + ' ' + valueSymbol
			},
			axisLine: {
				lineStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
					opacity: 0.1
				}
			},
			boundaryGap: false,
			nameTextStyle: {
				fontFamily: 'sans-serif',
				fontSize: 14,
				fontWeight: 400,
				color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		}

		const legend = {
			textStyle: {
				fontFamily: 'sans-serif',
				fontSize: 12,
				fontWeight: 400,
				color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
			},
			top: !hideLegend && isSmall ? 30 : 0,
			right: !hideLegend && isSmall ? null : 20
		}

		const dataZoom = [
			{
				type: 'inside',
				start: 0,
				end: 100
			},
			{
				start: 0,
				end: 100,
				right: 20,
				textStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
				handleStyle: {
					borderColor: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
					color: isThemeDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
				},
				moveHandleStyle: {
					color: isThemeDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
				},
				selectedDataBackground: {
					lineStyle: {
						color
					},
					areaStyle: {
						color
					}
				},
				emphasis: {
					handleStyle: {
						borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
						color: isThemeDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
					},
					moveHandleStyle: {
						borderColor: isThemeDark ? 'rgba(255, 255, 255, 1)' : '#000',
						color: isThemeDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
					}
				},
				fillerColor: isThemeDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
				labelFormatter: (val) => {
					const date = new Date(val)
					return date.toLocaleDateString()
				}
			}
		]

		return { graphic, grid, titleDefaults, tooltip, xAxis, yAxis, legend, dataZoom, inflowsTooltip }
	}, [
		color,
		isThemeDark,
		isSmall,
		title,
		tooltipSort,
		valueSymbol,
		hideLegend,
		isStackedChart,
		tooltipOrderBottomUp,
		unlockTokenSymbol
	])

	return defaults
}

export const formatTooltipValue = (value, symbol) => {
	return symbol === '$'
		? symbol + toK(value)
		: symbol === '%'
		? Math.round(value * 100) / 100 + ' %'
		: (`${value}`.startsWith('0.00') ? toK(value) : toK(value)) + ' ' + symbol
}
