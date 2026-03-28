import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LoadingSpinner } from '~/components/Loaders'
import { formattedNum } from '~/utils'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

interface ApiUsageBreakdownProps {
	usageStats: any | null | undefined
	isLoading: boolean
	isError: boolean
}

const DEFAULT_WINDOW_DAYS = 30
const TOP_ROUTES = 6

const CSS_VAR_KEYS = {
	routes: [
		'--sub-chart-1',
		'--sub-chart-2',
		'--sub-chart-3',
		'--sub-chart-4',
		'--sub-chart-5',
		'--sub-chart-6',
		'--sub-chart-7'
	],
	others: '--sub-chart-others',
	split: '--sub-chart-split',
	muted: '--sub-c-878787',
	axis: '--sub-chart-axis',
	tooltipBg: '--sub-chart-tooltip-bg',
	tooltipBorder: '--sub-chart-tooltip-border'
} as const

function resolveChartColors() {
	const style = getComputedStyle(document.documentElement)
	const get = (key: string) => style.getPropertyValue(key).trim()
	return {
		routes: CSS_VAR_KEYS.routes.map(get),
		others: get(CSS_VAR_KEYS.others),
		split: get(CSS_VAR_KEYS.split),
		muted: get(CSS_VAR_KEYS.muted),
		axis: get(CSS_VAR_KEYS.axis),
		tooltipBg: get(CSS_VAR_KEYS.tooltipBg),
		tooltipBorder: get(CSS_VAR_KEYS.tooltipBorder)
	}
}

type ChartColors = ReturnType<typeof resolveChartColors>

function useChartData(usageStats: any, colors: ChartColors) {
	const sortedStats = useMemo(
		() => [...(usageStats?.stats ?? [])].sort((a: any, b: any) => Date.parse(a.date) - Date.parse(b.date)),
		[usageStats?.stats]
	)

	const totalRequests = useMemo(
		() => sortedStats.reduce((sum: number, day: any) => sum + day.totalRequests, 0),
		[sortedStats]
	)

	const averageRequests = useMemo(() => {
		if (!sortedStats.length) return 0
		return Math.round(totalRequests / sortedStats.length)
	}, [sortedStats.length, totalRequests])

	const { dataset, charts } = useMemo<{
		dataset: MultiSeriesChart2Dataset
		charts: IMultiSeriesChart2Props['charts']
	}>(() => {
		if (!sortedStats.length) {
			return { dataset: { source: [], dimensions: ['date'] }, charts: [] }
		}

		const routeTotals = new Map<string, number>()
		for (const day of sortedStats) {
			for (const [route, count] of Object.entries(day.routes ?? {})) {
				routeTotals.set(route, (routeTotals.get(route) ?? 0) + (count as number))
			}
		}

		const sortedRoutes = [...routeTotals.entries()].sort((a, b) => b[1] - a[1])
		const topRoutes = sortedRoutes.slice(0, TOP_ROUTES).map(([route]) => route)
		const topRoutesSet = new Set(topRoutes)
		const hasOthers = sortedRoutes.length > TOP_ROUTES

		const makeTimestamp = (date: string) =>
			date.includes('T') ? Date.parse(date) : Date.parse(`${date}T00:00:00Z`)

		const seriesNames = hasOthers ? [...topRoutes, 'Others'] : topRoutes
		const dimensions = ['date', ...seriesNames]

		const source = sortedStats.map((day: any) => {
			const row: Record<string, string | number | null | undefined> = {
				date: makeTimestamp(day.date)
			}
			for (const route of topRoutes) {
				row[route] = day.routes?.[route] ?? 0
			}
			if (hasOthers) {
				row['Others'] = Object.entries(day.routes ?? {}).reduce((sum: number, [route, count]) => {
					if (topRoutesSet.has(route)) return sum
					return sum + (count as number)
				}, 0)
			}
			return row
		})

		const charts: IMultiSeriesChart2Props['charts'] = seriesNames.map((name, index) => ({
			type: 'bar' as const,
			name,
			stack: 'routes',
			encode: { x: 'date', y: name },
			color: name === 'Others' ? colors.others : (colors.routes[index % colors.routes.length] ?? colors.routes[0])
		}))

		return { dataset: { source, dimensions }, charts }
	}, [sortedStats, colors])

	const windowDays = usageStats?.windowDays ?? DEFAULT_WINDOW_DAYS

	return { sortedStats, totalRequests, averageRequests, dataset, charts, windowDays }
}

