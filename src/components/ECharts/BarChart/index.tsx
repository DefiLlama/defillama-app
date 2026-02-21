import * as echarts from 'echarts/core'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartCleanup } from '~/hooks/useChartCleanup'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useChartResize } from '~/hooks/useChartResize'
import { slug, toNiceCsvDate } from '~/utils'
import { ChartContainer } from '../ChartContainer'
import { ChartHeader } from '../ChartHeader'
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
	onReady,
	enableImageExport,
	imageExportFilename,
	imageExportTitle,
	orientation = 'vertical'
}: IBarChartProps) {
	const id = useId()
	const shouldEnableExport = enableImageExport ?? (!!title && !hideDownloadButton)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()

	const [legendOptions, setLegendOptions] = useState(() => (customLegendOptions ? [...customLegendOptions] : []))

	const { defaultStacks, stackKeys, selectedStacks } = useMemo(() => {
		const values = { ...(stacks || {}) }
		const legendOptionsSet = legendOptions ? new Set(legendOptions) : null

		let hasValues = false
		for (const _ in values) {
			hasValues = true
			break
		}
		if (!hasValues && customLegendOptions) {
			for (const name of customLegendOptions) {
				values[name] = 'stackA'
			}
		}

		const keys: string[] = []
		const selected: string[] = []
		for (const s in values) {
			keys.push(s)
			if (!legendOptionsSet || !customLegendName || legendOptionsSet.has(s)) {
				selected.push(s)
			}
		}

		return { defaultStacks: values, stackKeys: keys, selectedStacks: selected }
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
	const hasNotifiedReadyRef = useRef(false)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const exportFilename = imageExportFilename || (title ? slug(title) : 'chart')
	const exportTitle = imageExportTitle || title

	useEffect(() => {
		const chartDom = document.getElementById(id)
		if (!chartDom) return

		let instance = echarts.getInstanceByDom(chartDom)
		if (!instance) {
			instance = echarts.init(chartDom)
		}
		chartRef.current = instance
		if (shouldEnableExport) {
			handleChartReady(instance)
		}

		if (onReady && instance && !hasNotifiedReadyRef.current) {
			onReady(instance)
			hasNotifiedReadyRef.current = true
		}

		const settings = { ...defaultChartSettings }
		for (const option in chartOptions) {
			if (option === 'overrides') {
				// update tooltip formatter
				settings['tooltip'] = { ...settings['inflowsTooltip'] }
			} else if (settings[option]) {
				settings[option] = mergeDeep(settings[option], chartOptions[option])
			} else {
				settings[option] = { ...chartOptions[option] }
			}
		}

		const { graphic, grid, tooltip, xAxis, yAxis, legend, dataZoom } = settings

		const shouldHideDataZoom =
			(Array.isArray(series) ? series.every((s) => s.data.length < 2) : series.data.length < 2) || hideDataZoom

		const isHorizontal = orientation === 'horizontal'

		instance.setOption({
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
	}, [
		defaultChartSettings,
		series,
		stackKeys,
		hideLegend,
		chartOptions,
		hideDataZoom,
		id,
		orientation,
		shouldEnableExport,
		handleChartReady,
		onReady
	])

	useChartCleanup(id, () => {
		chartRef.current = null
		if (hasNotifiedReadyRef.current) {
			onReady?.(null)
			hasNotifiedReadyRef.current = false
		}
		if (shouldEnableExport) {
			handleChartReady(null)
		}
	})

	const showLegend = Boolean(customLegendName && customLegendOptions?.length > 1)

	const prepareCsv = () => {
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
		const filename = `bar-chart-${Mytitle}-${new Date().toISOString().split('T')[0]}`
		return { filename, rows }
	}

	return (
		<ChartContainer
			id={id}
			chartClassName={containerClassName ?? 'mx-0 my-auto h-[360px]'}
			chartStyle={height ? { height } : undefined}
			header={
				title || showLegend || !hideDownloadButton ? (
					<ChartHeader
						title={title}
						customComponents={
							customLegendName && customLegendOptions?.length > 1 ? (
								<SelectWithCombobox
									allValues={customLegendOptions}
									selectedValues={legendOptions}
									setSelectedValues={setLegendOptions}
									label={customLegendName}
									labelType="smol"
									variant="filter"
									portal
								/>
							) : null
						}
						exportButtons={
							<>
								{!hideDownloadButton ? <CSVDownloadButton prepareCsv={prepareCsv} smol /> : null}
								{shouldEnableExport ? (
									<ChartPngExportButton
										chartInstance={exportChartInstance}
										filename={exportFilename}
										title={exportTitle}
									/>
								) : null}
							</>
						}
					/>
				) : null
			}
		/>
	)
}
