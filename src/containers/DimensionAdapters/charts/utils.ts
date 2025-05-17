import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { ProtocolAdaptorSummaryResponse } from '~/api/categories/adaptors/types'
import { chartBreakdownByTokens, chartBreakdownByVersion } from '~/api/categories/adaptors/utils'
import { IDimensionChartTypes } from '../types'
import { firstDayOfMonth, getNDistinctColors, lastDayOfWeek } from '~/utils'
import { IDimensionChainChartProps } from '../types'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/useDefaults'

export const chartFormatterBy = (chartType: IDimensionChartTypes) => {
	switch (chartType) {
		case 'version':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByVersion(totalDataChartBreakdown ?? [])
		case 'tokens':
			return (
				_mainChart: [IJoin2ReturnType, string[]],
				totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			) => chartBreakdownByTokens(totalDataChartBreakdown ?? [])
		case 'chain':
		default:
			return (
				mainChart: [IJoin2ReturnType, string[]],
				_totalDataChartBreakdown: ProtocolAdaptorSummaryResponse['totalDataChartBreakdown']
			): [IJoin2ReturnType, string[]] => mainChart
	}
}

export type DataIntervalType = 'Daily' | 'Weekly' | 'Monthly' | string
export const GROUP_INTERVALS_LIST: DataIntervalType[] = ['Daily', 'Weekly', 'Monthly']
export const INTERVALS_LIST: DataIntervalType[] = [...GROUP_INTERVALS_LIST, 'Cumulative']
export type ChartType = 'Volume' | 'Dominance'
export const GROUP_CHART_LIST: ChartType[] = ['Volume', 'Dominance']

