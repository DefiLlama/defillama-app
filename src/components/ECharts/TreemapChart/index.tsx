import { TreemapChart as EChartTreemap } from 'echarts/charts'
import {
	DataZoomComponent,
	GraphicComponent,
	TitleComponent,
	ToolboxComponent,
	TooltipComponent
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { useChartResize } from '~/hooks/useChartResize'
import { formattedNum } from '~/utils'

echarts.use([
	TitleComponent,
	TooltipComponent,
	ToolboxComponent,
	DataZoomComponent,
	EChartTreemap,
	CanvasRenderer,
	GraphicComponent
])

type TreemapVariant = 'yields' | 'narrative' | 'rwa'

interface IChartProps {
	treeData: any[]
	variant?: TreemapVariant
	height?: string
	onReady?: (instance: echarts.ECharts | null) => void
	valueLabel?: string
}

const visualMin = -100
const visualMax = 100
const visualMinBound = -40
const visualMaxBound = 40

function normalizeTreemapValue(rawValue: unknown): Array<number | null> {
	if (Array.isArray(rawValue)) {
		const value = [...rawValue] as Array<number | null>
		while (value.length < 3) value.push(null)

		const n0 = typeof value[0] === 'number' ? value[0] : Number(value[0])
		value[0] = Number.isFinite(n0) ? n0 : 0

		for (let idx = 1; idx <= 2; idx++) {
			const current = value[idx]
			if (current == null) {
				value[idx] = null
				continue
			}
			const n = typeof current === 'number' ? current : Number(current)
			value[idx] = Number.isFinite(n) ? n : null
		}

		return value
	}

	if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
		return [rawValue, null, null]
	}

	return [0, null, null]
}

function normalizeTreemapNodes(nodes: any[]): any[] {
	return (nodes ?? []).map((node) => ({
		...node,
		value: normalizeTreemapValue(node?.value),
		children: node?.children ? normalizeTreemapNodes(node.children) : node?.children
	}))
}

function addColorGradientField(chartDataTree) {
	let min = Infinity
	let max = -Infinity
	for (let i = 0; i < chartDataTree.length; i++) {
		let node = chartDataTree[i]
		if (node) {
			let value = node.value
			if (value[2] != null && value[2] < min) {
				min = value[2]
			}
			if (value[2] != null && value[2] > max) {
				max = value[2]
			}
		}
	}
	for (let i = 0; i < chartDataTree.length; i++) {
		let node = chartDataTree[i]
		if (node) {
			let value = node.value
			// Scale value for visual effect
			if (value[2] != null && value[2] > 0) {
				value[3] = echarts.number.linearMap(value[2], [0, max], [visualMaxBound, visualMax], true)
			} else if (value[2] != null && value[2] < 0) {
				value[3] = echarts.number.linearMap(value[2], [min, 0], [visualMin, visualMinBound], true)
			} else {
				value[3] = 0
			}

			if (!isFinite(value[3])) {
				value[3] = 0
			}
			if (node.children) {
				addColorGradientField(node.children)
			}
		}
	}
}

