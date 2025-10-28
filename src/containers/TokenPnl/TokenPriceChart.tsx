import { useMemo } from 'react'
import MultiSeriesChart from '~/components/ECharts/MultiSeriesChart'
import { formattedNum } from '~/utils'
import type { PricePoint } from './types'

interface TokenPriceChartProps {
	series: PricePoint[]
	isLoading: boolean
	onPointClick?: (point: { timestamp: number; price: number }) => void
}

export const TokenPriceChart = ({ series, isLoading, onPointClick }: TokenPriceChartProps) => {
	const startPrice = series[0]?.price || 0
	const endPrice = series[series.length - 1]?.price || 0
	const isPositive = endPrice >= startPrice

	const primaryColor = isPositive ? '#10b981' : '#ef4444'

	const yAxisConfig = useMemo(() => {
		if (!series.length) return { min: 0, max: 0, interval: 1000 }
		const prices = series.map((pt) => pt.price)
		const min = Math.min(...prices)
		const max = Math.max(...prices)
		const range = max - min

		const magnitude = Math.pow(10, Math.floor(Math.log10(range)))
		const normalized = range / magnitude
		const interval =
			normalized <= 1
				? magnitude * 0.2
				: normalized <= 2
					? magnitude * 0.5
					: normalized <= 5
						? magnitude
						: magnitude * 2

		return {
			min: Math.floor(min / interval) * interval,
			max: Math.ceil(max / interval) * interval,
			interval
		}
	}, [series])

	const chartSeries = useMemo(
		() => [
			{
				name: 'Price',
				type: 'line' as const,
				color: primaryColor,
				data: series.map((pt) => [pt.timestamp, pt.price] as [number, number])
			}
		],
		[series, primaryColor]
	)

	const chartOptions = useMemo(
		() => ({
			grid: {
				left: 0,
				right: 0,
				top: 12,
				bottom: 12
			},
			yAxis: {
				min: yAxisConfig.min,
				max: yAxisConfig.max,
				interval: yAxisConfig.interval
			},
			legend: {
				show: false
			},
			tooltip: {
				backgroundColor: 'transparent',
				borderWidth: 0,
				padding: 0,
				axisPointer: {
					type: 'line',
					lineStyle: { color: 'rgba(148,163,184,0.5)', width: 1.5, type: 'solid' },
					z: 0
				},
				formatter: (items: any) => {
					const itemsArray = Array.isArray(items) ? items : [items]
					if (!itemsArray?.length) return ''
					const point = itemsArray[0]
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
			series: [
				{
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
							{ coord: [series[0]?.timestamp * 1000, series[0]?.price || 0], name: 'Start' },
							{
								coord: [series[series.length - 1]?.timestamp * 1000, series[series.length - 1]?.price || 0],
								name: 'End'
							}
						]
					}
				}
			]
		}),
		[series, startPrice, primaryColor, yAxisConfig]
	)

	const handleReady = (instance: any) => {
		if (!instance || !onPointClick) return

		const handleClick = (params: any) => {
			if (!params) return
			if (params.componentType === 'series' && Array.isArray(params.value)) {
				onPointClick({ timestamp: Math.floor(params.value[0] / 1000), price: params.value[1] })
			}
		}

		instance.on('click', handleClick)
	}

	if (isLoading) {
		return <div className="h-[360px] w-full" />
	}

	return (
		<MultiSeriesChart
			series={chartSeries}
			valueSymbol="$"
			height="360px"
			hideDataZoom
			chartOptions={chartOptions}
			onReady={handleReady}
		/>
	)
}