export const getChartDataByChainAndInterval = ({
	chartData,
	chartInterval,
	chartType,
	selectedChains
}: {
	chartData: IDimensionChainChartProps['chartData']
	chartInterval: DataIntervalType
	chartType?: ChartType
	selectedChains: string[]
}) => {
	if (chartType === 'Dominance') {
		const sumByDate = {}
		for (const { date, ...items } of chartData[0]) {
			const finalDate = +date * 1e3

			for (const chain in items) {
				if (selectedChains.includes(chain)) {
					sumByDate[finalDate] = (sumByDate[finalDate] || 0) + (items[chain] || 0)
				}
			}
		}

		const dataByChain = {}
		for (const { date, ...items } of chartData[0]) {
			const finalDate = +date * 1e3

			// for (const chain of selectedChains) {
			// 	dataByChain[chain] = dataByChain[chain] || []
			// 	dataByChain[chain].push([finalDate, sumByDate ? (Number(items[chain] || 0) / sumByDate[finalDate]) * 100 : 0])
			// }

			for (const chain in items) {
				if (selectedChains.includes(chain)) {
					dataByChain[chain] = dataByChain[chain] || []
					dataByChain[chain].push([finalDate, sumByDate ? (Number(items[chain] || 0) / sumByDate[finalDate]) * 100 : 0])
				}
			}
		}

		const allColors = getNDistinctColors(selectedChains.length + 1, '#1f67d2')
		const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
		stackColors[selectedChains[0]] = '#1f67d2'
		stackColors['Others'] = allColors[allColors.length - 1]

		return {
			chartData: dataByChain,
			stackColors,
			chartOptions: {}
		}
	}

	if (chartInterval === 'Cumulative') {
		const cumulativeByChain = {}
		const dataByChain = {}

		for (const { date, ...items } of chartData[0]) {
			const finalDate = +date * 1e3

			for (const chain in items) {
				if (selectedChains.includes(chain)) {
					cumulativeByChain[chain] = (cumulativeByChain[chain] || 0) + (items[chain] || 0)
					dataByChain[chain] = dataByChain[chain] || []
					dataByChain[chain].push([finalDate, cumulativeByChain[chain]])
				}
			}
		}

		const allColors = getNDistinctColors(selectedChains.length + 1, '#1f67d2')
		const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
		stackColors[selectedChains[0]] = '#1f67d2'
		stackColors['Others'] = allColors[allColors.length - 1]

		return {
			chartData: dataByChain,
			stackColors,
			chartOptions: {}
		}
	}

	const topByAllDates = {}

	const uniqTopChains = new Set<string>()
	for (const { date, ...items } of chartData[0]) {
		const finalDate =
			chartInterval === 'Weekly'
				? lastDayOfWeek(+date * 1e3) * 1e3
				: chartInterval === 'Monthly'
				? firstDayOfMonth(+date * 1e3) * 1e3
				: +date * 1e3

		const topByDate = {}
		let others = 0
		const topItems = []
		for (const chain in items) {
			if (selectedChains.includes(chain)) {
				topItems.push([chain, items[chain]])
			}
		}
		topItems
			.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
			.forEach(([chain, value]: [string, number], index: number) => {
				if (index < 10) {
					topByDate[chain] = topByDate[chain] || {}
					topByDate[chain][finalDate] = value ?? 0
					uniqTopChains.add(chain)
				} else {
					topByDate[chain] = topByDate[chain] || {}
					topByDate[chain][finalDate] = 0
					others += value ?? 0
				}
			})

		for (const chain of selectedChains) {
			topByAllDates[chain] = topByAllDates[chain] || {}
			topByAllDates[chain][finalDate] = (topByAllDates[chain][finalDate] || 0) + (topByDate[chain]?.[finalDate] ?? 0)
		}

		topByAllDates['Others'] = topByAllDates['Others'] || {}
		topByAllDates['Others'][finalDate] = (topByAllDates['Others'][finalDate] || 0) + others
	}

	const finalData = {}
	const zeroesByChain = {}
	for (const chain of [...uniqTopChains, 'Others']) {
		finalData[chain] = finalData[chain] || []
		for (const finalDate in topByAllDates[chain]) {
			finalData[chain].push([+finalDate, topByAllDates[chain][finalDate]])
		}
		if (selectedChains.includes(chain)) {
			zeroesByChain[chain] = Math.max(
				finalData[chain].findIndex((date) => date[1] !== 0),
				0
			)
		}
	}

	let startingZeroDatesToSlice = Object.values(zeroesByChain).sort((a, b) => (a as number) - (b as number))[0]
	for (const chain in finalData) {
		if (!finalData[chain].length) delete finalData[chain]
	}
	for (const chain in finalData) {
		finalData[chain] = finalData[chain].slice(startingZeroDatesToSlice)
	}

	const allColors = getNDistinctColors(selectedChains.length + 1, '#1f67d2')
	const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
	stackColors[selectedChains[0]] = '#1f67d2'
	stackColors['Others'] = allColors[allColors.length - 1]

	const chartOptions = {
		tooltip: {
			trigger: 'axis',
			confine: true,
			formatter: function (params) {
				let chartdate = formatTooltipChartDate(params[0].value[0], chartInterval.toLowerCase() as any)
				let others = 0
				let othersMarker = ''
				let vals = params
					.sort((a, b) => b.value[1] - a.value[1])
					.reduce((prev, curr) => {
						if (curr.value[1] === 0) return prev
						if (curr.seriesName === 'Others') {
							others += curr.value[1]
							othersMarker = curr.marker
							return prev
						}
						return (prev +=
							'<li style="list-style:none">' +
							curr.marker +
							curr.seriesName +
							'&nbsp;&nbsp;' +
							formatTooltipValue(curr.value[1], '$') +
							'</li>')
					}, '')
				if (others) {
					vals +=
						'<li style="list-style:none">' +
						othersMarker +
						'Others&nbsp;&nbsp;' +
						formatTooltipValue(others, '$') +
						'</li>'
				}
				return chartdate + vals
			}
		}
	}

	return {
		chartData: finalData,
		stackColors,
		chartOptions
	}
}
