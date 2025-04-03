import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { getUtcDateObject, stringToColour } from '../utils'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

export default function BarChart({
	chartData,
	stacks,
	seriesConfig,
	valueSymbol = '',
	title,
	color,
	hideDefaultLegend = false,
	customLegendName,
	customLegendOptions,
	chartOptions,
	height = '360px',
	barWidths,
	stackColors,
	tooltipOrderBottomUp,
	isMonthly
}: IBarChartProps) {
	const id = useMemo(() => crypto.randomUUID(), [])

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
		title,
		valueSymbol,
		hideLegend,
		tooltipOrderBottomUp,
		isThemeDark,
		isMonthly
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
				series.data.push([getUtcDateObject(date), value])
			}

			return series
		} else {
			const series = {}

			for (const stack of selectedStacks) {
				series[stack] = {
					name: stack,
					type: 'bar',
					large: true,
					largeThreshold: 0,
					stack: defaultStacks[stack],
					...(barWidths?.[defaultStacks[stack]] && { barMaxWidth: barWidths[defaultStacks[stack]] }),
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
					...(seriesConfig?.[defaultStacks[stack]] && seriesConfig?.[defaultStacks[stack]]),
					data: []
				}
			}

			for (const { date, ...item } of chartData) {
				for (const stack of selectedStacks) {
					series[stack]?.data?.push([getUtcDateObject(date), item[stack] || 0])
				}
			}

			return Object.values(series).map((s: any) => (s.data.length === 0 ? { ...s, large: false } : s))
		}
	}, [barWidths, chartData, color, defaultStacks, seriesConfig, stackColors, stackKeys, selectedStacks])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		// override default chart settings
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

		const { graphic, titleDefaults, grid, tooltip, xAxis, yAxis, legend, dataZoom } = defaultChartSettings

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				...tooltip
			},
			title: {
				...titleDefaults
			},
			grid: {
				...grid
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
	}, [createInstance, defaultChartSettings, series, stackKeys, hideLegend, chartOptions])

	return (
		<div className="relative [&[role='combobox']]:*:ml-auto [&[role='combobox']]:*:mr-4">
			{customLegendName && customLegendOptions?.length > 1 && (
				<SelectWithCombobox
					allValues={customLegendOptions}
					selectedValues={legendOptions}
					setSelectedValues={setLegendOptions}
					label={customLegendName}
					clearAll={() => setLegendOptions([])}
					toggleAll={() => setLegendOptions(customLegendOptions)}
					labelType="smol"
				/>
			)}
			<div id={id} style={{ height, margin: 'auto 0' }}></div>
		</div>
	)
}