export function ApiUsageBreakdown({ usageStats, isLoading, isError }: ApiUsageBreakdownProps) {
	const [colors, setColors] = useState<ChartColors | null>(null)
	const resolved = useRef(false)

	useEffect(() => {
		if (!resolved.current) {
			resolved.current = true
			setColors(resolveChartColors())
		}
	}, [])

	// Use fallback colors for SSR / first render — will be replaced immediately on mount
	const activeColors = colors ?? {
		routes: CSS_VAR_KEYS.routes.map(() => ''),
		others: '',
		split: '',
		muted: '',
		axis: '',
		tooltipBg: '',
		tooltipBorder: ''
	}

	const { sortedStats, totalRequests, averageRequests, dataset, charts, windowDays } =
		useChartData(usageStats, activeColors)

	const hasData = sortedStats.length > 0 && !isLoading && !isError
	const totalLabel = hasData ? formattedNum(totalRequests) : '--'
	const avgLabel = hasData ? formattedNum(averageRequests) : '--'

	const chartOptions = useMemo(
		() => ({
			graphic: [],
			grid: {
				top: 10,
				right: 0,
				bottom: 0,
				left: 0,
				containLabel: true
			},
			xAxis: {
				axisLabel: { color: activeColors.muted, fontSize: 10 },
				axisLine: { lineStyle: { color: activeColors.axis } },
				axisTick: { show: false }
			},
			yAxis: {
				axisLabel: { color: activeColors.muted, fontSize: 10 },
				axisLine: { show: false },
				splitLine: { lineStyle: { color: activeColors.split } }
			},
			legend: {
				show: false
			},
			tooltip: {
				trigger: 'axis',
				backgroundColor: activeColors.tooltipBg || '#131516',
				borderColor: activeColors.tooltipBorder || '#2f3336',
				borderWidth: 1,
				extraCssText: `box-shadow: 0 4px 12px rgba(0,0,0,0.3);`,
				textStyle: { color: '#fff', fontSize: 12 },
				formatter: (params: any) => {
					const list = Array.isArray(params) ? params : [params]
					if (list.length === 0) return ''

					const firstValue = list[0]?.value ?? list[0]?.data
					const dateKey = firstValue?.date ?? firstValue?.[0]
					const dateLabel =
						typeof dateKey === 'number' ? formatTooltipChartDate(dateKey, 'daily') : ''

					const items: Array<{ name: string; value: number; marker: string }> = []
					let total = 0
					for (const item of list) {
						const row = item?.value ?? item?.data ?? {}
						const val = Number(row[item.seriesName] ?? 0)
						total += val
						if (!Number.isFinite(val) || val <= 0) continue
						items.push({ name: item.seriesName, value: val, marker: item.marker ?? '' })
					}
					items.sort((a, b) => b.value - a.value)

					const rows = items
						.map(
							(item) =>
								`<li style="list-style:none;padding:1px 0">${item.marker}${item.name}&nbsp;&nbsp;<b>${formattedNum(item.value)}</b></li>`
						)
						.join('')
					const totalRow = `<li style="list-style:none;padding:2px 0 0;border-top:1px solid ${activeColors.axis};margin-top:4px;font-weight:600">Total&nbsp;&nbsp;${formattedNum(total)}</li>`

					return `<div><div style="margin-bottom:6px;font-weight:500">${dateLabel}</div><ul style="margin:0;padding:0">${rows}${totalRow}</ul></div>`
				}
			}
		}),
		[activeColors]
	)

	return (
		<div className="flex flex-col gap-4 rounded-lg bg-(--sub-c-f6f7f9) p-3 dark:bg-(--sub-c-090b0c)">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-sm text-(--sub-c-090b0c) dark:text-white">API Usage Breakdown</span>
					<span className="text-xs text-(--sub-c-878787)">Last {windowDays} days</span>
				</div>
				<div className="flex items-center gap-6">
					<div className="flex flex-col items-end">
						<span className="text-sm font-semibold text-(--sub-c-090b0c) dark:text-white">{totalLabel}</span>
						<span className="text-[10px] text-(--sub-c-878787)">Total Requests</span>
					</div>
					<div className="flex flex-col items-end">
						<span className="text-sm font-semibold text-(--sub-c-090b0c) dark:text-white">{avgLabel}</span>
						<span className="text-[10px] text-(--sub-c-878787)">Ave/Day</span>
					</div>
				</div>
			</div>

			{/* Legend */}
			{hasData && charts.length > 0 && (
				<div className="flex flex-wrap gap-x-4 gap-y-1">
					{charts.map((series) => (
						<div key={series.name} className="flex items-center gap-1.5">
							<span
								className="inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: series.color }}
							/>
							<span className="text-[10px] text-(--sub-c-878787)">{series.name}</span>
						</div>
					))}
				</div>
			)}

			{/* Chart */}
			{isLoading ? (
				<div className="flex min-h-[200px] items-center justify-center gap-2 text-xs text-(--sub-c-878787)">
					<LoadingSpinner size={14} />
					<span>Loading usage stats...</span>
				</div>
			) : isError ? (
				<div className="flex min-h-[200px] items-center justify-center text-xs text-(--sub-c-878787)">
					Unable to load usage stats right now.
				</div>
			) : sortedStats.length === 0 ? (
				<div className="flex min-h-[200px] items-center justify-center text-xs text-(--sub-c-878787)">
					No usage data yet.
				</div>
			) : (
				<Suspense fallback={<div className="min-h-[200px]" />}>
					<MultiSeriesChart2
						dataset={dataset}
						charts={charts}
						height="200px"
						valueSymbol=""
						hideDataZoom
						hideDefaultLegend
						exportButtons="hidden"
						chartOptions={chartOptions as unknown as IMultiSeriesChart2Props['chartOptions']}
					/>
				</Suspense>
			)}
		</div>
	)
}
