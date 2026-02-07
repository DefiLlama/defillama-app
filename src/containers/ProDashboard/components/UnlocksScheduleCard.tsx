import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { getProtocolEmissionsScheduleData } from '~/containers/Unlocks/queries'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { download, slug, toNiceCsvDate, toNiceDayMonthYear } from '~/utils'
import { useProDashboardTime } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'
import type { UnlocksScheduleConfig } from '../types'
import { ChartPngExportButton } from './ProTable/ChartPngExportButton'
import { ProTableCSVButton } from './ProTable/CsvButton'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const EMPTY_STACKS: string[] = []
const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }

interface UnlocksScheduleCardProps {
	config: UnlocksScheduleConfig
}

export function UnlocksScheduleCard({ config }: UnlocksScheduleCardProps) {
	const { protocol, protocolName, dataType } = config
	const resolvedDataType = dataType === 'realtime' ? 'documented' : dataType
	const { timePeriod, customTimePeriod } = useProDashboardTime()
	const { chartInstance, handleChartReady } = useChartImageExport()
	const todayTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [])
	const todayHallmarks = useMemo<[number, string][]>(
		() => [[todayTimestamp, toNiceDayMonthYear(todayTimestamp)]],
		[todayTimestamp]
	)

	const { data, isLoading } = useQuery({
		queryKey: ['unlocks-schedule', protocol, resolvedDataType],
		queryFn: () => getProtocolEmissionsScheduleData(slug(protocol)),
		enabled: Boolean(protocol),
		staleTime: 60 * 60 * 1000
	})

	// Pre-built from the API — no need to reconstruct dataset/charts from scratch.
	const apiDataset = data?.datasets?.[resolvedDataType] ?? EMPTY_DATASET
	const apiCharts = data?.chartsConfigs?.[resolvedDataType]

	const stacks = useMemo(() => {
		// dimensions[0] is 'timestamp', the rest are stacks
		if (apiDataset.dimensions.length > 1) return apiDataset.dimensions.slice(1)
		const categories = data?.categories?.[resolvedDataType] ?? EMPTY_STACKS
		if (categories.length > 0) return categories
		return EMPTY_STACKS
	}, [apiDataset.dimensions, data, resolvedDataType])

	const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null)
	const activeCategories = selectedCategories ?? stacks

	// Apply time-period filtering on the pre-built dataset source
	const dataset = useMemo<MultiSeriesChart2Dataset>(() => {
		const source = apiDataset.source
		if (!source.length || !timePeriod || timePeriod === 'all') return apiDataset
		const points: [number, number][] = source.map((item) => [Math.floor((item.timestamp as number) / 1e3), 1])
		const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
		const filteredSecondsSet = new Set(filtered.map(([ts]) => ts))
		const filteredSource = source.filter((item) => filteredSecondsSet.has(Math.floor((item.timestamp as number) / 1e3)))
		return { source: filteredSource, dimensions: apiDataset.dimensions }
	}, [apiDataset, timePeriod, customTimePeriod])

	const selectedChartsSet = useMemo(
		() => (selectedCategories ? new Set(selectedCategories) : undefined),
		[selectedCategories]
	)

	const hasChartData = dataset.source.length > 0 && stacks.length > 0
	const imageTitle = `${protocolName} Unlocks Schedule`
	const imageFilename = `${slug(protocolName || protocol)}-unlock-schedule-${resolvedDataType}`

	const handleCsvExport = useCallback(() => {
		if (!hasChartData) return
		const headers = ['Date', ...stacks]
		const rows = dataset.source.map((item) => {
			return [toNiceCsvDate(Math.floor((item.timestamp as number) / 1e3)), ...stacks.map((stack) => item[stack] ?? '')]
		})
		const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
		const filename = `${slug(protocolName || protocol)}-unlock-schedule-${resolvedDataType}.csv`
		download(filename, csvContent)
	}, [hasChartData, dataset.source, stacks, protocolName, protocol, resolvedDataType])

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
						<ChartPngExportButton chartInstance={chartInstance} filename={imageFilename} title={imageTitle} smol />
						<ProTableCSVButton
							onClick={handleCsvExport}
							smol
							className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-1.5 py-1 text-xs hover:border-transparent hover:not-disabled:pro-btn-blue focus-visible:border-transparent focus-visible:not-disabled:pro-btn-blue disabled:border-(--cards-border) disabled:text-(--text-disabled)"
						/>
					</div>
				)}
			</div>
			{hasChartData && stacks.length > 1 && (
				<div className="mb-2 flex justify-end">
					<SelectWithCombobox
						allValues={stacks}
						selectedValues={activeCategories}
						setSelectedValues={setSelectedCategories}
						label="Category"
						labelType="smol"
						variant="filter"
						portal
					/>
				</div>
			)}
			<div>
				{hasChartData ? (
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={dataset}
							charts={apiCharts}
							selectedCharts={selectedChartsSet}
							hallmarks={todayHallmarks}
							hideDataZoom
							valueSymbol=""
							onReady={handleChartReady}
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
