import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import {
	ChartGroupingSelector,
	DWMC_GROUPING_OPTIONS_LOWERCASE,
	type LowercaseDwmcGrouping
} from '~/components/ECharts/ChartGroupingSelector'
import { buildTimeSeriesChart } from '~/components/ECharts/timeSeriesChartBuilder'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type { IDATOverviewFlowSeries, IDATOverviewPageProps } from './types'

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
		if (groupBy === 'cumulative') {
			const series: Array<{ name: string; color: string; points: IDATOverviewFlowSeries['points'] }> = []
			for (const name in dailyFlowsByAsset) {
				const item = dailyFlowsByAsset[name]
				series.push({ name: item.name, color: item.color, points: item.points })
			}
			return {
				chartData: buildTimeSeriesChart({ kind: 'cumulativeLines', series })
			}
		}

		const series: IDATOverviewFlowSeries[] = []
		for (const name in dailyFlowsByAsset) {
			series.push(dailyFlowsByAsset[name])
		}
		return {
			chartData: buildTimeSeriesChart({ kind: 'periodBars', groupBy, series })
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
		meta: {
			headerClassName: 'w-[min(228px,40vw)]',
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
			meta: {
				headerClassName: 'w-[120px]',
				align: 'end'
			}
		}
	),
	columnHelper.accessor('totalCost', {
		header: 'Cost Basis',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('totalUsdValue', {
		header: "Today's Holdings Value",
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[min(196px,40vw)]',
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
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('realized_mNAV', {
		header: 'Realized mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText:
				'Market Net Asset Value based only on the current outstanding common shares, with no dilution considered.'
		}
	}),
	columnHelper.accessor('realistic_mNAV', {
		header: 'Realistic mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText:
				'Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised'
		}
	}),
	columnHelper.accessor('max_mNAV', {
		header: 'Max mNAV',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		meta: {
			headerClassName: 'w-[120px]',
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
