import React from 'react'
import AreaChart from '../ECharts/AreaChart'
import CustomBarChart from './CustomBarChart'

interface ChartConfig {
	id: string
	type: 'line' | 'bar' | 'pie' | 'scatter' | 'stacked-bar' | 'table' | 'mixed'
	title: string
	description?: string
	data: any[]
	config: {
		xAxis: string
		yAxis: string
		series: SeriesConfig[]
		valueSymbol?: string
		isStacked?: boolean
		yAxisScale?: 'linear' | 'logarithmic'
	}
}

interface SeriesConfig {
	name: string
	dataKey: string
	entityKey: string
	type: 'line' | 'bar'
	color: string
}

interface ChartRendererProps {
	chart: ChartConfig
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
	const { type, title, description, data, config } = chart

	const formatDataForAreaChart = () => {
		if (!config.series || config.series.length <= 1) {
			const dataKey = config.series?.[0]?.dataKey || 'value'
			return data.map((item) => [Math.floor(new Date(item.date).getTime() / 1000), item[dataKey] || 0])
		}

		const result: Array<{ date: number; [key: string]: number }> = []

		const dataByDate = new Map<string, Record<string, number>>()

		data.forEach((item) => {
			const dateStr = item.date
			if (!dataByDate.has(dateStr)) {
				dataByDate.set(dateStr, {})
			}

			const dateData = dataByDate.get(dateStr)!

			if (item.name && typeof item.value === 'number') {
				dateData[item.name] = item.value
			} else {
				config.series.forEach((series) => {
					const seriesValue = item[series.dataKey] || 0
					dateData[series.name] = seriesValue
				})
			}
		})

		Array.from(dataByDate.keys())
			.sort()
			.forEach((dateStr) => {
				const timestamp = Math.floor(new Date(dateStr).getTime() / 1000)
				const dataPoint: { date: number; [key: string]: number } = { date: timestamp }

				const dateData = dataByDate.get(dateStr)!
				Object.keys(dateData).forEach((key) => {
					dataPoint[key] = dateData[key]
				})

				result.push(dataPoint)
			})

		return result
	}

	const formatDataForBarChart = () => {
		const hasMultipleSeries = config.series && config.series.length > 1

		if (!hasMultipleSeries) {
			const dataKey = config.series?.[0]?.dataKey || config.yAxis || 'value'
			return data.map((item) => {
				const name = String(item.name || item.entity || 'Unknown')
				const value = Number(item[dataKey] || item.value || 0)
				return [name, value] as [string, number]
			})
		}

		return {
			categories: data.map((item) => String(item.name || item.entity || 'Unknown')),
			series: config.series.map((seriesConfig) => ({
				name: seriesConfig.name,
				type: seriesConfig.type,
				color: seriesConfig.color,
				data: data.map((item) => Number(item[seriesConfig.dataKey] || 0))
			}))
		}
	}

	const shouldUseMixedChart = () => {
		if (!config.series || config.series.length <= 1) return false
		const types = new Set(config.series.map((s) => s.type))
		return types.size > 1
	}

	const renderChart = () => {
		switch (type) {
			case 'line':
				const lineData = formatDataForAreaChart()

				const isSingleSeries = !config.series || config.series.length <= 1
				const stacks = isSingleSeries ? [] : config.series?.map((s) => s.name) || []
				const stackColors =
					config.series?.reduce((acc, s) => {
						acc[s.name] = s.color
						return acc
					}, {} as Record<string, string>) || {}

				return (
					<AreaChart
						title={title}
						chartData={lineData}
						stacks={stacks}
						stackColors={stackColors}
						valueSymbol={config.valueSymbol || '$'}
						height="400px"
						hideDownloadButton={false}
						hideDataZoom={false}
						isStackedChart={config.isStacked || false}
					/>
				)

			case 'bar':
			case 'stacked-bar':
			case 'mixed':
				const barData = formatDataForBarChart()
				const isMultiSeries = config.series && config.series.length > 1
				const effectiveType = shouldUseMixedChart() ? 'mixed' : type

				return (
					<CustomBarChart
						title={title}
						chartData={barData}
						valueSymbol={config.valueSymbol || '$'}
						height="400px"
						color={isMultiSeries ? undefined : '#2172E5'}
						isMultiSeries={isMultiSeries}
						chartType={effectiveType}
						isStacked={config.isStacked}
					/>
				)

			case 'pie':
				return (
					<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
						<p className="text-gray-500">Pie chart rendering coming soon</p>
					</div>
				)

			case 'scatter':
				return (
					<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
						<p className="text-gray-500">Scatter plot rendering coming soon</p>
					</div>
				)

			case 'table':
				return (
					<div className="overflow-auto">
						<table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
							<thead>
								<tr className="bg-gray-100 dark:bg-gray-800">
									{Object.keys(data[0] || {}).map((key) => (
										<th key={key} className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left">
											{key}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.map((row, index) => (
									<tr key={index} className="border-b">
										{Object.values(row).map((value, idx) => (
											<td key={idx} className="border border-gray-300 dark:border-gray-600 px-3 py-2">
												{typeof value === 'number' ? value.toLocaleString() : String(value)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)

			default:
				return (
					<div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
						<div className="text-center">
							<p className="text-gray-500 mb-2">Chart type "{type}" not yet supported</p>
							<details className="text-xs">
								<summary className="cursor-pointer">View raw data</summary>
								<pre className="mt-2 text-left bg-gray-50 dark:bg-gray-800 p-2 rounded">
									{JSON.stringify({ data, config }, null, 2)}
								</pre>
							</details>
						</div>
					</div>
				)
		}
	}

	return (
		<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
			<h3 className="text-lg font-semibold mb-2">{title}</h3>
			{description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}
			<div className="min-h-[400px]">{renderChart()}</div>
		</div>
	)
}

export default ChartRenderer
