import { PieChart as EPieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { useMedia } from '~/hooks/useMedia'
import { formattedNum } from '~/utils'
import type { IPieChartProps } from '../types'
import { formatTooltipValue } from '../useDefaults'

echarts.use([
	CanvasRenderer,
	EPieChart,
	TooltipComponent,
	TitleComponent,
	GridComponent,
	GraphicComponent,
	LegendComponent
])

export default function PieChart({
	height,
	stackColors,
	chartData,
	title,
	valueSymbol = '$',
	radius = null,
	showLegend = false,
	legendPosition,
	legendTextStyle,
	customComponents,
	enableImageExport = false,
	shouldEnableImageExport = false,
	imageExportFilename,
	imageExportTitle,
	shouldEnableCSVDownload = false,
	onReady,
	...props
}: IPieChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const { chartInstance, handleChartReady } = useGetChartInstance()
	const imageExportEnabled = enableImageExport || shouldEnableImageExport
	const exportFilename = imageExportFilename || (title ? title.replace(/\s+/g, '-').toLowerCase() : 'pie-chart')
	const exportTitle = imageExportTitle || title
	const chartRef = useRef<echarts.ECharts | null>(null)

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const series = useMemo(() => {
		const total = chartData.reduce((acc, item) => acc + item.value, 0)

		const formatPercent = (value: number) => {
			if (total === 0) return '0%'
			const pct = (value / total) * 100
			if (pct === 0) return '0%'
			if (pct < 0.0001) return '< 0.0001%'
			if (pct < 0.01) return formattedNum(pct) + '%'
			return pct.toFixed(2) + '%'
		}

		const series: Record<string, any> = {
			name: '',
			type: 'pie',
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: (x) => {
					return `${x.name}: (${formatPercent(x.value)})`
				},
				show: !showLegend
			},
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			},
			data: chartData.map((item) => ({
				name: item.name,
				value: item.value,
				itemStyle: {
					color: stackColors?.[item.name] ?? undefined
				}
			}))
		}

		if (radius) {
			series.radius = radius
		} else {
			if (!isSmall) {
				series.radius = '70%'
			}
		}

		return series
	}, [isDark, showLegend, chartData, radius, stackColors, isSmall])

	useEffect(() => {
		// create instance
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance

		if (onReady) {
			onReady(instance)
		}

		const graphic = {
			type: 'image',
			z: 999,
			style: {
				image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '35%' : '45%',
			top: '160px'
		}

		instance.setOption({
			graphic,
			tooltip: {
				trigger: 'item',
				confine: true,
				formatter: (params: any) => {
					const p = Array.isArray(params) ? params[0] : params
					const rawValue = typeof p?.value === 'number' ? p.value : Number(p?.value ?? 0)
					const formattedValue = formatTooltipValue(rawValue, valueSymbol)
					return `${p?.marker ?? ''}${p?.name ?? ''}: <b>${formattedValue}</b> (${params.percent}%)`
				}
			},
			grid: {
				left: 0,
				outerBoundsMode: 'same',
				outerBoundsContain: 'axisLabel',
				bottom: 0,
				top: 0,
				right: 0
			},
			legend: {
				show: showLegend,
				left: 'right', // Default
				orient: 'vertical', // Default
				data: chartData.map((item) => item.name),
				icon: 'circle',
				itemWidth: 10,
				itemHeight: 10,
				itemGap: 10,
				textStyle: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)', // Default color
					...legendTextStyle // Apply overrides from prop
				},
				formatter: function (name) {
					const maxLength = 18 // Keep existing formatter
					return name.length > maxLength ? name.slice(0, maxLength) + '...' : name
				},
				...legendPosition // Apply overrides from prop
			},
			series
		})

		handleChartReady(instance)

		return () => {
			chartRef.current = null
			instance.dispose()
			handleChartReady(null)
			if (onReady) {
				onReady(null)
			}
		}
	}, [
		id,
		series,
		isDark,
		title,
		valueSymbol,
		showLegend,
		chartData,
		legendPosition,
		legendTextStyle,
		isSmall,
		handleChartReady,
		onReady
	])

	const showToolbar = title || customComponents || imageExportEnabled || shouldEnableCSVDownload

	return (
		<div className="relative" {...props}>
			{showToolbar ? (
				<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
					{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
					{customComponents ?? null}
					<ChartExportButtons
						chartInstance={chartInstance}
						filename={exportFilename}
						title={exportTitle}
						showCsv={shouldEnableCSVDownload}
						showPng={imageExportEnabled}
					/>
				</div>
			) : null}
			<div id={id} className="mx-0 my-auto h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
