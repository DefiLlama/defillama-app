import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts/core'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { getProtocolEmissons } from '~/api/categories/protocols'
import type { IChartProps } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { download, slug, toNiceCsvDate, toNiceDayMonthYear } from '~/utils'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { UnlocksScheduleConfig } from '../types'
import { ChartExportButton } from './ProTable/ChartExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const UnlocksChart = lazy(() => import('~/components/ECharts/UnlocksChart')) as React.FC<IChartProps>

const EMPTY_CHART_DATA: any[] = []
const EMPTY_STACKS: string[] = []

interface UnlocksScheduleCardProps {
	config: UnlocksScheduleConfig
}

export function UnlocksScheduleCard({ config }: UnlocksScheduleCardProps) {
	const { protocol, protocolName, dataType } = config
	const resolvedDataType = dataType === 'realtime' ? 'documented' : dataType
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const [chartInstance, _setChartInstance] = useState<echarts.ECharts | null>(null)
	const todayTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [])
	const todayHallmarks = useMemo<[number, string][]>(
		() => [[todayTimestamp, toNiceDayMonthYear(todayTimestamp)]],
		[todayTimestamp]
	)

	const { data, isLoading } = useQuery({
		queryKey: ['unlocks-schedule', protocol, resolvedDataType],
		queryFn: () => getProtocolEmissons(slug(protocol)),
		enabled: Boolean(protocol),
		staleTime: 60 * 60 * 1000
	})

	const rawChartData = useMemo(() => data?.chartData?.[resolvedDataType] ?? EMPTY_CHART_DATA, [data, resolvedDataType])

	const filteredChartData = useMemo(() => {
		if (!rawChartData.length || !timePeriod || timePeriod === 'all') return rawChartData
		const points: [number, number][] = rawChartData.map((item: any) => [Number(item.date), 1])
		const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
		const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
		return rawChartData.filter((item: any) => filteredTimestamps.has(Number(item.date)))
	}, [rawChartData, timePeriod, customTimePeriod])

	const stacks = useMemo(() => {
		const categories = data?.categories?.[resolvedDataType] ?? EMPTY_STACKS
		if (categories.length > 0) return categories
		const first = rawChartData[0]
		if (!first || typeof first !== 'object') return EMPTY_STACKS
		return Object.keys(first).filter((key) => key !== 'date')
	}, [data, resolvedDataType, rawChartData])

	const stackColors = useMemo(() => data?.stackColors?.[resolvedDataType] ?? {}, [data, resolvedDataType])

	const hasChartData = filteredChartData.length > 0 && stacks.length > 0
	const imageTitle = `${protocolName} Unlocks Schedule`
	const imageFilename = `${slug(protocolName || protocol)}-unlock-schedule-${resolvedDataType}`

	const handleCsvExport = useCallback(() => {
		if (!hasChartData) return
		const headers = ['Date', ...stacks]
		const rows = filteredChartData.map((item: any) => {
			const dateValue = Number(item.date)
			return [toNiceCsvDate(dateValue), ...stacks.map((stack) => item[stack] ?? '')]
		})
		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const filename = `${slug(protocolName || protocol)}-unlock-schedule-${resolvedDataType}.csv`
		download(filename, csvContent)
	}, [hasChartData, filteredChartData, stacks, protocolName, protocol, resolvedDataType])

	if (isLoading) {
		return (
			<div className="flex min-h-[422px] items-center justify-center md:min-h-[438px]">
				<LocalLoader />
			</div>
		)
	}

	return (
		<div className="flex min-h-[422px] flex-col p-2 md:min-h-[438px]">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<h3 className="text-sm font-semibold pro-text1">{protocolName} Unlocks Schedule </h3>
				</div>
				{hasChartData && (
					<div className="flex gap-2">
						<ChartExportButton chartInstance={() => chartInstance} filename={imageFilename} title={imageTitle} smol />
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>
			<div>
				{hasChartData ? (
					<Suspense fallback={<div className="h-[360px]" />}>
						<UnlocksChart
							chartData={filteredChartData}
							stacks={stacks}
							stackColors={stackColors}
							customLegendName="Category"
							customLegendOptions={stacks}
							isStackedChart
							hideDataZoom
							hallmarks={todayHallmarks}
						/>
					</Suspense>
				) : (
					<div className="flex h-[360px] items-center justify-center text-center pro-text3">
						No unlocks data available.
					</div>
				)}
			</div>
		</div>
	)
}
