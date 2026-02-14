import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { GraphicComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useMemo, useEffect, useId, useRef, useState, useCallback } from 'react'
import { ChartPngExportButton } from '~/components/ButtonStyled/ChartPngExportButton'
import { Icon } from '~/components/Icon'
import { generateConsistentChartColor } from '~/containers/ProDashboard/utils/colorManager'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'
import type { IProtocol } from './types'

// Type definitions for ECharts treemap tooltip and label formatters
interface TreemapTooltipInfo {
	treePathInfo?: Array<{ name: string }>
	value?: number
}

interface TreemapLabelParams {
	name?: string
	value?: number
}

echarts.use([TooltipComponent, GraphicComponent, EChartTreemap, CanvasRenderer])

type TreemapMode = 'tvl' | 'fees'

interface ProtocolsTreemapProps {
	protocols: Array<IProtocol>
	chainName?: string
	height?: string
}

export function ProtocolsTreemap({ protocols, chainName, height = '600px' }: ProtocolsTreemapProps) {
	const id = useId()
	const [isDark] = useDarkModeManager()
	const [mode, setMode] = useState<TreemapMode>('tvl')
	const [isFocused, setIsFocused] = useState(false)
	const [refreshKey, setRefreshKey] = useState(0)
	// chartRef is only used for useChartResize hook which requires a RefObject
	const chartRef = useRef<echarts.ECharts | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const { chartInstance, handleChartReady } = useChartImageExport()

	const handleReset = useCallback(() => {
		// Force chart refresh by updating refresh key
		setRefreshKey((prev) => prev + 1)
		setIsFocused(false) // Also unfocus when resetting
	}, [])

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const treeData = useMemo(() => {
		// Group protocols by category
		const categoryMap = new Map<string, Array<{ name: string; value: number; itemStyle?: { color: string } }>>()

		for (const protocol of protocols) {
			// Get value based on mode
			const value = mode === 'tvl' ? (protocol.tvl?.default?.tvl ?? 0) : (protocol.fees?.total24h ?? 0)

			if (value <= 0) continue

			const category = protocol.category || 'Uncategorized'
			if (!categoryMap.has(category)) {
				categoryMap.set(category, [])
			}

			// Generate consistent color for each protocol
			const color = generateConsistentChartColor(protocol.name, '#1f67d2', 'protocol')

			categoryMap.get(category)!.push({
				name: protocol.name,
				value: value,
				itemStyle: {
					color
				}
			})
		}

		// Build hierarchical tree structure
		const tree: Array<{
			name: string
			value: number
			children: Array<{ name: string; value: number; itemStyle?: { color: string } }>
		}> = []

		for (const [category, protocolList] of categoryMap.entries()) {
			const categoryTotal = protocolList.reduce((sum, p) => sum + p.value, 0)
			if (categoryTotal > 0) {
				tree.push({
					name: category,
					value: categoryTotal,
					children: protocolList.sort((a, b) => b.value - a.value)
				})
			}
		}

		// Sort categories by total value
		return tree.sort((a, b) => b.value - a.value)
	}, [protocols, mode])

	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return

		let instance: echarts.ECharts | null = null

		try {
			// Dispose existing instance if it exists (for refresh)
			const existingInstance = echarts.getInstanceByDom(el)
			if (existingInstance) {
				existingInstance.dispose()
			}

			instance = echarts.init(el)
			if (!instance) {
				console.error('Failed to initialize ECharts instance')
				return
			}

			// Keep chartRef and hook instance in sync
			chartRef.current = instance
			handleChartReady(instance)

			if (treeData.length === 0) {
				return () => {
					chartRef.current = null
					handleChartReady(null)
					if (instance) {
						try {
							instance.dispose()
						} catch (disposeError) {
							console.error('Error disposing chart instance:', disposeError)
						}
					}
				}
			}

			const totalValue = treeData.reduce((sum, cat) => sum + cat.value, 0)
			const metricLabel = mode === 'tvl' ? 'TVL' : 'Fees (24h)'

			const graphic = {
				type: 'image',
				z: 100,
				style: {
					image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
					height: 40,
					opacity: 0.3
				},
				left: 'center',
				top: 'center'
			}

			const option = {
				backgroundColor: 'transparent',
				graphic,
				legend: {
					show: false // Explicitly hide legend to prevent it from showing in PNG export
				},
				toolbox: {
					show: false, // Hide toolbox UI but enable restore feature for programmatic use
					feature: {
						restore: {} // Enable restore feature (even though UI is hidden)
					}
				},
				tooltip: {
					formatter: function (info: TreemapTooltipInfo) {
						const treePathInfo = info.treePathInfo || []
						const treePath: string[] = []
						for (let i = 1; i < treePathInfo.length; i++) {
							if (treePathInfo[i]?.name) {
								treePath.push(treePathInfo[i].name)
							}
						}

						const value = typeof info.value === 'number' && Number.isFinite(info.value) ? info.value : 0
						const pct = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : '0'

						if (treePath.length > 1) {
							// Protocol level
							return [
								`<div style="font-weight:600;margin-bottom:4px">${treePath[1]}</div>`,
								`<div>Category: ${treePath[0]}</div>`,
								`<div>${metricLabel}: ${formattedNum(value, true)}</div>`,
								`<div>Share: ${pct}%</div>`
							].join('')
						} else if (treePath.length === 1) {
							// Category level
							return [
								`<div style="font-weight:600;margin-bottom:4px">${treePath[0]}</div>`,
								`<div>${metricLabel}: ${formattedNum(value, true)}</div>`,
								`<div>Share: ${pct}%</div>`
							].join('')
						}
						return ''
					}
				},
				series: [
					{
						name: 'Protocols by Category',
						type: 'treemap',
						roam: true,
						nodeClick: 'zoomToNode',
						breadcrumb: {
							show: false
						},
						label: {
							show: true,
							position: 'insideTopLeft',
							padding: [4, 6],
							formatter: function (params: TreemapLabelParams) {
								const value = typeof params.value === 'number' && Number.isFinite(params.value) ? params.value : 0
								const pct = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0'
								const name = params.name || ''
								return `{name|${name}}\n{value|${formattedNum(value, true)} (${pct}%)}`
							},
							rich: {
								name: {
									fontSize: 14,
									fontWeight: 600,
									color: '#fff',
									lineHeight: 20
								},
								value: {
									fontSize: 12,
									color: 'rgba(255,255,255,0.8)',
									lineHeight: 18
								}
							}
						},
						upperLabel: {
							show: false
						},
						itemStyle: {
							borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
							borderWidth: 1,
							gapWidth: 1
						},
						emphasis: {
							itemStyle: {
								borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
								borderWidth: 2
							}
						},
						levels: [
							{
								// Category level - hide category labels
								itemStyle: {
									borderColor: 'transparent',
									borderWidth: 0,
									gapWidth: 1
								},
								upperLabel: {
									show: false
								}
							},
							{
								// Protocol level
								itemStyle: {
									borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
									borderWidth: 1,
									gapWidth: 1
								},
								upperLabel: {
									show: false
								}
							}
						],
						data: treeData
					}
				]
			}

			instance.setOption(option)

			return () => {
				chartRef.current = null
				handleChartReady(null)
				if (instance) {
					try {
						instance.dispose()
					} catch (disposeError) {
						console.error('Error disposing chart instance:', disposeError)
					}
				}
			}
		} catch (error) {
			console.error('Error in chart setup:', error)
			if (instance) {
				try {
					instance.dispose()
				} catch (disposeError) {
					console.error('Error disposing chart instance after error:', disposeError)
				}
			}
			chartRef.current = null
			handleChartReady(null)
			return
		}
	}, [id, treeData, isDark, mode, refreshKey, handleChartReady])

	// Consolidated event listeners for chart interactions
	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return

		const handleWheel = (e: WheelEvent) => {
			// If chart is not focused, prevent ECharts from handling zoom
			// This allows normal page scrolling
			if (!isFocused) {
				e.stopPropagation()
			}
			// When focused, let ECharts handle zoom normally
		}

		const handleChartClick = () => {
			setIsFocused(true)
		}

		const handleDocumentClick = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsFocused(false)
			}
		}

		el.addEventListener('wheel', handleWheel, { passive: false, capture: true })
		el.addEventListener('click', handleChartClick)
		document.addEventListener('click', handleDocumentClick)

		return () => {
			el.removeEventListener('wheel', handleWheel, { capture: true })
			el.removeEventListener('click', handleChartClick)
			document.removeEventListener('click', handleDocumentClick)
		}
	}, [id, isFocused])

	if (treeData.length === 0) {
		return (
			<div className="flex h-full items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p className="text-sm text-(--text-form)">No protocol data available</p>
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className={`rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 ${isFocused ? 'ring-2 ring-(--link-text)' : ''}`}
		>
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-base font-semibold">Protocols by Category</h2>
				<div className="flex items-center gap-2">
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						<button
							className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={mode === 'tvl'}
							onClick={() => setMode('tvl')}
						>
							TVL
						</button>
						<button
							className="shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)"
							data-active={mode === 'fees'}
							onClick={() => setMode('fees')}
						>
							Fees
						</button>
					</div>
					<button
						onClick={handleReset}
						className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-2 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
						title="Reset zoom"
						aria-label="Reset zoom"
					>
						<Icon name="repeat" height={12} width={12} />
					</button>
					<ChartPngExportButton
						chartInstance={chartInstance}
						filename={`protocols-treemap-${mode}`}
						title={chainName ? `Protocol ${mode === 'tvl' ? 'TVL' : 'Fees'} - ${chainName}` : `Protocols by Category`}
					/>
				</div>
			</div>
			<div className="relative">
				{isFocused && (
					<div className="absolute top-2 left-2 z-10 rounded border border-(--form-control-border) bg-(--cards-bg) px-2 py-1 text-xs text-(--text-form)">
						Click outside to unfocus • Scroll to zoom
					</div>
				)}
				<div
					id={id}
					className="cursor-pointer bg-transparent"
					style={{
						width: '100%',
						height,
						touchAction: 'pan-y pinch-zoom'
					}}
				/>
			</div>
		</div>
	)
}
