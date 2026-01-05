import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { slug, toNiceCsvDate } from '~/utils'
import type { IBarChartProps } from '../types'
import { useDefaults } from '../useDefaults'
import { mergeDeep, stringToColour } from '../utils'

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
	customComponents,
	onReady,
	enableImageExport,
	imageExportFilename,
	imageExportTitle,
	orientation = 'vertical'
}: IBarChartProps) {
	const id = useId()
	const shouldEnableExport = enableImageExport ?? (!!title && !hideDownloadButton)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()

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
	const exportFilename = imageExportFilename || (title ? slug(title) : 'chart')
	const exportTitle = imageExportTitle || title
	const updateExportInstance = useCallback(
		(instance: echarts.ECharts | null) => {
			if (shouldEnableExport) {
				handleChartReady(instance)
			}
		},
		[shouldEnableExport, handleChartReady]
	)

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let chartInstance = echarts.getInstanceByDom(chartDom)
		const isNewInstance = !chartInstance
		if (!chartInstance) {
			chartInstance = echarts.init(chartDom)
		}
		chartRef.current = chartInstance
		updateExportInstance(chartInstance)

		if (onReady && isNewInstance) {
			onReady(chartInstance)
		}

		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				defaultChartSettings['tooltip'] = { ...defaultChartSettings['inflowsTooltip'] }
			} else if (defaultChartSettings[option]) {
				defaultChartSettings[option] = mergeDeep(defaultChartSettings[option], chartOptions[option])
			} else {
				defaultChartSettings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, grid, tooltip, xAxis, yAxis, legend, dataZoom } = defaultChartSettings

		const shouldHideDataZoom =
			(Array.isArray(series) ? series.every((s) => s.data.length < 2) : series.data.length < 2) || hideDataZoom

		const isHorizontal = orientation === 'horizontal'

		chartInstance.setOption({
			graphic: {
				...graphic
			},
			tooltip: {
				...tooltip
			},
			grid: {
				left: isHorizontal ? 120 : 12,
				bottom: shouldHideDataZoom ? 12 : 68,
				top: 12,
				right: 12,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel',
				...grid
			},
			xAxis: isHorizontal ? { ...yAxis, type: 'value' } : { ...xAxis },
			yAxis: isHorizontal ? { ...xAxis, type: 'category' } : { ...yAxis },
			...(!hideLegend && {
				legend: {
					...legend,
					data: stackKeys
				}
			}),
			dataZoom: shouldHideDataZoom ? [] : [...dataZoom],
			series
		})

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
			updateExportInstance(null)
		}
	}, [defaultChartSettings, series, stackKeys, hideLegend, chartOptions, hideDataZoom, id, updateExportInstance, orientation])

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
			if (onReady) {
				onReady(null)
			}
			updateExportInstance(null)
		}
	}, [id, onReady, updateExportInstance])

	const showLegend = customLegendName && customLegendOptions?.length > 1 ? true : false

	const prepareCsv = useCallback(() => {
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
		return { filename, rows }
	}, [chartData, stackKeys, selectedStacks, title])

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
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
							}}
							portal
						/>
					)}
					{!hideDownloadButton && <CSVDownloadButton prepareCsv={prepareCsv} smol />}
					{shouldEnableExport && (
						<ChartExportButton
							chartInstance={exportChartInstance}
							filename={exportFilename}
							title={exportTitle}
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					)}
				</div>
			) : null}
			<div
				id={id}
				className={containerClassName ? containerClassName : 'mx-0 my-auto h-[360px]'}
				style={height ? { height } : undefined}
			></div>
		</div>
	)
}
