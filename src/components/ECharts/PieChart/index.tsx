import { useCallback, useEffect, useId, useMemo } from 'react'
import { PieChart as EPieChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ImageExportButton } from '~/components/ButtonStyled/ImageDownloadButton'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useMedia } from '~/hooks/useMedia'
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
	imageExportFilename,
	imageExportTitle,
	...props
}: IPieChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const exportFilename = imageExportFilename || (title ? title.replace(/\s+/g, '-').toLowerCase() : 'pie-chart')
	const exportTitle = imageExportTitle || title

	const series = useMemo(() => {
		const series: Record<string, any> = {
			name: '',
			type: 'pie',
			label: {
				fontFamily: 'sans-serif',
				color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)',
				formatter: (x) => {
					return `${x.name}: (${x.percent}%)`
				},
				show: showLegend ? false : true
			},
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)'
				}
			},
			data: chartData.map((item, idx) => ({
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

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))

		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		// create instance
		const chartInstance = createInstance()

		const graphic = {
			type: 'image',
			z: 999,
			style: {
				image: isDark ? '/icons/defillama-light-neutral.webp' : '/icons/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '35%' : '40%',
			top: '160px'
		}

		chartInstance.setOption({
			graphic,
			tooltip: {
				trigger: 'item',
				confine: true,
				valueFormatter: (value) => formatTooltipValue(value, valueSymbol)
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
				...legendPosition, // Apply overrides from prop
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
				}
			},
			series
		})

		function resize() {
			chartInstance.resize()
		}

		handleChartReady(chartInstance)

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
			handleChartReady(null)
		}
	}, [
		createInstance,
		series,
		isDark,
		title,
		valueSymbol,
		showLegend,
		chartData,
		legendPosition,
		legendTextStyle,
		isSmall
	])

	return (
		<div className="relative" {...props}>
			{title || customComponents || enableImageExport ? (
				<div className="mb-2 flex items-center justify-end gap-2 px-2">
					{title ? <h1 className="mr-auto px-2 text-lg font-bold">{title}</h1> : null}
					{customComponents ?? null}
					{enableImageExport && (
						<ImageExportButton
							chartInstance={exportChartInstance}
							filename={exportFilename}
							title={exportTitle}
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					)}
				</div>
			) : null}
			<div id={id} className="mx-0 my-auto h-[360px]" style={height ? { height } : undefined}></div>
		</div>
	)
}
