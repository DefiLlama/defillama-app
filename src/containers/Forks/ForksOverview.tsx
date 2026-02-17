import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { CHART_COLORS } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
import { useForksOverviewExtraSeries } from './queries.client'
import { getEnabledExtraApiKeys, getForkToOriginalTvlPercent } from './tvl'
import type { ForkOverviewPageData } from './types'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface IForksRow {
	name: string
	forkedProtocols: number
	tvl: number
	ftot: number | null
}

const forksColumn: ColumnDef<IForksRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const name = getValue<string>()
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={tokenIconUrl(name)} data-lgonly />
					<BasicLink
						href={`/forks/${slug(name)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{name}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Forked Protocols',
		accessorKey: 'forkedProtocols',
		meta: { align: 'end' }
	},
	{
		header: 'Forks TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => <>{formattedNum(getValue<number>(), true)}</>,
		meta: { align: 'end' }
	},
	{
		header: 'Forks TVL / Original TVL',
		accessorKey: 'ftot',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? `${formattedNum(value)}%` : null}</>
		},
		meta: { align: 'end' }
	}
]

const DEFAULT_SORTING_STATE = [{ id: 'tvl', desc: true }]

export const ForksOverview = ({
	forks,
	forkLinks,
	forkColors,
	tableData: baseTableData,
	chartData
}: ForkOverviewPageData) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const enabledExtraApiKeys = React.useMemo(() => getEnabledExtraApiKeys(extraTvlsEnabled), [extraTvlsEnabled])
	const { isFetchingExtraSeries, extraBreakdownByTimestamp } = useForksOverviewExtraSeries({
		enabledExtraApiKeys
	})

	const shouldApplyExtraSeries = enabledExtraApiKeys.length > 0 && !isFetchingExtraSeries

	const mergedChartData = React.useMemo(() => {
		if (!shouldApplyExtraSeries) return chartData

		const mergedRowsByTimestamp = new Map<number, Record<string, number>>()

		for (const row of chartData) {
			mergedRowsByTimestamp.set(row.timestamp, { ...row })
		}

		for (const [timestamp, extraRow] of extraBreakdownByTimestamp.entries()) {
			const mergedRow = mergedRowsByTimestamp.get(timestamp) ?? { timestamp }

			for (const key in extraRow) {
				const value = extraRow[key]
				if (!Number.isFinite(value)) continue
				mergedRow[key] = (mergedRow[key] ?? 0) + value
			}

			mergedRowsByTimestamp.set(timestamp, mergedRow)
		}

		return Array.from(mergedRowsByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp)
	}, [chartData, extraBreakdownByTimestamp, shouldApplyExtraSeries])

	const { tableData, tokenTvls, dominanceDataset, dominanceCharts, chartColors } = React.useMemo(() => {
		const latestData = mergedChartData.length > 0 ? mergedChartData[mergedChartData.length - 1] : null
		const chartForkKeys = new Set(forks)
		mergedChartData.forEach((entry) => {
			Object.keys(entry).forEach((key) => {
				if (key !== 'timestamp') chartForkKeys.add(key)
			})
		})
		const sortedChartForks = Array.from(chartForkKeys).sort(
			(a, b) => Number(latestData?.[b] ?? 0) - Number(latestData?.[a] ?? 0)
		)

		const tableDataByName = new Map(baseTableData.map((row) => [row.name, row]))
		const tableData = sortedChartForks.map((name) => {
			const baseRow = tableDataByName.get(name)
			const tvl = Number(latestData?.[name] ?? 0)
			const parentTvl = baseRow?.parentTvl ?? null

			return {
				name,
				forkedProtocols: baseRow?.forkedProtocols ?? 0,
				parentTvl,
				tvl,
				ftot: getForkToOriginalTvlPercent(tvl, parentTvl)
			}
		})

		const tvls = latestData
			? Object.entries(latestData)
					.filter(([key]) => key !== 'timestamp')
					.flatMap(([name, value]) => {
						return typeof value === 'number' && Number.isFinite(value) ? [{ name, value }] : []
					})
					.sort((a, b) => b.value - a.value)
			: []

		const tokenTvls = preparePieChartData({ data: tvls, limit: 5 })
		const chartColors: Record<string, string> = { ...forkColors }

		sortedChartForks.forEach((name, index) => {
			if (!chartColors[name]) {
				chartColors[name] = CHART_COLORS[index % CHART_COLORS.length]
			}
		})

		const dominanceDataset = {
			source: mergedChartData.map((entry) => {
				const row: Record<string, number> = { timestamp: entry.timestamp * 1000 }
				const valuesInRow = sortedChartForks
					.map((forkName) => {
						const value = entry[forkName]
						return typeof value === 'number' && Number.isFinite(value) && value > 0 ? [forkName, value] : null
					})
					.filter((item): item is [string, number] => item != null)

				const totalTvl = valuesInRow.reduce((sum, [, value]) => sum + value, 0)
				if (totalTvl <= 0) return row

				valuesInRow.forEach(([forkName, value]) => {
					row[forkName] = (value / totalTvl) * 100
				})

				return row
			}),
			dimensions: ['timestamp', ...sortedChartForks]
		}

		const dominanceCharts = sortedChartForks.map((name, index) => ({
			type: 'line' as const,
			name,
			encode: { x: 'timestamp', y: name },
			color: chartColors[name] ?? CHART_COLORS[index % CHART_COLORS.length],
			stack: 'dominance'
		}))

		return { tableData, tokenTvls, dominanceDataset, dominanceCharts, chartColors }
	}, [baseTableData, forkColors, forks, mergedChartData])

	const isLoading = enabledExtraApiKeys.length > 0 && isFetchingExtraSeries
	return (
		<>
			<RowLinksWithDropdown links={forkLinks} activeLink="All" />
			{isLoading ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<p className="flex items-center gap-1">
						Loading
						<LoadingDots />
					</p>
				</div>
			) : (
				<>
					<div className="flex flex-col gap-2 xl:flex-row">
						<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<PieChart
									chartData={tokenTvls}
									stackColors={chartColors}
									exportButtons={{ png: true, csv: true, filename: 'forks-tvl-pie', pngTitle: 'Forks TVL Breakdown' }}
									title="Forks TVL Breakdown"
								/>
							</React.Suspense>
						</div>
						<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2
									dataset={dominanceDataset}
									charts={dominanceCharts}
									stacked={true}
									expandTo100Percent={true}
									hideDefaultLegend
									valueSymbol="%"
									exportButtons={{
										png: true,
										csv: true,
										filename: 'forks-dominance-chart',
										pngTitle: 'Forks TVL Dominance (%)'
									}}
									title="Forks TVL Dominance (%)"
								/>
							</React.Suspense>
						</div>
					</div>
					<React.Suspense
						fallback={
							<div
								style={{ minHeight: `${tableData.length * 50 + 200}px` }}
								className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
							/>
						}
					>
						<TableWithSearch
							data={tableData}
							columns={forksColumn}
							placeholder="Search protocols..."
							columnToSearch="name"
							header="Protocol Rankings"
							sortingState={DEFAULT_SORTING_STATE}
						/>
					</React.Suspense>
				</>
			)}
		</>
	)
}
