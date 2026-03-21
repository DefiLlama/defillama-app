import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { ensureChronologicalRows, getBucketTimestampMs } from '~/components/ECharts/utils'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type { IDATOverviewPageProps } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const DEFAULT_SORTING_STATE = [{ id: 'totalUsdValue', desc: true }]

const normalizeChartGroup = (value: string | null | undefined): LowercaseDwmcGrouping | null => {
	const normalizedValue = value?.toLowerCase() ?? null
	if (DWMC_GROUPING_OPTIONS_LOWERCASE.some((option) => option.value === normalizedValue)) {
		return normalizedValue as LowercaseDwmcGrouping
	}
	return null
}

export function DATOverview({ allAssets, institutions, dailyFlowsByAsset }: IDATOverviewPageProps) {
	const router = useRouter()
	const groupBy = normalizeChartGroup(readSingleQueryValue(router.query.groupBy)) ?? 'weekly'

	const { chartData } = useMemo(() => {
		const assetKeys: string[] = []
		for (const asset in dailyFlowsByAsset) {
			assetKeys.push(asset)
		}
		const rowMap = new Map<number, Record<string, number | null>>()
		const isCumulative = groupBy === 'cumulative'

		if (groupBy !== 'daily' && !isCumulative) {
			for (const asset of assetKeys) {
				const sumByDate: Record<number, { purchasePrice: number; assetQuantity: number }> = {}
				for (const [date, purchasePrice, assetQuantity] of dailyFlowsByAsset[asset].data) {
					if (date == null) continue
					const dateKey = getBucketTimestampMs(date, groupBy)
					sumByDate[dateKey] = sumByDate[dateKey] ?? { purchasePrice: 0, assetQuantity: 0 }
					sumByDate[dateKey].purchasePrice += purchasePrice ?? 0
					sumByDate[dateKey].assetQuantity += assetQuantity ?? 0
				}
				for (const dateStr in sumByDate) {
					const dateNum = +dateStr
					const row = rowMap.get(dateNum) ?? { timestamp: dateNum }
					row[dailyFlowsByAsset[asset].name] = sumByDate[dateNum].purchasePrice
					rowMap.set(dateNum, row)
				}
			}
		} else {
			for (const asset of assetKeys) {
				for (const [date, purchasePrice] of dailyFlowsByAsset[asset].data) {
					if (date == null) continue
					const row = rowMap.get(date) ?? { timestamp: date }
					row[dailyFlowsByAsset[asset].name] = purchasePrice
					rowMap.set(date, row)
				}
			}
		}

		const source = ensureChronologicalRows(Array.from(rowMap.values()))
		const seriesNames = assetKeys.map((a) => dailyFlowsByAsset[a].name)
		const dimensions = ['timestamp', ...seriesNames]
		const cumulativeSource = isCumulative
			? (() => {
					const runningTotals: Record<string, number> = {}
					for (const name of seriesNames) {
						runningTotals[name] = 0
					}

					return source.map((row) => {
						const nextRow: Record<string, number> = { timestamp: Number(row.timestamp) }
						for (const name of seriesNames) {
							const rawValue = row[name]
							const value = typeof rawValue === 'number' ? rawValue : 0
							runningTotals[name] += value
							nextRow[name] = runningTotals[name]
						}
						return nextRow
					})
				})()
			: source
		const chartType: 'line' | 'bar' = isCumulative ? 'line' : 'bar'
		const charts = assetKeys.map((asset) => ({
			type: chartType,
			name: dailyFlowsByAsset[asset].name,
			encode: { x: 'timestamp', y: dailyFlowsByAsset[asset].name },
			...(isCumulative ? {} : { stack: dailyFlowsByAsset[asset].stack }),
			color: dailyFlowsByAsset[asset].color
		}))

		return {
			chartData: { dataset: { source: cumulativeSource, dimensions }, charts }
		}
	}, [dailyFlowsByAsset, groupBy])
	const deferredChartData = useDeferredValue(chartData)

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const onChangeGroupBy = (nextGroupBy: LowercaseDwmcGrouping) => {
		void pushShallowQuery(router, { groupBy: nextGroupBy === 'weekly' ? undefined : nextGroupBy })
	}

	return (
		<>
			<RowLinksWithDropdown links={allAssets} activeLink={'All'} />
			<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-between gap-2 p-2 pb-0">
					<h1 className="text-lg font-semibold">DAT Inflows by Asset</h1>
					<ChartGroupingSelector
						value={groupBy}
						onValueChange={onChangeGroupBy}
						options={DWMC_GROUPING_OPTIONS_LOWERCASE}
						className="ml-auto"
					/>
					<ChartExportButtons
						chartInstance={chartInstance}
						filename="digital-asset-treasuries-inflows-by-asset"
						title="DAT Inflows by Asset"
					/>
				</div>
				<Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={deferredChartData.dataset}
						charts={deferredChartData.charts}
						groupBy={groupBy}
						valueSymbol="$"
						showTotalInTooltip
						onReady={handleChartReady}
					/>
				</Suspense>
			</div>
			<TableWithSearch
				data={institutions}
				columns={overviewColumns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={DEFAULT_SORTING_STATE}
				csvFileName="digital-asset-treasuries"
			/>
		</>
	)
}

// ── Table columns ───────────────────────────────────────────────────────

const columnHelper = createColumnHelper<IDATOverviewPageProps['institutions'][0]>()

const overviewColumns = [
	columnHelper.accessor('name', {
		header: 'Institution',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/digital-asset-treasury/${slug(row.original.ticker)}`}
						title={name}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		size: 228,
		meta: {
			align: 'start'
		}
	}),
	columnHelper.accessor(
		(row) => row.holdings.map((asset) => `${asset.name} (${(Number(asset.dominance) || 0).toFixed(2)}%)`).join(', '),
		{
			id: 'holdings',
			header: 'Assets',
			enableSorting: false,
			cell: (info) => {
				const assetBreakdown = info.row.original.holdings

				return (
					<Tooltip
						content={<AssetTooltipContent assetBreakdown={assetBreakdown} protocolName={info.row.original.name} />}
						render={<button />}
						className="ml-auto flex h-5 w-full! flex-nowrap items-center bg-white"
					>
						{assetBreakdown.map((asset) => {
							return (
								<div
									key={asset.name + asset.dominance + info.row.original.name}
									style={{ width: `${asset.dominance}%`, background: asset.color }}
									className="h-5"
								/>
							)
						})}
					</Tooltip>
				)
			},
			size: 120,
			meta: {
				align: 'end'
			}
		}
	),
	columnHelper.accessor('totalCost', {
		header: 'Cost Basis',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('totalUsdValue', {
		header: "Today's Holdings Value",
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 196,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('price', {
		header: 'Stock Price',
		cell: ({ getValue, row }) => {
			const price = getValue()
			if (price == null) return null
			const priceChange24h = row.original.priceChange24h
			if (priceChange24h == null) return <>{formattedNum(price, true)}</>
			return (
				<Tooltip
					content={
						<>
							24h change:{' '}
							<span
								className={priceChange24h > 0 ? 'text-(--success)' : priceChange24h < 0 ? 'text-(--error)' : ''}
							>{`${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`}</span>
						</>
					}
					className="justify-end underline decoration-dotted"
				>
					{formattedNum(price, true)}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('realized_mNAV', {
		header: 'Realized mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value based only on the current outstanding common shares, with no dilution considered.'
		}
	}),
	columnHelper.accessor('realistic_mNAV', {
		header: 'Realistic mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised'
		}
	}),
	columnHelper.accessor('max_mNAV', {
		header: 'Max mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)'
		}
	})
]

// ── Tooltip helpers ─────────────────────────────────────────────────────

interface BreakdownData {
	name: string
	amount?: number | null
	ticker?: string
	cost?: number | null
	usdValue?: number | null
	avgPrice?: number | null
	dominance: number
	color: string
}

function Breakdown({ data }: { data: BreakdownData }) {
	const name = `${data.name} (${data.dominance}%)`

	return (
		<span className="flex flex-col gap-1 border-l-3 pl-1 text-xs" style={{ borderColor: data.color }}>
			<span>{name}</span>
			{data.amount != null ? <span>{`Amount: ${formattedNum(data.amount, false)} ${data.ticker}`}</span> : null}
			{data.usdValue != null ? <span>{`Today's Value: ${formattedNum(data.usdValue, true)}`}</span> : null}
			{data.cost != null ? <span>{`Cost Basis: ${formattedNum(data.cost, true)}`}</span> : null}
			{data.avgPrice != null ? <span>{`Average Purchase Price: ${formattedNum(data.avgPrice, true)}`}</span> : null}
		</span>
	)
}

function AssetTooltipContent({
	assetBreakdown,
	protocolName
}: {
	assetBreakdown: BreakdownData[]
	protocolName: string
}) {
	return (
		<span className="flex flex-col gap-4">
			{assetBreakdown.map((breakdown) => (
				<Breakdown data={breakdown} key={breakdown.name + breakdown.usdValue + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
