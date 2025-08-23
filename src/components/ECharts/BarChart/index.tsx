import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { download, slug, toNiceCsvDate } from '~/utils'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { stringToColour } from '../utils'

export default function BarChart({
	chartData,
	stacks,
	valueSymbol = '',
	title,
	color,
	hideDefaultLegend = false,
	customLegendName,
	customLegendOptions,
	chartOptions,
	height,
	stackColors,
	tooltipOrderBottomUp,
	groupBy,
	hideDataZoom = false,
	hideDownloadButton = false,
	containerClassName,
	customComponents
}: IBarChartProps) {
	const id = useId()

	const [legendOptions, setLegendOptions] = useState(customLegendOptions ? [...customLegendOptions] : [])

	const { defaultStacks, stackKeys, selectedStacks } = useMemo(() => {
		const values = stacks || {}

		if ((!values || Object.keys(values).length === 0) && customLegendOptions) {
			customLegendOptions.forEach((name) => {
				values[name] = 'stackA'
			})
		}

		const selectedStacks = Object.keys(values).filter((s) =>
			legendOptions && customLegendName ? legendOptions.includes(s) : true
		)

		return { defaultStacks: values, stackKeys: Object.keys(values), selectedStacks }
	}, [stacks, customLegendOptions, customLegendName, legendOptions])

	const hideLegend = hideDefaultLegend || stackKeys.length < 2

	const [isThemeDark] = useDarkModeManager()

	const defaultChartSettings = useDefaults({
		color,
		valueSymbol,
		hideLegend,
		tooltipOrderBottomUp,
		isThemeDark,
		groupBy:
			typeof groupBy === 'string' && ['daily', 'weekly', 'monthly'].includes(groupBy)
				? (groupBy as 'daily' | 'weekly' | 'monthly')
				: 'daily'
	})

	const series = useMemo(() => {
		const chartColor = color || stringToColour()

		if (!stackKeys || stackKeys.length === 0) {
			const series = {
				name: '',
				type: 'bar',
				stack: 'stackA',
				emphasis: {
					focus: 'series',
					shadowBlur: 10
				},
				itemStyle: {
					color: chartColor
				},
				data: []
			}

			for (const [date, value] of chartData ?? []) {
				series.data.push([+date * 1e3, value])
			}

			return series
		} else {
			const series = {}

			for (const stack of selectedStacks) {
				series[stack] = {
					name: stack,
					type: 'bar',
					large: true,
					stack: defaultStacks[stack],
					emphasis: {
						focus: 'series',
						shadowBlur: 10
					},
					itemStyle: stackColors
						? {
								color: stackColors[stack]
							}
						: chartData.length <= 1
							? {
									color: chartColor
								}
							: undefined,
					data: []
				}
			}

			for (const { date, ...item } of chartData) {
				for (const stack of selectedStacks) {
					series[stack]?.data?.push([+date * 1e3, item[stack] || 0])
				}
			}

			return Object.values(series).map((s: any) => (s.data.length === 0 ? { ...s, large: false } : s))
		}
	}, [chartData, color, defaultStacks, stackColors, stackKeys, selectedStacks])

	const chartRef = useRef<echarts.ECharts | null>(null)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance

		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = { ...defaultChartSettings[option], ...chartOptions[option] }
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, grid, tooltip, xAxis, yAxis, legend, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				...tooltip
			},
			grid: {
				left: 12,
				bottom: 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel'
			},
			xAxis: {
				...xAxis
			},
			yAxis: {
				...yAxis
			},
			...(!hideLegend && {
				legend: {
					...legend,
					data: stackKeys
				}
			}),
			dataZoom: hideDataZoom ? [] : [...dataZoom],
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
	}, [defaultChartSettings, series, stackKeys, hideLegend, chartOptions, hideDataZoom, id])

	useEffect(() => {
		return () => {
			const chartDom = document.getElementById(id)
			if (chartDom) {
				const chartInstance = echarts.getInstanceByDom(chartDom)
				if (chartInstance) {
					chartInstance.dispose()
				}
			}
			if (chartRef.current) {
				chartRef.current = null
			}
		}
	}, [id])

	const showLegend = customLegendName && customLegendOptions?.length > 1 ? true : false

	return (
		<div className="relative">
			{title || showLegend || !hideDownloadButton ? (
				<div className="mb-2 flex items-center justify-end gap-2 px-2">
					{title && <h1 className="mr-auto text-lg font-bold">{title}</h1>}
					{customComponents ?? null}
					{customLegendName && customLegendOptions?.length > 1 && (
						<SelectWithCombobox
							allValues={customLegendOptions}
							selectedValues={legendOptions}
							setSelectedValues={setLegendOptions}
							selectOnlyOne={(newOption) => {
								setLegendOptions([newOption])
							}}
							label={customLegendName}
							clearAll={() => setLegendOptions([])}
							toggleAll={() => setLegendOptions(customLegendOptions)}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
							}}
							portal
						/>
					)}
					{hideDownloadButton ? null : (
						<CSVDownloadButton
							onClick={() => {
								try {
									let rows = []
									if (!stackKeys || stackKeys.length === 0) {
										rows = [['Timestamp', 'Date', 'Value']]
										for (const [date, value] of chartData ?? []) {
											rows.push([date, toNiceCsvDate(date), value])
										}
									} else {
										rows = [['Timestamp', 'Date', ...selectedStacks]]
										for (const item of chartData ?? []) {
											const { date, ...rest } = item
											rows.push([date, toNiceCsvDate(date), ...selectedStacks.map((stack) => rest[stack] ?? '')])
										}
									}
									const Mytitle = title ? slug(title) : 'data'
									const filename = `bar-chart-${Mytitle}-${new Date().toISOString().split('T')[0]}.csv`
									download(filename, rows.map((r) => r.join(',')).join('\n'))
								} catch (error) {
									console.error('Error generating CSV:', error)
								}
							}}
							smol
							replaceClassName
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						/>
					)}
				</div>
			) : null}
			<div
				id={id}
				className={containerClassName ? containerClassName : 'my-auto min-h-[360px]'}
				style={height ? { height } : undefined}
			></div>
		</div>
	)
}
