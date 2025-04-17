import { useCallback, useEffect, useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { TreemapChart as EChartTreemap } from 'echarts/charts'
import { TooltipComponent, TitleComponent, ToolboxComponent } from 'echarts/components'
import { useDarkModeManager } from '~/contexts/LocalStorage'
import { formattedNum, tokenIconUrl } from '~/utils'
import dayjs from 'dayjs'

echarts.use([TitleComponent, TooltipComponent, ToolboxComponent, EChartTreemap, CanvasRenderer])

interface UnlocksTreemapProps {
	unlocksData: {
		[date: string]: {
			totalValue: number
			events: Array<{
				protocol: string
				value: number
				details: string
				unlockType: string
			}>
		}
	}
	height?: string
	filterYear?: number
}

interface YearData {
	children: {
		[month: string]: {
			protocols: {
				[protocol: string]: number
			}
			value: number
		}
	}
	value: number
}

type YearDataMap = {
	[year: string]: YearData
}

type TimeView = 'currentYear' | 'currentMonth' | 'allYears'

export default function UnlocksTreemapChart({ unlocksData, height = '600px', filterYear }: UnlocksTreemapProps) {
	const id = useMemo(() => crypto.randomUUID(), [])
	const [isDark] = useDarkModeManager()
	const [timeView, setTimeView] = useState<TimeView>('currentYear')
	const [selectedDate, setSelectedDate] = useState(dayjs())

	const currentYear = filterYear || dayjs().year()

	const chartDataTree = useMemo(() => {
		const treeData = []
		const yearData: YearDataMap = {}

		Object.entries(unlocksData).forEach(([dateStr, dailyData]) => {
			const date = dayjs(dateStr)
			const year = date.year()
			const monthIndex = date.month()
			const monthName = date.format('MMMM')

			if (year < currentYear) return

			if (timeView === 'currentYear' && year > currentYear) return
			if (timeView === 'currentMonth' && monthIndex !== selectedDate.month()) return

			if (!yearData[year]) {
				yearData[year] = {
					children: {},
					value: 0
				}
			}

			if (!yearData[year].children[monthName]) {
				yearData[year].children[monthName] = {
					protocols: {},
					value: 0
				}
			}

			dailyData.events.forEach((event) => {
				if (!yearData[year].children[monthName].protocols[event.protocol]) {
					yearData[year].children[monthName].protocols[event.protocol] = 0
				}

				yearData[year].children[monthName].protocols[event.protocol] += event.value
				yearData[year].children[monthName].value += event.value
				yearData[year].value += event.value
			})
		})

		if (timeView === 'currentMonth') {
			const targetYear = selectedDate.year()
			const targetMonthName = selectedDate.format('MMMM')
			if (yearData[targetYear] && yearData[targetYear].children[targetMonthName]) {
				const monthInfo = yearData[targetYear].children[targetMonthName]
				const protocolsData = Object.entries(monthInfo.protocols)
					.map(([protocol, value]) => {
						const iconUrl = tokenIconUrl(protocol)
						return {
							name: protocol,
							value: value,
							iconUrl: iconUrl,
							label: {
								show: true,
								formatter: `{icon|}\n{name|${protocol}}\n{value|${formattedNum(value, true)}}`,
								position: 'inside',
								color: '#fff',
								textShadowBlur: 1,
								textShadowColor: 'rgba(0, 0, 0, 0.6)',
								rich: {
									icon: {
										height: 20,
										width: 20,
										align: 'center',
										backgroundColor: { image: iconUrl },
										lineHeight: 25
									},
									name: {
										fontSize: 11,
										fontWeight: 600,
										color: isDark ? '#f0f0f0' : '#333',
										align: 'center',
										lineHeight: 14
									},
									value: {
										fontSize: 10,
										color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)',
										align: 'center',
										lineHeight: 12
									},
									borderRadius: 50
								}
							}
						}
					})
					.sort((a, b) => b.value - a.value)
				return protocolsData
			} else {
				return []
			}
		}

		if (timeView === 'currentYear' && yearData[currentYear]) {
			const currentYearData = yearData[currentYear]

			return Object.entries(currentYearData.children)
				.map(([month, monthInfo]) => {
					const monthNode: any = {
						name: month,
						value: monthInfo.value,
						children: [],
						upperLabel: {
							show: true,
							formatter: `${month} - ${formattedNum(monthInfo.value, true)}`
						}
					}

					Object.entries(monthInfo.protocols).forEach(([protocol, value]) => {
						const iconUrl = tokenIconUrl(protocol)
						monthNode.children.push({
							name: protocol,
							value: value,
							iconUrl: iconUrl,
							label: {
								show: true,
								formatter: `{icon|}\n{name|${protocol}}\n{value|${formattedNum(value, true)}}`,
								position: 'inside',
								color: '#fff',
								textShadowBlur: 1,
								textShadowColor: 'rgba(0, 0, 0, 0.6)',
								rich: {
									icon: {
										height: 20,
										width: 20,
										align: 'center',
										backgroundColor: {
											image: iconUrl
										},
										lineHeight: 25
									},
									name: {
										fontSize: 11,
										fontWeight: 600,
										color: isDark ? '#f0f0f0' : '#333',
										align: 'center',
										lineHeight: 14
									},
									value: {
										fontSize: 10,
										color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)',
										align: 'center',
										lineHeight: 12
									},
									borderRadius: 50
								}
							}
						})
					})

					monthNode.children.sort((a, b) => b.value - a.value)
					return monthNode
				})
				.sort((a, b) => b.value - a.value)
		}

		if (timeView === 'allYears') {
			Object.entries(yearData).forEach(([year, yearInfo]) => {
				const yearNode: any = {
					name: year,
					value: yearInfo.value,
					children: [],
					upperLabel: {
						show: true,
						formatter: `${year} - ${formattedNum(yearInfo.value, true)}`
					}
				}

				Object.entries(yearInfo.children).forEach(([month, monthInfo]) => {
					const monthNode: any = {
						name: month,
						value: monthInfo.value,
						children: [],
						upperLabel: {
							show: true,
							formatter: `${month} - ${formattedNum(monthInfo.value, true)}`
						}
					}

					Object.entries(monthInfo.protocols).forEach(([protocol, value]) => {
						const iconUrl = tokenIconUrl(protocol)
						monthNode.children.push({
							name: protocol,
							value: value,
							iconUrl: iconUrl,
							label: {
								show: true,
								formatter: `{icon|}\n{name|${protocol}}\n{value|${formattedNum(value, true)}}`,
								position: 'inside',
								color: '#fff',
								textShadowBlur: 1,
								textShadowColor: 'rgba(0, 0, 0, 0.6)',
								rich: {
									icon: {
										height: 20,
										width: 20,
										align: 'center',
										backgroundColor: {
											image: iconUrl
										},
										lineHeight: 25
									},
									name: {
										fontSize: 11,
										fontWeight: 600,
										color: isDark ? '#f0f0f0' : '#333',
										align: 'center',
										lineHeight: 14
									},
									value: {
										fontSize: 10,
										color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)',
										align: 'center',
										lineHeight: 12
									},
									borderRadius: 50
								}
							}
						})
					})

					monthNode.children.sort((a, b) => b.value - a.value)
					yearNode.children.push(monthNode)
				})

				yearNode.children.sort((a, b) => b.value - a.value)
				treeData.push(yearNode)
			})

			treeData.sort((a, b) => Number(a.name) - Number(b.name))
			return treeData
		}

		return []
	}, [unlocksData, currentYear, timeView, isDark, selectedDate])

	const createInstance = useCallback(() => {
		const instance = echarts.getInstanceByDom(document.getElementById(id))
		return instance || echarts.init(document.getElementById(id))
	}, [id])

	useEffect(() => {
		const chartInstance = createInstance()

		const option = {
			title: {
				textStyle: {
					fontFamily: 'sans-serif',
					fontWeight: 600,
					color: isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)'
				}
			},
			tooltip: {
				formatter: (info: any) => {
					const { data, treePathInfo } = info
					const { name, value, iconUrl } = data
					const pathNames = treePathInfo.map((item) => item.name).slice(0, -1)

					let pathDisplay = pathNames.join(' > ')
					if (timeView === 'currentMonth' && !pathNames.length) {
						pathDisplay = ''
					} else if (pathDisplay) {
						pathDisplay += ' > '
					}

					let content = `<div style="font-size: 12px; line-height: 1.5;">`
					if (iconUrl) {
						content += `<img src="${iconUrl}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;" /> `
					}
					content += `<strong>${pathDisplay}${name}</strong><br/>`
					content += `Value: <strong>${formattedNum(value, true)}</strong>`
					content += `</div>`
					return content
				}
			},
			toolbox: {
				feature: {
					restore: {}
				},
				right: 8,
				top: 8
			},
			series: [
				{
					name: 'Token Unlocks',
					type: 'treemap',
					visibleMin: 300,
					data: chartDataTree,
					leafDepth: 2,
					roam: true,
					left: 0,
					top: 0,
					right: 0,
					bottom: 0,
					label: {
						show: true,
						rich: {}
					},
					upperLabel: {
						show: true,
						height: 25,
						color: isDark ? '#fff' : '#000',
						fontSize: 13,
						fontWeight: 600,
						textShadowBlur: 2,
						textShadowColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.5)'
					},
					itemStyle: {
						borderColor: isDark ? '#444' : '#eee',
						borderWidth: 1,
						gapWidth: 1
					},
					levels: [
						{
							itemStyle: {
								borderColor: isDark ? '#666' : '#aaa',
								borderWidth: 0,
								gapWidth: 1
							},
							upperLabel: {
								show: false
							}
						},
						{
							itemStyle: {
								borderWidth: 1,
								gapWidth: 1,
								borderColorSaturation: 0.5
							},
							upperLabel: {
								show: true,
								height: 22,
								color: isDark ? '#fff' : '#000',
								fontSize: 12,
								fontWeight: 500
							},
							emphasis: {
								itemStyle: {
									borderColor: isDark ? '#fff' : '#000'
								}
							}
						},
						{
							colorSaturation: [0.3, 0.7],
							itemStyle: {
								borderWidth: 1,
								gapWidth: 1,
								borderColorSaturation: 0.5
							}
						}
					],
					breadcrumb: {
						itemStyle: {
							color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
							textStyle: {
								fontFamily: 'sans-serif',
								fontWeight: 500,
								color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
							}
						},
						emphasis: {
							itemStyle: {
								color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'
							},
							textStyle: {
								color: isDark ? '#fff' : '#000'
							}
						}
					}
				}
			]
		}

		chartInstance.setOption(option)

		function resize() {
			chartInstance.resize()
		}

		window.addEventListener('resize', resize)

		return () => {
			window.removeEventListener('resize', resize)
			chartInstance.dispose()
		}
	}, [id, chartDataTree, createInstance, isDark, timeView, selectedDate])

	const goToPrevMonth = () => setSelectedDate((d) => d.subtract(1, 'month'))
	const goToNextMonth = () => setSelectedDate((d) => d.add(1, 'month'))

	return (
		<div className="flex flex-col gap-4 mt-[-24px]">
			<div className="flex flex-wrap items-center justify-end gap-4">
				{timeView === 'currentMonth' && (
					<div className="flex items-center gap-2 order-1 md:order-none">
						<button
							onClick={goToPrevMonth}
							className="p-1.5 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
							aria-label="Previous Month"
						>
							←
						</button>

						<span className="text-sm font-medium text-[var(--text1)] w-28 text-center">
							{selectedDate.format('MMMM YYYY')}
						</span>
						<button
							onClick={goToNextMonth}
							className="p-1.5 rounded hover:bg-[var(--bg7)] text-[var(--text2)] hover:text-[var(--text1)]"
							aria-label="Next Month"
						>
							→
						</button>
					</div>
				)}

				<div className="flex items-center justify-end gap-2 p-1 rounded-lg bg-[var(--bg7)] max-w-fit order-2 md:order-none">
					<button
						onClick={() => setTimeView('currentMonth')}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
							timeView === 'currentMonth'
								? 'bg-blue-500 text-white shadow-sm'
								: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
						}`}
					>
						Month
					</button>
					<button
						onClick={() => setTimeView('currentYear')}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
							timeView === 'currentYear'
								? 'bg-blue-500 text-white shadow-sm'
								: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
						}`}
					>
						Current Year
					</button>
					<button
						onClick={() => setTimeView('allYears')}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
							timeView === 'allYears'
								? 'bg-blue-500 text-white shadow-sm'
								: 'text-[var(--text1)] hover:text-blue-500 hover:bg-[var(--bg8)]'
						}`}
					>
						All Years
					</button>
				</div>
			</div>

			<div id={id} style={{ width: '100%', height: height }} />
		</div>
	)
}
