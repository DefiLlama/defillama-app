import { lazy, Suspense, useMemo } from 'react'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { formattedNum } from '~/utils'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
interface UsageStatsCardProps {
	show: boolean
	usageStats: any | null | undefined
	isLoading: boolean
	isError: boolean
}

const CHART_COLOR = '#5C5CF9'
const DEFAULT_WINDOW_DAYS = 30
const TOP_ROUTES = 6
const ROUTE_COLORS = ['#5C5CF9', '#22c55e', '#f59e0b', '#38bdf8', '#f97316', '#a855f7', '#14b8a6']
const CHART_TEXT_COLOR = '#b4b7bc'
const CHART_AXIS_COLOR = '#34363f'
const CHART_SPLIT_COLOR = 'rgba(255, 255, 255, 0.08)'
const CHART_TOOLTIP_BG = '#1f2127'
const CHART_TOOLTIP_TEXT = '#e5e7eb'

export const UsageStatsCard = ({ show, usageStats, isLoading, isError }: UsageStatsCardProps) => {
	const windowDays = usageStats?.windowDays ?? DEFAULT_WINDOW_DAYS

	const sortedStats = useMemo(
		() => [...(usageStats?.stats ?? [])].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
		[usageStats?.stats]
	)

	const totalRequests = useMemo(() => sortedStats.reduce((sum, day) => sum + day.totalRequests, 0), [sortedStats])

	const averageRequests = useMemo(() => {
		if (!sortedStats.length) return 0
		return Math.round(totalRequests / sortedStats.length)
	}, [sortedStats.length, totalRequests])

	const hasData = sortedStats.length > 0 && !isLoading && !isError

	const totalRequestsLabel = hasData ? formattedNum(totalRequests) : '--'
	const averageRequestsLabel = hasData ? formattedNum(averageRequests) : '--'

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

		const makeTimestamp = (date: string) => (date.includes('T') ? Date.parse(date) : Date.parse(`${date}T00:00:00Z`))

		const seriesNames = hasOthers ? [...topRoutes, 'Others'] : topRoutes
		const dimensions = ['date', ...seriesNames]

		const source = sortedStats.map((day) => {
			const row: Record<string, string | number | null | undefined> = {
				date: makeTimestamp(day.date)
			}
			for (const route of topRoutes) {
				row[route] = day.routes?.[route] ?? 0
			}
			if (hasOthers) {
				row['Others'] = Object.entries(day.routes ?? {}).reduce((sum, [route, count]) => {
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
			color: name === 'Others' ? '#64748b' : (ROUTE_COLORS[index % ROUTE_COLORS.length] ?? CHART_COLOR)
		}))

		return { dataset: { source, dimensions }, charts }
	}, [sortedStats])

	const chartOptions = useMemo(
		() => ({
			xAxis: {
				axisLabel: { color: CHART_TEXT_COLOR },
				axisLine: { lineStyle: { color: CHART_AXIS_COLOR } }
			},
			yAxis: {
				axisLabel: { color: CHART_TEXT_COLOR },
				axisLine: { lineStyle: { color: CHART_AXIS_COLOR } },
				splitLine: { lineStyle: { color: CHART_SPLIT_COLOR } }
			},
			legend: {
				textStyle: { color: CHART_TEXT_COLOR }
			},
			tooltip: {
				backgroundColor: CHART_TOOLTIP_BG,
				borderColor: CHART_AXIS_COLOR,
				textStyle: { color: CHART_TOOLTIP_TEXT },
				formatter: (params: any[]) => {
					if (!Array.isArray(params) || params.length === 0) return ''

					const axisValue = params[0]?.value?.[0] ?? params[0]?.data?.[0]
					const dateLabel = typeof axisValue === 'number' ? formatTooltipChartDate(axisValue, 'daily') : ''

					const items = params
						.map((item) => ({
							name: item.seriesName,
							value: Number(item?.value?.[1] ?? 0),
							marker: item.marker ?? ''
						}))
						.filter((item) => Number.isFinite(item.value) && item.value > 0)
						.sort((a, b) => b.value - a.value)

					const total = params.reduce((sum, item) => sum + Number(item?.value?.[1] ?? 0), 0)

					const rows = items
						.map(
							(item) =>
								`<li style="list-style:none">${item.marker}${item.name}&nbsp;&nbsp;${formattedNum(item.value)}</li>`
						)
						.join('')

					const totalRow = `<li style="list-style:none;font-weight:600">Total&nbsp;&nbsp;${formattedNum(total)}</li>`

					return `
						<div>
							<div style="margin-bottom:4px;">${dateLabel}</div>
							<ul style="margin:0;padding:0;">${rows}${totalRow}</ul>
						</div>
					`
				}
			}
		}),
		[]
	)

	if (!show) return null

	return (
		<div className="relative overflow-hidden rounded-xl border border-[#39393E] bg-linear-to-b from-[#222429] to-[#1d1f24] shadow-xl">
			<div className="absolute -inset-1 -z-10 bg-linear-to-r from-[#5C5EFC]/20 to-[#462A92]/20 opacity-70 blur-[100px]"></div>
			<div className="border-b border-[#39393E]/40 p-4 sm:p-6">
				<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
					<div className="flex items-center gap-2.5 sm:gap-3">
						<div className="relative rounded-lg bg-[#5C5CF9]/10 p-2 text-[#5C5CF9] sm:p-2.5">
							<Icon name="activity" height={18} width={18} className="sm:h-5 sm:w-5" />
						</div>
						<div>
							<h3 className="text-lg font-bold sm:text-xl">API Usage</h3>
							<p className="text-xs text-[#b4b7bc] sm:text-sm">Last {windowDays} days</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-6 text-right">
						<div className="flex flex-col">
							<span className="text-xs text-[#8a8c90]">Total requests</span>
							<span className="text-lg font-semibold text-white">{totalRequestsLabel}</span>
						</div>
						<div className="flex flex-col">
							<span className="text-xs text-[#8a8c90]">Avg/day</span>
							<span className="text-lg font-semibold text-white">{averageRequestsLabel}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="p-4 sm:p-6">
				{isLoading ? (
					<div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-[#b4b7bc]">
						<LoadingSpinner size={16} />
						<span>Loading usage stats...</span>
					</div>
				) : isError ? (
					<div className="flex min-h-[220px] items-center justify-center text-sm text-[#b4b7bc]">
						Unable to load usage stats right now.
					</div>
				) : sortedStats.length === 0 ? (
					<div className="flex min-h-[220px] items-center justify-center text-sm text-[#b4b7bc]">
						No usage data yet.
					</div>
				) : (
					<div className="rounded-lg border border-[#39393E] bg-[#1a1b1f] p-3 sm:p-4">
						<Suspense fallback={<div className="min-h-[260px]" />}>
							<MultiSeriesChart2
								dataset={dataset}
								charts={charts}
								height="260px"
								valueSymbol=""
								hideDataZoom
								hideDefaultLegend={false}
								chartOptions={chartOptions as unknown as IMultiSeriesChart2Props['chartOptions']}
							/>
						</Suspense>
					</div>
				)}
			</div>
		</div>
	)
}
