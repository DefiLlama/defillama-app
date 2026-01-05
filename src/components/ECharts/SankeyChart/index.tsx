import { useCallback, useEffect, useId, useMemo } from 'react'
import { SankeyChart as ESankeyChart } from 'echarts/charts'
import { GraphicComponent, GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useMedia } from '~/hooks/useMedia'
import type { ISankeyChartProps } from '../types'
import { formatTooltipValue } from '../useDefaults'

echarts.use([CanvasRenderer, ESankeyChart, TooltipComponent, TitleComponent, GridComponent, GraphicComponent])

export default function SankeyChart({
	height = '500px',
	nodes,
	links,
	title,
	valueSymbol = '$',
	nodeColors,
	nodeAlign = 'justify',
	orient = 'horizontal',
	customComponents,
	enableImageExport = false,
	imageExportFilename,
	imageExportTitle,
	...props
}: ISankeyChartProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const isSmall = useMedia(`(max-width: 37.5rem)`)
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const exportFilename = imageExportFilename || (title ? title.replace(/\s+/g, '-').toLowerCase() : 'sankey-chart')
	const exportTitle = imageExportTitle || title

	// Create maps for node metadata (descriptions and display values)
	const nodeMetadata = useMemo(() => {
		const descriptions: Record<string, string> = {}
		const displayValues: Record<string, number | string> = {}
		nodes.forEach((node) => {
			if (node.description) {
				descriptions[node.name] = node.description
			}
			if (node.displayValue !== undefined) {
				displayValues[node.name] = node.displayValue
			}
		})
		return { descriptions, displayValues }
	}, [nodes])

	const series = useMemo(() => {
		const nodeData = nodes.map((node) => ({
			name: node.name,
			itemStyle: {
				color: nodeColors?.[node.name] ?? node.color ?? undefined
			},
			...(node.depth !== undefined ? { depth: node.depth } : {})
		}))

		return {
			type: 'sankey',
			layout: 'none',
			nodeAlign,
			orient,
			emphasis: {
				focus: 'adjacency'
			},
			nodeGap: 24,
			nodeWidth: 16,
			lineStyle: {
				color: 'gradient',
				curveness: 0.5,
				opacity: 0.4
			},
			label: {
				show: true,
				position: orient === 'horizontal' ? 'right' : 'bottom',
				fontFamily: 'sans-serif',
				fontSize: 14,
				color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
				formatter: (params: any) => {
					// Use displayValue if provided, otherwise use calculated value
					const displayValue = nodeMetadata.displayValues[params.name]
					const formattedValue =
						displayValue !== undefined
							? typeof displayValue === 'string'
								? displayValue
								: formatTooltipValue(displayValue, valueSymbol)
							: formatTooltipValue(params.value, valueSymbol)

					const description = nodeMetadata.descriptions[params.name]
					if (description && !isSmall) {
						// Truncate description to ~50 chars for display under label
						const truncatedDesc = description.length > 50 ? description.slice(0, 47) + '...' : description
						return `{name|${params.name}: ${formattedValue}}\n{desc|${truncatedDesc}}`
					}
					return `${params.name}: ${formattedValue}`
				},
				rich: {
					name: {
						fontSize: 14,
						fontWeight: 'normal',
						color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
					},
					desc: {
						fontSize: 10,
						color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'
					}
				}
			},
			data: nodeData,
			links: links.map((link) => ({
				source: link.source,
				target: link.target,
				value: link.value,
				lineStyle: link.color ? { color: link.color } : undefined
			}))
		}
	}, [nodes, links, nodeColors, nodeAlign, orient, isDark, isSmall, valueSymbol, nodeMetadata])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const graphic = {
			type: 'image',
			z: 0,
			style: {
				image: isDark ? '/icons/defillama-light-neutral.webp' : '/icons/defillama-dark-neutral.webp',
				height: 40,
				opacity: 0.3
			},
			left: isSmall ? '35%' : '40%',
			top: '50%'
		}

		chartInstance.setOption({
			graphic,
			tooltip: {
				trigger: 'item',
				triggerOn: 'mousemove',
				confine: true,
				backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)',
				borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
				textStyle: {
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				},
				formatter: (params: any) => {
					if (params.dataType === 'edge') {
						return `${params.data.source} → ${params.data.target}<br/>${formatTooltipValue(params.data.value, valueSymbol)}`
					}
					// Use displayValue if provided for tooltip value
					const displayValue = nodeMetadata.displayValues[params.name]
					const valueToShow =
						displayValue !== undefined
							? typeof displayValue === 'string'
								? displayValue
								: formatTooltipValue(displayValue, valueSymbol)
							: formatTooltipValue(params.value, valueSymbol)
					const description = nodeMetadata.descriptions[params.name]
					if (description) {
						return `<strong>${params.name}</strong><br/>${valueToShow}<br/><span style="color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}; font-size: 11px;">${description}</span>`
					}
					return `${params.name}<br/>${valueToShow}`
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
	}, [createInstance, series, isDark, title, valueSymbol, isSmall, handleChartReady, nodeMetadata])

	return (
		<div className="relative" {...props}>
			{title || customComponents || enableImageExport ? (
				<div className="mb-2 flex items-center justify-end gap-2">
					{title ? <h1 className="mr-auto text-base font-semibold">{title}</h1> : null}
					{customComponents ?? null}
					{enableImageExport && (
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
			<div id={id} style={{ height }} />
		</div>
	)
}