export default function TreemapChart({
	treeData,
	variant = 'yields',
	height,
	onReady,
	valueLabel = 'Market Cap'
}: IChartProps) {
	const id = useId()
	const isNarrativeVariant = variant === 'narrative'
	const isRwaVariant = variant === 'rwa'
	const isNarrativeLike = isNarrativeVariant || isRwaVariant

	const [isDark] = useDarkModeManager()
	const chartRef = useRef<echarts.ECharts | null>(null)
	const onReadyRef = useRef(onReady)
	useEffect(() => {
		onReadyRef.current = onReady
	})

	// Stable resize listener - never re-attaches when dependencies change
	useChartResize(chartRef)

	const chartDataTree = useMemo(() => {
		const cloned = normalizeTreemapNodes(treeData ?? [])
		// RWA treemap uses explicit item colors from caller, no red/green gradient mapping.
		if (!isRwaVariant) addColorGradientField(cloned)
		return cloned
	}, [isRwaVariant, treeData])

	const rwaRootLabel = useMemo(() => {
		if (!isRwaVariant) return 'All'
		for (const node of chartDataTree ?? []) {
			const path = typeof node?.path === 'string' ? node.path : ''
			const root = path.split('/')[0]?.trim()
			if (root) return root
		}
		return 'RWA'
	}, [chartDataTree, isRwaVariant])

	useEffect(() => {
		const el = document.getElementById(id)
		if (!el) return
		const instance = echarts.getInstanceByDom(el) || echarts.init(el)
		chartRef.current = instance
		onReadyRef.current?.(instance)
		const watermarkHeight = 40
		const watermarkWidth = Math.round((389 / 133) * watermarkHeight)

		const option = {
			...(isNarrativeLike
				? {}
				: {
						title: {
							text: 'APY Trends - 1d Change',
							textStyle: {
								fontFamily: 'sans-serif',
								fontWeight: 600,
								color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
							}
						}
					}),
			graphic: [
				{
					type: 'image',
					zlevel: 10,
					z: 999,
					silent: true,
					left: 'center',
					top: 'middle',
					style: {
						image: isDark ? '/assets/defillama-light-neutral.webp' : '/assets/defillama-dark-neutral.webp',
						width: watermarkWidth,
						height: watermarkHeight,
						opacity: 0.3
					}
				}
			],
			tooltip: {
				formatter: function (info) {
					const treePathInfo = Array.isArray(info?.treePathInfo) ? info.treePathInfo : []
					const treePath: string[] = []
					for (let i = 1; i < treePathInfo.length; i++) {
						treePath.push(treePathInfo[i].name)
					}

					if (variant === 'narrative') {
						if (treePath.length > 1) {
							return [
								`${treePath[1]}<br>`,
								`Return: ${info.value[1]}%<br>`,
								`Market Cap: ${formattedNum(info.value[0], true)}<br>`
							].join('')
						} else {
							return null
						}
					}

					if (isRwaVariant) {
						const formatPct = (value: unknown): number => {
							const n = typeof value === 'number' ? value : Number(value)
							return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
						}
						const normalizedValue = normalizeTreemapValue(info.value)
						const metricValue = formattedNum(normalizedValue[0], true)
						const share = formatPct(normalizedValue[1])
						const shareOfTotal = formatPct(normalizedValue[2])

						// Nested RWA treemap shape can be:
						// [Parent, Child] (e.g. Category -> Asset Class) or [Leaf].
						if (treePath.length >= 2) {
							const parent = treePath[treePath.length - 2]
							const child = treePath[treePath.length - 1]
							return [
								`Parent: ${parent}<br>`,
								`Child: ${child}<br>`,
								`${valueLabel}: ${metricValue}<br>`,
								`Share of Parent: ${share}%<br>`,
								`Share of Total: ${shareOfTotal}%<br>`
							].join('')
						}

						if (treePath.length === 1) {
							const label = treePath[treePath.length - 1]
							return [`${label}<br>`, `${valueLabel}: ${metricValue}<br>`, `Share: ${share}%<br>`].join('')
						}

						const rootLabel = treePath[0] || info.name || 'RWA'
						return [`${rootLabel}<br>`, `${valueLabel}: ${metricValue}<br>`].join('')
					}

					if (treePath.length > 1) {
						return [
							`Project: ${treePath[0]}<br>`,
							`Pool: ${treePath[1]}<br>`,
							`TVL: ${formattedNum(info.value[0], true)}<br>`,
							`APY: ${info.value[1]}%<br>`,
							`1d Change: ${info.value[2]}%`
						].join('')
					} else {
						return `Project: ${treePath[0] || info.name || ''}`
					}
				}
			},
			...(isRwaVariant ? {} : { toolbox: { feature: { restore: {} } } }),
			series: [
				{
					name: isRwaVariant ? rwaRootLabel : 'All',
					type: 'treemap',
					...(isRwaVariant
						? {
								top: 12,
								left: 12,
								right: 12,
								bottom: 12
							}
						: isNarrativeVariant
							? {
									top: 0,
									left: 0,
									right: 0,
									bottom: 0
								}
							: {}),
					...(isRwaVariant
						? {}
						: {
								visualMin: visualMin,
								visualMax: visualMax,
								visualDimension: 3
							}),
					...(isNarrativeVariant
						? {
								roam: false,
								nodeClick: false,
								breadcrumb: { show: false }
							}
						: isRwaVariant
							? {
									roam: true,
									nodeClick: 'zoomToNode',
									breadcrumb: { show: false }
								}
							: {
									breadcrumb: {
										itemStyle: {
											color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.4)'
										},
										textStyle: {
											fontFamily: 'sans-serif',
											fontWeight: 400,
											color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
										}
									}
								}),
					...(isRwaVariant
						? {
								// Keep RWA node color stable on hover; tooltip still works.
								emphasis: { disabled: true }
							}
						: {}),
					label: {
						position: 'insideTopRight',
						...(isRwaVariant
							? {
									color: '#fff',
									textBorderColor: 'rgba(0,0,0,0.35)',
									textBorderWidth: 2
								}
							: {}),
						formatter: function (params) {
							let arr
							const path = typeof params?.data?.path === 'string' ? params.data.path : ''
							const pathParts = path ? path.split('/') : []
							if (pathParts.length > 1) {
								const hasChildren = Array.isArray(params?.data?.children) && params.data.children.length > 0
								if (isRwaVariant && hasChildren) {
									// Parent nodes: show the group name directly for visibility.
									return String(params.name ?? '')
								}

								const normalizedValue = normalizeTreemapValue(params?.value)

								arr =
									variant === 'narrative'
										? [
												`{name|${pathParts[pathParts.length - 1]}}`,
												`Return: {apy| ${normalizedValue[1] ?? 0}%}`,
												`Market Cap: {mcap| ${formattedNum(normalizedValue[0], true)}}`
											]
										: isRwaVariant
											? [
													`${pathParts[pathParts.length - 1]}`,
													`${valueLabel}: ${formattedNum(normalizedValue[0], true)}`,
													`Share: ${Number.isFinite(normalizedValue[1]) ? normalizedValue[1] : 0}%`
												]
											: [
													`{name|${pathParts[pathParts.length - 1]}}`,
													`Spot: {apy| ${normalizedValue[1] ?? 0}%}`,
													`Change {apy| ${normalizedValue[2] ?? 0}%}`
												]
							} else {
								arr = [String(params.name ?? '')]
							}
							return arr.join('\n')
						},
						rich: {
							name: {
								fontSize: 15,
								color: '#fff',
								lineHeight: 20
							},
							apy: {
								fontSize: 13,
								color: '#fff',
								lineHeight: 20
							}
						}
					},
					upperLabel: {
						show: true,
						height: 20,
						color: isDark ? '#fff' : '#111'
					},
					itemStyle: {
						borderColor: isRwaVariant ? (isDark ? '#2d3139' : '#d1d5db') : '#fff'
					},
					levels: [
						{
							itemStyle: {
								borderColor: isRwaVariant ? (isDark ? '#2d3139' : '#d1d5db') : '#777',
								borderWidth: 0,
								gapWidth: 1,
								...(isRwaVariant ? { color: isDark ? '#374151' : '#e5e7eb' } : {})
							},
							upperLabel: isRwaVariant
								? {
										show: true,
										height: 22,
										padding: [0, 4],
										color: isDark ? '#fff' : '#1f2937',
										...(isDark ? { textBorderColor: 'rgba(0,0,0,0.3)', textBorderWidth: 2 } : {})
									}
								: {
										show: false
									}
						},
						{
							...(isRwaVariant
								? {}
								: {
										color: ['#942e38', '#aaa', '#269f3c'],
										colorMappingBy: 'value'
									}),
							itemStyle: isRwaVariant
								? {
										borderColor: isDark ? '#2d3139' : '#d1d5db',
										borderWidth: 2,
										gapWidth: 1
									}
								: {
										borderColor: '#555',
										borderWidth: 5,
										gapWidth: 1
									},
							...(isRwaVariant
								? {
										upperLabel: {
											show: true,
											height: 22,
											padding: [0, 2],
											color: isDark ? '#fff' : '#1f2937',
											...(isDark
												? {
														backgroundColor: 'rgba(55,65,81,0.88)',
														textBorderColor: 'rgba(0,0,0,0.3)',
														textBorderWidth: 2
													}
												: { backgroundColor: 'rgba(229,231,235,0.92)' })
										}
									}
								: {}),
							emphasis: {
								itemStyle: {
									borderColor: isRwaVariant ? (isDark ? '#2d3139' : '#d1d5db') : '#ddd'
								}
							}
						},
						{
							...(isRwaVariant ? {} : { colorSaturation: [0, 1] }),
							itemStyle: isRwaVariant
								? {
										borderWidth: 1,
										gapWidth: 0,
										borderColor: isDark ? '#2d3139' : '#d1d5db'
									}
								: {
										borderWidth: 5,
										gapWidth: 1,
										borderColorSaturation: 0.6
									}
						}
					],
					data: chartDataTree
				}
			]
		}
		instance.setOption(option, { notMerge: true, lazyUpdate: true })

		return () => {
			chartRef.current = null
			onReadyRef.current?.(null)
			instance.dispose()
		}
	}, [id, chartDataTree, isDark, isNarrativeLike, isNarrativeVariant, isRwaVariant, rwaRootLabel, variant, valueLabel])

	useEffect(() => {
		const instance = chartRef.current
		if (!instance) return

		// Container height changes don't automatically trigger echarts resize.
		const raf = requestAnimationFrame(() => {
			instance.resize()
		})
		return () => cancelAnimationFrame(raf)
	}, [height])

	const resolvedHeight = height ?? (variant === 'narrative' ? '533px' : '800px')

	if (isNarrativeLike) {
		return <div id={id} className="my-auto w-full" style={{ height: resolvedHeight }} />
	}

	return (
		<div className="relative flex flex-col items-end rounded-md bg-(--cards-bg) p-3">
			<div id={id} className="w-full" style={{ height: resolvedHeight }} />
		</div>
	)
}
