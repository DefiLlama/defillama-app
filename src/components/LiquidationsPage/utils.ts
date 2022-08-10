/* eslint-disable no-unused-vars*/
import { ChartData, ChartDataBin, getReadableValue } from '~/utils/liquidations'

export type ChartState = {
	asset: string // TODO: symbol for now, later change to coingeckoId
	aggregateBy: 'chain' | 'protocol'
	filters: FilterChain | FilterProtocol
}
// this should be pulled dynamically
type FilterChain = ['all'] | ['none'] | string[]
type FilterProtocol = ['all'] | ['none'] | string[]

export const defaultChartState: ChartState = {
	asset: 'ETH',
	aggregateBy: 'protocol',
	filters: ['all']
}

export const convertChartDataBinsToArray = (obj: ChartDataBin, totalBins: number) => {
	// // this line below suddenly throws error in browser that the iterator cant iterate??
	// const arr = [...Array(totalBins).keys()].map((i) => obj.bins[i] || 0)
	const arr = Array.from({ length: totalBins }, (_, i) => i).map((i) => obj.bins[i] || 0)
	return arr
}

export const getOption = (chartData: ChartData, aggregateBy: 'chain' | 'protocol') => {
	const chartDataBins = chartData.chartDataBins[aggregateBy === 'chain' ? 'byProtocol' : 'byChain']
	// convert chartDataBins to array
	const chartDataBinsArray = Object.keys(chartDataBins).map((key) => ({
		key: key,
		data: convertChartDataBinsToArray(chartDataBins[key], 150)
	}))
	const series = chartDataBinsArray.map((obj) => ({
		type: 'bar',
		name: obj.key,
		data: obj.data,
		tooltip: {
			valueFormatter: (value: string) => `$${getReadableValue(Number(value))}`
		},
		emphasis: {
			focus: 'series'
		},
		stack: 'x'
	}))

	const option = {
		legend: {
			orient: 'vertical',
			align: 'left',
			left: 10,
			textStyle: {
				color: '#a1a1aa'
			},
			inactiveColor: '#a1a1aa90'
		},
		grid: {
			left: '2%',
			right: '1%',
			top: '2%',
			bottom: '2%',
			containLabel: true
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'cross'
			}
		},
		xAxis: {
			// bins
			type: 'category',
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			},
			axisLabel: {
				formatter: (value: string) => `$${Number(value).toFixed(3)}`
			},
			axisTick: {
				alignWithLabel: true
			},
			data: Array.from({ length: chartData.totalBins }, (_, i) => i).map((x) => (x * chartData.binSize).toFixed(3))
		},
		yAxis: {
			type: 'value',
			position: 'right',
			axisLabel: {
				formatter: (value: string) => `$${getReadableValue(Number(value))}`
			},
			splitLine: {
				lineStyle: {
					color: '#a1a1aa',
					opacity: 0.1
				}
			}
		},
		series
	}

	return option
}
